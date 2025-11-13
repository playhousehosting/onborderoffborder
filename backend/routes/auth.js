const express = require('express');
const router = express.Router();
const axios = require('axios');
const { encryptCredentials } = require('../utils/encryption');
const { validateCredentials, createMsalInstance, getAuthorizationUrl, acquireTokenByCode } = require('../services/authService');

/**
 * POST /api/auth/configure
 * Save Azure AD credentials to user's session (encrypted)
 */
router.post('/configure', async (req, res) => {
    try {
      const { clientId, tenantId, clientSecret } = req.body;
      
      // Manual validation
      const errors = [];
      if (!clientId || clientId.trim() === '') {
        errors.push({ field: 'clientId', message: 'Client ID is required' });
      }
      if (!tenantId || tenantId.trim() === '') {
        errors.push({ field: 'tenantId', message: 'Tenant ID is required' });
      }
      
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
      
      // Encrypt credentials before storing in session
      const encryptedCredentials = encryptCredentials({
        clientId,
        tenantId,
        clientSecret: clientSecret || null
      });
      
      // Store in session (server-side only)
      req.session.credentials = encryptedCredentials;
      req.session.configured = true;
      
      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        
        res.json({
          success: true,
          message: 'Credentials saved securely',
          hasSecret: !!clientSecret
        });
      });
    } catch (error) {
      console.error('Configure error:', error);
      res.status(500).json({ error: 'Failed to save credentials' });
    }
  }
);

/**
 * POST /api/auth/app-only-token
 * Get app-only access token (called by frontend)
 * This avoids CORS issues by routing token request through backend
 */
