import { httpAction } from "./_generated/server";

/**
 * MSAL to Graph API Proxy
 * Accepts Microsoft access tokens from MSAL and proxies requests to Graph API
 * Supports multi-tenant authentication (any Azure AD organization)
 */

// CORS headers for all responses
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Health check endpoint
 */
export const health = httpAction(async () => {
  return new Response(JSON.stringify({ 
    status: 'healthy',
    service: 'MSAL Graph Proxy',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'application/json',
    },
  });
});

/**
 * OPTIONS handler for CORS preflight
 */
export const graphOptions = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
});

/**
 * Proxy GET requests to Microsoft Graph API
 */
export const graphGet = httpAction(async (ctx, request) => {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization token provided');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Please sign in with your Microsoft account'
      }), {
        status: 401,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Extract the path after /clerk-proxy/graph
    const url = new URL(request.url);
    const graphPath = url.pathname.replace('/clerk-proxy/graph', '') || '/me';
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    
    console.log(`📡 Proxying GET request to: ${graphUrl}`);

    // Make request to Microsoft Graph
    const graphResponse = await fetch(graphUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'ConsistencyLevel': 'eventual', // For advanced queries
      },
    });

    const responseText = await graphResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { value: responseText };
    }

    if (!graphResponse.ok) {
      console.error(`❌ Graph API error (${graphResponse.status}):`, responseData);
      return new Response(JSON.stringify({
        error: 'Graph API Error',
        message: responseData.error?.message || 'Failed to fetch from Microsoft Graph',
        details: responseData
      }), {
        status: graphResponse.status,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`✅ Graph API request successful`);
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  }
});

/**
 * Proxy POST requests to Microsoft Graph API
 */
export const graphPost = httpAction(async (ctx, request) => {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization token provided');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Please sign in with your Microsoft account'
      }), {
        status: 401,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    const accessToken = authHeader.substring(7);
    
    // Extract the path after /clerk-proxy/graph
    const url = new URL(request.url);
    const graphPath = url.pathname.replace('/clerk-proxy/graph', '') || '/me';
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    
    // Get request body
    const bodyText = await request.text();
    
    console.log(`📡 Proxying POST request to: ${graphUrl}`);

    // Make request to Microsoft Graph
    const graphResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: bodyText,
    });

    const responseText = await graphResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { value: responseText };
    }

    if (!graphResponse.ok) {
      console.error(`❌ Graph API error (${graphResponse.status}):`, responseData);
      return new Response(JSON.stringify({
        error: 'Graph API Error',
        message: responseData.error?.message || 'Failed to post to Microsoft Graph',
        details: responseData
      }), {
        status: graphResponse.status,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`✅ Graph API POST successful`);
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  }
});

/**
 * Proxy PATCH requests to Microsoft Graph API
 */
export const graphPatch = httpAction(async (ctx, request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization token provided');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Please sign in with your Microsoft account'
      }), {
        status: 401,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    const accessToken = authHeader.substring(7);
    const url = new URL(request.url);
    const graphPath = url.pathname.replace('/clerk-proxy/graph', '') || '/me';
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    const bodyText = await request.text();
    
    console.log(`📡 Proxying PATCH request to: ${graphUrl}`);

    const graphResponse = await fetch(graphUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: bodyText,
    });

    const responseText = await graphResponse.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { value: responseText };
    }

    if (!graphResponse.ok) {
      console.error(`❌ Graph API error (${graphResponse.status}):`, responseData);
      return new Response(JSON.stringify({
        error: 'Graph API Error',
        message: responseData.error?.message || 'Failed to update Microsoft Graph',
        details: responseData
      }), {
        status: graphResponse.status,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`✅ Graph API PATCH successful`);
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  }
});

/**
 * Proxy DELETE requests to Microsoft Graph API
 */
export const graphDelete = httpAction(async (ctx, request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization token provided');
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Please sign in with your Microsoft account'
      }), {
        status: 401,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    const accessToken = authHeader.substring(7);
    const url = new URL(request.url);
    const graphPath = url.pathname.replace('/clerk-proxy/graph', '') || '/me';
    const graphUrl = `https://graph.microsoft.com/v1.0${graphPath}${url.search}`;
    
    console.log(`📡 Proxying DELETE request to: ${graphUrl}`);

    const graphResponse = await fetch(graphUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await graphResponse.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = {};
    }

    if (!graphResponse.ok) {
      console.error(`❌ Graph API error (${graphResponse.status}):`, responseData);
      return new Response(JSON.stringify({
        error: 'Graph API Error',
        message: responseData.error?.message || 'Failed to delete from Microsoft Graph',
        details: responseData
      }), {
        status: graphResponse.status,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`✅ Graph API DELETE successful`);
    return new Response(JSON.stringify(responseData), {
      status: 204,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('❌ Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  }
});
