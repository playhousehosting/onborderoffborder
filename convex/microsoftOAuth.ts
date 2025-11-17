import { httpAction } from "./_generated/server";

/**
 * Microsoft OAuth 2.0 Flow for Multi-Tenant Graph API Access
 * 
 * This module handles the OAuth flow to obtain delegated access tokens
 * from Microsoft for users across any Azure AD tenant.
 */

// CORS headers
const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
});

/**
 * Initiate OAuth Flow
 * Generates Microsoft OAuth URL for user to authorize
 */
export const initiateOAuth = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const clerkUserId = url.searchParams.get('userId');
  const authHeader = request.headers.get('Authorization');
  const clerkToken = authHeader?.replace('Bearer ', '');

  console.log('🚀 Initiating Microsoft OAuth flow for user:', clerkUserId);

  if (!clerkUserId || !clerkToken) {
    return new Response(JSON.stringify({ error: "Missing userId or authorization" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders() }
    });
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = `${url.origin}/clerk-proxy/oauth/callback`;

  if (!clientId) {
    console.error('❌ AZURE_CLIENT_ID not configured');
    return new Response(JSON.stringify({ error: "OAuth not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders() }
    });
  }

  // Generate state parameter (includes Clerk user ID for callback)
  const state = Buffer.from(JSON.stringify({
    userId: clerkUserId,
    timestamp: Date.now()
  })).toString('base64');

  // Microsoft OAuth URL with multi-tenant endpoint
  const scopes = [
    'https://graph.microsoft.com/User.Read',
    'https://graph.microsoft.com/User.ReadWrite.All',
    'https://graph.microsoft.com/Directory.Read.All',
    'https://graph.microsoft.com/Directory.ReadWrite.All',
    'https://graph.microsoft.com/Group.Read.All',
    'https://graph.microsoft.com/DeviceManagementManagedDevices.ReadWrite.All',
    'offline_access' // Required for refresh token
  ].join(' ');

  const authUrl = new URL('https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'consent'); // Force consent screen to ensure all scopes granted

  console.log('✅ Generated OAuth URL:', authUrl.toString());

  return new Response(JSON.stringify({ 
    authUrl: authUrl.toString(),
    state 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...getCorsHeaders() }
  });
});

/**
 * OAuth Callback Handler
 * Exchanges authorization code for access token and stores in Clerk user metadata
 */
export const oauthCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  console.log('📥 OAuth callback received');

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription);
    
    // Redirect to dashboard with error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/dashboard?oauth_error=${encodeURIComponent(error)}&oauth_error_description=${encodeURIComponent(errorDescription || '')}`
      }
    });
  }

  if (!code || !state) {
    console.error('❌ Missing code or state parameter');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard?oauth_error=invalid_request'
      }
    });
  }

  // Decode state to get user ID
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (e) {
    console.error('❌ Invalid state parameter:', e);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard?oauth_error=invalid_state'
      }
    });
  }

  const { userId } = stateData;
  console.log('👤 Processing OAuth callback for user:', userId);

  // Exchange authorization code for access token
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/clerk-proxy/oauth/callback`;

  if (!clientId || !clientSecret) {
    console.error('❌ Azure credentials not configured');
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard?oauth_error=server_configuration'
      }
    });
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://login.microsoftonline.com/organizations/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', errorData);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `/dashboard?oauth_error=token_exchange_failed&details=${encodeURIComponent(errorData.error_description || '')}`
        }
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    console.log('🎫 Successfully obtained OAuth tokens');

    // Store tokens in Clerk user's public_metadata
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('❌ CLERK_SECRET_KEY not configured');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/dashboard?oauth_error=clerk_not_configured'
        }
      });
    }

    const updateResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_metadata: {
          microsoft_access_token: access_token,
          microsoft_refresh_token: refresh_token,
          microsoft_token_expires_at: Date.now() + (expires_in * 1000)
        }
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ Failed to update Clerk user metadata:', errorData);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/dashboard?oauth_error=metadata_update_failed'
        }
      });
    }

    console.log('✅ Successfully stored OAuth tokens in Clerk metadata');

    // Redirect back to dashboard with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard?oauth_success=true'
      }
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/dashboard?oauth_error=unknown&details=${encodeURIComponent(String(error))}`
      }
    });
  }
});

/**
 * OPTIONS handler for CORS preflight
 */
export const oauthOptions = httpAction(async (ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders()
  });
});
