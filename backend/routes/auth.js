const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { encryptCredentials } = require('../utils/encryption');
const { validateCredentials, createMsalInstance, getAuthorizationUrl, acquireTokenByCode } = require('../services/authService');

/**
 * POST /api/auth/configure
 * Save Azure AD credentials to user's session (encrypted)
 */
router.post('/configure',
  [
    body('clientId').notEmpty().withMessage('Client ID is required'),
    body('tenantId').notEmpty().withMessage('Tenant ID is required'),
    body('clientSecret').optional(),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { clientId, tenantId, clientSecret } = req.body;
      
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
    
    // Set authenticated flag
    req.session.authenticated = true;
    req.session.authMode = 'app-only';
    req.session.user = {
      displayName: 'Application Admin',
      userPrincipalName: 'app@system',
      authMode: 'app-only'
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
    
    // Store user info and account in session
    req.session.authenticated = true;
    req.session.authMode = 'oauth2';
    req.session.account = tokenResponse.account;
    req.session.user = {
      displayName: tokenResponse.account.name,
      userPrincipalName: tokenResponse.account.username,
      authMode: 'oauth2'
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
