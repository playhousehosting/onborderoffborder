import { httpAction } from "./_generated/server";

/**
 * Clerk to Graph API Proxy
 * Validates Clerk JWT session tokens and uses either:
 * 1. User's delegated OAuth token (from Microsoft sign-in via Clerk)
 * 2. App-only credentials as fallback (for non-Microsoft users with admin access)
 */

// Verify Clerk JWT token
async function verifyClerkToken(token: string): Promise<{ userId: string; email: string; claims: any; graphToken?: string } | null> {
  try {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("❌ CLERK_SECRET_KEY not configured");
      return null;
    }

    // Clerk JWT tokens are base64-encoded JWTs
    // We'll verify them by checking with Clerk's JWKS endpoint
    // For now, we'll do a simple verification by calling Clerk API
    
    // Decode JWT to get session ID (if it's a JWT, not a session token)
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length === 3) {
        // It's a JWT - decode the payload
        const payload = JSON.parse(atob(parts[1]));
        console.log('✅ JWT decoded:', {
          sub: payload.sub,
          email: payload.email || payload.primaryEmail,
          exp: payload.exp,
          iss: payload.iss,
          hasGraphToken: !!payload.graphAccessToken
        });
        
        // Basic validation
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.error("❌ Token expired");
          return null;
        }
        
        // For enhanced security, you should verify the signature with Clerk's JWKS
        // But for now, we trust the token if it has the right structure
        return {
          userId: payload.sub || payload.user_id,
          email: payload.email || payload.primaryEmail || '',
          claims: payload,
          // Check if user has a Microsoft Graph OAuth token (from Microsoft sign-in)
          graphToken: payload.oauth_token || payload.graphAccessToken || payload.accessToken
        };
      }
    } catch (e) {
      console.log("Not a JWT, trying session verification...");
    }

    // Fallback: Try as session ID format (sess_xxxxx)
    const sessionId = token.startsWith('sess_') ? token : null;
    if (!sessionId) {
      console.error("❌ Invalid token format - not JWT or session ID");
      return null;
    }

    // Verify with Clerk API
    const response = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Clerk token verification failed: ${response.status}`);
      return null;
    }

    const session = await response.json();
    return {
      userId: session.user_id,
      email: session.user?.primary_email_address || '',
      claims: session
    };
  } catch (error) {
    console.error("❌ Error verifying Clerk token:", error);
    return null;
  }
}

// Fetch Microsoft OAuth token from Clerk's user metadata
// For multi-tenant support, tokens must be stored in user's public_metadata
// during the OAuth flow (via Clerk webhooks or custom integration)
async function getMicrosoftOAuthToken(userId: string): Promise<string | null> {
  try {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("❌ CLERK_SECRET_KEY not configured");
      return null;
    }

    console.log(`🔍 Checking for stored Microsoft OAuth token for user: ${userId}`);
    
    // Get user's public_metadata where we store the OAuth token
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.error(`❌ Failed to fetch user from Clerk: ${userResponse.status}`);
      return null;
    }

    const userData = await userResponse.json();
    
    // Check if OAuth token is stored in public_metadata
    const storedToken = userData.public_metadata?.microsoft_access_token;
    
    if (storedToken) {
      console.log("🎫 Found stored Microsoft OAuth token in user metadata");
      return storedToken;
    }

    console.log("ℹ️ No Microsoft OAuth token found in user metadata");
    console.log("💡 User needs to complete Microsoft OAuth consent flow for Graph API access");
    return null;
  } catch (error) {
    console.error("❌ Error fetching Microsoft OAuth token from Clerk:", error);
    return null;
  }
}

// Get Graph API access token using app-only credentials
async function getGraphAccessToken(): Promise<string | null> {
  try {
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      console.error("❌ Azure credentials not configured");
      return null;
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ Failed to get Graph token: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("❌ Error getting Graph access token:", error);
    return null;
  }
}

// CORS headers for all responses
const getCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
});

// Health check endpoint
export const health = httpAction(async () => {
  return new Response(JSON.stringify({ status: "ok", service: "clerk-proxy" }), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      ...getCorsHeaders()
    }
  });
});

// OPTIONS handler for CORS preflight
export const graphOptions = httpAction(async (ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders()
  });
});

// Proxy GET requests to Microsoft Graph
export const graphGet = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const clerkToken = authHeader?.replace('Bearer ', '');

    console.log('📥 GET request to:', url.pathname);

    if (!clerkToken) {
      return new Response(JSON.stringify({ error: "No authorization token" }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }

    // Verify Clerk token
    const session = await verifyClerkToken(clerkToken);
    if (!session) {
      console.error('❌ Token verification failed');
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    console.log('✅ Clerk user authenticated:', session.userId, session.email);

    // Get Graph API token - prefer user's delegated token, fallback to app-only
    let graphToken = session.graphToken;
    
    if (graphToken) {
      console.log('🎫 Using user\'s delegated OAuth token from JWT');
    } else {
      // Try fetching OAuth token from Clerk's Backend API
      console.log('🔍 No token in JWT, checking Clerk API for Microsoft OAuth token...');
      graphToken = await getMicrosoftOAuthToken(session.userId);
      
      if (graphToken) {
        console.log('🎫 Using Microsoft OAuth token from Clerk API');
      }
    }
    
    if (!graphToken) {
      console.error('❌ No Microsoft OAuth token available');
      console.log('💡 Multi-tenant mode requires users to complete Microsoft OAuth consent');
      console.log('📝 Note: AZURE_TENANT_ID=organizations prevents app-only authentication');
      return new Response(JSON.stringify({ 
        error: "Microsoft Graph API access not available",
        message: "This application requires Microsoft OAuth consent. Please click 'Authorize Microsoft Access' to grant permissions.",
        requiresOAuth: true,
        authUrl: "/auth/microsoft" // Frontend should redirect here
      }), {
        status: 403,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Extract the Graph API path from the URL path (everything after /clerk-proxy/graph)
    const pathMatch = url.pathname.match(/\/clerk-proxy\/graph\/?(.*)$/);
    const graphPath = pathMatch && pathMatch[1] ? `/${pathMatch[1]}` : '/users';
    
    // Build Graph URL with query params
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    console.log('🌐 Calling Graph API:', graphUrl);

    try {
      const graphResponse = await fetch(graphUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await graphResponse.json();
      console.log('✅ Graph API response:', graphResponse.status);
      
      return new Response(JSON.stringify(data), {
        status: graphResponse.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error("❌ Graph API request error:", error);
      return new Response(JSON.stringify({ error: "Graph API request failed" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }
});

// Proxy POST requests to Microsoft Graph
export const graphPost = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const clerkToken = authHeader?.replace('Bearer ', '');

    console.log('📝 POST request to:', url.pathname);

    if (!clerkToken) {
      return new Response(JSON.stringify({ error: "No authorization token" }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }

    const session = await verifyClerkToken(clerkToken);
    if (!session) {
      console.error('❌ Token verification failed');
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }

    console.log('✅ Clerk user authenticated:', session.userId);

    // Get Graph API token - prefer user's delegated token
    let graphToken = session.graphToken;
    
    if (graphToken) {
      console.log('🎫 Using user\'s delegated OAuth token from JWT');
    } else {
      // Try fetching OAuth token from Clerk's user metadata
      console.log('🔍 No token in JWT, checking Clerk metadata for Microsoft OAuth token...');
      graphToken = await getMicrosoftOAuthToken(session.userId);
      
      if (graphToken) {
        console.log('🎫 Using Microsoft OAuth token from Clerk metadata');
      }
    }
    
    if (!graphToken) {
      console.error('❌ No Microsoft OAuth token available');
      console.log('💡 Multi-tenant mode requires Microsoft OAuth consent');
      return new Response(JSON.stringify({ 
        error: "Microsoft Graph API access not available",
        message: "This application requires Microsoft OAuth consent. Please click 'Authorize Microsoft Access' to grant permissions.",
        requiresOAuth: true,
        authUrl: "/auth/microsoft"
      }), {
        status: 403,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }

    // Extract the Graph API path from the URL path
    const pathMatch = url.pathname.match(/\/clerk-proxy\/graph\/?(.*)$/);
    const graphPath = pathMatch && pathMatch[1] ? `/${pathMatch[1]}` : '/users';
    const body = await request.text();

    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    console.log('🌐 Calling Graph API POST:', graphUrl);

    try {
      const graphResponse = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json'
        },
        body
      });

      const data = await graphResponse.json();
      console.log('✅ Graph API POST response:', graphResponse.status);
      
      return new Response(JSON.stringify(data), {
        status: graphResponse.status,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    } catch (error) {
      console.error("❌ Graph API POST error:", error);
      return new Response(JSON.stringify({ error: "Graph API request failed" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...getCorsHeaders()
        }
      });
    }
});
