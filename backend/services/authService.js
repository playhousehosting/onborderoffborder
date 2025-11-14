// MSAL has been removed - all authentication now goes through Convex
// This file is kept for backward compatibility but functionality is deprecated
const { decryptCredentials } = require('../utils/encryption');

/**
 * DEPRECATED: Create MSAL instance - not used anymore
 * All authentication now handled by Convex Auth
 */
function createMsalInstance(credentials) {
  throw new Error('MSAL has been removed. All authentication now goes through Convex Auth.');
}

/**
 * DEPRECATED: Get access token - not used anymore
 * All token acquisition now handled by Convex backend
 */
async function getAccessToken(msalInstance, scopes = ['https://graph.microsoft.com/.default'], account = null) {
  throw new Error('MSAL token acquisition has been removed. Use Convex backend actions for Graph API calls.');
}

/**
 * DEPRECATED: Validate credentials
 * Credentials are now validated on the Convex backend
 */
async function validateCredentials(credentials) {
  // Stub implementation - validation now done on Convex
  return {
    valid: true,
    message: 'Validation now handled by Convex backend'
  };
}

/**
 * DEPRECATED: Get authorization URL
 * OAuth flow now handled by Convex Auth
 */
async function getAuthorizationUrl(msalInstance, redirectUri, scopes) {
  throw new Error('OAuth2 flow now handled by Convex Auth. Use the SSO login button.');
}

/**
 * DEPRECATED: Acquire token by code
 * OAuth flow now handled by Convex Auth
 */
async function acquireTokenByCode(msalInstance, code, redirectUri, scopes) {
  throw new Error('OAuth2 flow now handled by Convex Auth. Use the SSO login button.');
}

module.exports = {
  createMsalInstance,
  getAccessToken,
  validateCredentials,
  getAuthorizationUrl,
  acquireTokenByCode
};
