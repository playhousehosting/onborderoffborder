import { httpAction } from "./_generated/server";

/**
 * Clerk to Graph API Proxy
 * Validates Clerk session tokens and uses app-only credentials to call Microsoft Graph
 */

// Verify Clerk token
async function verifyClerkToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("❌ CLERK_SECRET_KEY not configured");
      return null;
    }

    // Extract session ID from token (format: sess_xxxxx)
    const sessionId = token.startsWith('sess_') ? token : null;
    if (!sessionId) {
      console.error("❌ Invalid Clerk token format");
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
      sessionId: session.id
    };
  } catch (error) {
    console.error("❌ Error verifying Clerk token:", error);
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

// Health check endpoint
export const health = httpAction(async () => {
  return new Response(JSON.stringify({ status: "ok", service: "clerk-proxy" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});

// Proxy GET requests to Microsoft Graph
export const graphGet = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const clerkToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!clerkToken) {
      return new Response(JSON.stringify({ error: "No authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify Clerk token
    const session = await verifyClerkToken(clerkToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get Graph API token
    const graphToken = await getGraphAccessToken();
    if (!graphToken) {
      return new Response(JSON.stringify({ error: "Failed to acquire Graph API token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Extract the Graph API path from query params
    const graphPath = url.searchParams.get('path') || '/users';
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;

    try {
      const graphResponse = await fetch(graphUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await graphResponse.json();
      return new Response(JSON.stringify(data), {
        status: graphResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("❌ Graph API request error:", error);
      return new Response(JSON.stringify({ error: "Graph API request failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
});

// Proxy POST requests to Microsoft Graph
export const graphPost = httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const clerkToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!clerkToken) {
      return new Response(JSON.stringify({ error: "No authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const session = await verifyClerkToken(clerkToken);
    if (!session) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const graphToken = await getGraphAccessToken();
    if (!graphToken) {
      return new Response(JSON.stringify({ error: "Failed to acquire Graph API token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const graphPath = url.searchParams.get('path') || '/users';
    const body = await request.text();

    try {
      const graphResponse = await fetch(`https://graph.microsoft.com/v1.0${graphPath}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json'
        },
        body
      });

      const data = await graphResponse.json();
      return new Response(JSON.stringify(data), {
        status: graphResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("❌ Graph API POST error:", error);
      return new Response(JSON.stringify({ error: "Graph API request failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
});