router.post('/app-only-token', async (req, res) => {
  try {
    const { clientId, clientSecret, tenantId } = req.body;

    console.log('🔑 Backend: Received app-only token request');
    console.log('  - Tenant ID:', tenantId ? `${tenantId.substring(0, 8)}...` : 'MISSING');
    console.log('  - Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
    console.log('  - Client Secret:', clientSecret ? 'PROVIDED' : 'MISSING');

    if (!clientId || !clientSecret || !tenantId) {
      console.error('❌ Backend: Missing required credentials in request body');
      return res.status(400).json({
        error: 'Missing required credentials',
        details: `Missing: ${!clientId ? 'clientId ' : ''}${!clientSecret ? 'clientSecret ' : ''}${!tenantId ? 'tenantId' : ''}`.trim()
      });
    }

    // Validate credentials are not placeholder values
    const placeholders = ['your-client-id', 'your-tenant-id', 'your-client-secret', 'demo-'];
    if (placeholders.some(p => clientId.includes(p) || tenantId.includes(p) || clientSecret.includes(p))) {
      console.error('❌ Backend: Placeholder values detected in credentials');
      return res.status(400).json({
        error: 'Invalid credentials',
        details: 'Please configure valid Azure AD credentials (not placeholder values)'
      });
    }

    console.log('🔑 Backend: Acquiring app-only token for tenant:', tenantId);
    
    // Call Azure AD token endpoint from backend (no CORS issues)
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');
    
    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const data = response.data;
    console.log('✅ Backend: App-only token acquired');
    
    res.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type
    });
    
  } catch (error) {
    console.error('❌ Backend: App-only token error:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    // Handle axios error response
    if (error.response) {
      const azureError = error.response.data;
      console.error('❌ Azure AD token error details:', JSON.stringify(azureError, null, 2));
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);

      // Extract detailed error message
      const errorDescription = azureError.error_description || azureError.error || error.message;

      return res.status(error.response.status || 401).json({
        error: 'Failed to acquire token',
        details: errorDescription,
        azureError: azureError.error,
        errorCode: azureError.error_codes?.[0]
      });
    }

    // Handle axios request error (network issues, etc.)
    if (error.request) {
      console.error('❌ Backend: Request was made but no response received');
      console.error('Request details:', error.request);
      return res.status(500).json({
        error: 'Network error',
        details: 'Failed to connect to Azure AD token endpoint. Please check network connectivity.',
        message: error.message
      });
    }

    // Generic error (not from Azure or network)
    console.error('❌ Backend: Non-Azure error:', error);
    res.status(500).json({
      error: 'Failed to get app-only token',
      details: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/auth/validate
 * Validate Azure AD credentials
 */
router.post('/validate', async (req, res) => {
  try {
    if (!req.session.credentials) {
      return res.status(401).json({ error: 'No credentials configured' });
    }
    
    const validation = await validateCredentials(req.session.credentials);
    
    if (validation.valid) {
      res.json({ valid: true, message: 'Credentials are valid' });
    } else {
      res.status(401).json({ valid: false, error: validation.error });
    }
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate credentials' });
  }
});

/**
 * POST /api/auth/login-app-only
 * Login with client credentials (app-only mode)
 */
router.post('/login-app-only', async (req, res) => {
  try {
    if (!req.session.credentials) {
      return res.status(401).json({ error: 'No credentials configured' });
    }
    
    // Validate credentials
    const validation = await validateCredentials(req.session.credentials);
    
    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid credentials', details: validation.error });
    }
    
    // Extract tenant ID from credentials for multi-tenant support
    const { decryptCredentials } = require('../utils/encryption');
    const creds = decryptCredentials(req.session.credentials);
    const tenantId = creds.tenantId || 'default-tenant';
    
    // Set authenticated flag
    req.session.authenticated = true;
    req.session.authMode = 'app-only';
    req.session.user = {
      id: `app-${tenantId}`, // Unique ID for app-only auth
      tenantId: tenantId,
      tid: tenantId,
      displayName: 'Application Admin',
      userPrincipalName: 'app@system',
      email: 'app@system',
      authMode: 'app-only',
      roles: ['admin']
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({
        success: true,
        authMode: 'app-only',
        user: req.session.user
      });
    });
  } catch (error) {
    console.error('App-only login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/login-oauth2
 * Initiate OAuth2 interactive login
 */
router.get('/login-oauth2', async (req, res) => {
  try {
    if (!req.session.credentials) {
      return res.status(401).json({ error: 'No credentials configured' });
    }
    
    const msalInstance = createMsalInstance(req.session.credentials);
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
    const scopes = ['User.Read', 'User.ReadWrite.All', 'Group.ReadWrite.All'];
    
    const authUrl = await getAuthorizationUrl(msalInstance, redirectUri, scopes);
    
    // Store state in session for validation
    req.session.authState = 'pending';
    
    res.json({ authUrl });
  } catch (error) {
    console.error('OAuth2 initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth2 login' });
  }
});

/**
 * GET /api/auth/callback
 * OAuth2 callback handler
 */
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }
    
    if (!req.session.credentials) {
      return res.status(401).send('Session expired. Please configure credentials again.');
    }
    
    const msalInstance = createMsalInstance(req.session.credentials);
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
    const scopes = ['User.Read', 'User.ReadWrite.All', 'Group.ReadWrite.All'];
    
    const tokenResponse = await acquireTokenByCode(msalInstance, code, redirectUri, scopes);
    
    // Extract tenant ID from credentials and token response
    const { decryptCredentials } = require('../utils/encryption');
    const creds = decryptCredentials(req.session.credentials);
    const tenantId = tokenResponse.account.tenantId || creds.tenantId || 'default-tenant';
    const userId = tokenResponse.account.homeAccountId || tokenResponse.account.localAccountId || tokenResponse.account.username;
    
    // Store user info and account in session with tenant context
    req.session.authenticated = true;
    req.session.authMode = 'oauth2';
    req.session.account = tokenResponse.account;
    req.session.user = {
      id: userId,
      tenantId: tenantId,
      tid: tenantId,
      oid: tokenResponse.account.localAccountId,
      sub: userId,
      displayName: tokenResponse.account.name,
      name: tokenResponse.account.name,
      userPrincipalName: tokenResponse.account.username,
      email: tokenResponse.account.username,
      upn: tokenResponse.account.username,
      preferred_username: tokenResponse.account.username,
      authMode: 'oauth2',
      roles: tokenResponse.idTokenClaims?.roles || []
    };
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).send('Failed to save session');
      }
      
      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/dashboard?auth=success`);
    });
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/auth/session
 * Get current session information
 */
router.get('/session', (req, res) => {
  if (!req.session.authenticated) {
    return res.json({
      authenticated: false,
      configured: !!req.session.configured
    });
  }
  
  res.json({
    authenticated: true,
    configured: true,
    authMode: req.session.authMode,
    user: req.session.user
  });
});

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * GET /api/auth/msal-config
 * Get MSAL configuration from backend environment variables
 * Used for interactive OAuth2 authentication
 */
router.get('/msal-config', (req, res) => {
  try {
    console.log('🔍 MSAL config endpoint called');
    console.log('🔍 All env vars available:', Object.keys(process.env).filter(k => k.startsWith('AZURE')));
    
    const clientId = process.env.AZURE_CLIENT_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const isMultiTenant = process.env.AZURE_MULTITENANT === 'true';
    
    console.log('🔍 AZURE_CLIENT_ID present:', !!clientId);
    console.log('🔍 AZURE_TENANT_ID present:', !!tenantId);
    console.log('🔍 Multi-tenant mode:', isMultiTenant);
    
    if (!clientId || !tenantId) {
      console.warn('⚠️ MSAL config requested but environment variables not set');
      console.warn('⚠️ Available env vars:', Object.keys(process.env).sort().join(', '));
      return res.status(404).json({
        error: 'MSAL configuration not available',
        message: 'Please set AZURE_CLIENT_ID and AZURE_TENANT_ID in Vercel environment variables',
        debug: {
          hasClientId: !!clientId,
          hasTenantId: !!tenantId,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }
    
    console.log('✅ Providing MSAL config from environment variables');
    console.log('  - Client ID:', clientId.substring(0, 8) + '...');
    console.log('  - Tenant ID:', tenantId.substring(0, 8) + '...');
    console.log('  - Multi-tenant:', isMultiTenant);
    
    // For multi-tenant apps, use 'common' or 'organizations' authority
    // For single-tenant, use specific tenant ID
    const authority = isMultiTenant 
      ? 'https://login.microsoftonline.com/organizations'  // Work/school accounts from any org
      : `https://login.microsoftonline.com/${tenantId}`;   // Specific tenant only
    
    // Get frontend URL for redirect URI
    // In production, use the FRONTEND_URL env var
    // In development, use the referer or default to localhost
    const frontendUrl = process.env.FRONTEND_URL || 
                       req.get('referer')?.replace(/\/$/, '') || 
                       'http://localhost:3000';
    
    console.log('  - Frontend URL:', frontendUrl);
    
    res.json({
      clientId,
      tenantId,
      authority,
      isMultiTenant,
      redirectUri: frontendUrl  // Frontend origin for popup authentication
    });
  } catch (error) {
    console.error('❌ Error getting MSAL config:', error);
    res.status(500).json({ error: 'Failed to retrieve MSAL configuration' });
  }
});

/**
 * DELETE /api/auth/credentials
 * Clear credentials from session
 */
router.delete('/credentials', (req, res) => {
  req.session.credentials = null;
  req.session.configured = false;
  req.session.authenticated = false;
  
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Failed to clear credentials' });
    }
    
    res.json({ success: true, message: 'Credentials cleared' });
  });
});

module.exports = router;
