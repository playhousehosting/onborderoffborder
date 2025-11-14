const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Clerk Token to Graph API Proxy
 * This middleware validates Clerk session tokens and proxies requests to Microsoft Graph API
 * using a service account (app-only credentials)
 */

// Middleware to verify Clerk token
const verifyClerkToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const clerkToken = authHeader.substring(7);
    
    // Verify token with Clerk
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('❌ CLERK_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Clerk not configured' });
    }

    // Verify the Clerk JWT token
    const response = await axios.get('https://api.clerk.com/v1/sessions/verify', {
      headers: {
        'Authorization': `Bearer ${clerkToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      return res.status(401).json({ error: 'Invalid Clerk token' });
    }

    req.clerkSession = response.data;
    next();
  } catch (error) {
    console.error('❌ Clerk token verification failed:', error.message);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

// Get Graph API access token using client credentials
const getGraphAccessToken = async () => {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Azure AD credentials not configured. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID');
  }

  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get Graph API token:', error.response?.data || error.message);
    throw new Error('Failed to acquire Graph API access token');
  }
};

/**
 * Proxy GET requests to Microsoft Graph API
 * Example: GET /api/clerk-proxy/graph/users
 */
router.get('/graph/*', verifyClerkToken, async (req, res) => {
  try {
    const graphPath = req.params[0]; // Everything after /graph/
    const queryString = req.originalUrl.split('?')[1] || '';
    const graphUrl = `https://graph.microsoft.com/v1.0/${graphPath}${queryString ? '?' + queryString : ''}`;

    console.log(`📊 Clerk user ${req.clerkSession.user_id} requesting: ${graphPath}`);

    // Get Graph API token using app credentials
    const accessToken = await getGraphAccessToken();

    // Make request to Graph API
    const response = await axios.get(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Graph API proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: error.message }
    });
  }
});

/**
 * Proxy POST requests to Microsoft Graph API
 * Example: POST /api/clerk-proxy/graph/users
 */
router.post('/graph/*', verifyClerkToken, async (req, res) => {
  try {
    const graphPath = req.params[0];
    const graphUrl = `https://graph.microsoft.com/v1.0/${graphPath}`;

    console.log(`📊 Clerk user ${req.clerkSession.user_id} posting to: ${graphPath}`);

    const accessToken = await getGraphAccessToken();

    const response = await axios.post(graphUrl, req.body, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Graph API proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: error.message }
    });
  }
});

/**
 * Proxy PATCH requests to Microsoft Graph API
 * Example: PATCH /api/clerk-proxy/graph/users/{id}
 */
router.patch('/graph/*', verifyClerkToken, async (req, res) => {
  try {
    const graphPath = req.params[0];
    const graphUrl = `https://graph.microsoft.com/v1.0/${graphPath}`;

    console.log(`📊 Clerk user ${req.clerkSession.user_id} patching: ${graphPath}`);

    const accessToken = await getGraphAccessToken();

    const response = await axios.patch(graphUrl, req.body, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(response.status).json(response.data || {});
  } catch (error) {
    console.error('❌ Graph API proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: error.message }
    });
  }
});

/**
 * Proxy DELETE requests to Microsoft Graph API
 * Example: DELETE /api/clerk-proxy/graph/users/{id}
 */
router.delete('/graph/*', verifyClerkToken, async (req, res) => {
  try {
    const graphPath = req.params[0];
    const graphUrl = `https://graph.microsoft.com/v1.0/${graphPath}`;

    console.log(`📊 Clerk user ${req.clerkSession.user_id} deleting: ${graphPath}`);

    const accessToken = await getGraphAccessToken();

    const response = await axios.delete(graphUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(response.status).json(response.data || {});
  } catch (error) {
    console.error('❌ Graph API proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: error.message }
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const configured = !!(
    process.env.CLERK_SECRET_KEY &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.AZURE_TENANT_ID
  );

  res.json({
    status: 'ok',
    configured,
    message: configured 
      ? 'Clerk proxy is configured and ready' 
      : 'Missing configuration: Set CLERK_SECRET_KEY, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID'
  });
});

module.exports = router;
