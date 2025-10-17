const { ConfidentialClientApplication } = require('@azure/msal-node');
const { decryptCredentials } = require('../utils/encryption');

/**
 * Create MSAL instance for a specific user session
 * @param {Object} credentials - User's Azure AD credentials
 * @param {string} credentials.clientId - Azure AD Client ID
 * @param {string} credentials.tenantId - Azure AD Tenant ID
 * @param {string} credentials.clientSecret - Azure AD Client Secret (encrypted)
 * @returns {ConfidentialClientApplication} - MSAL instance
 */
function createMsalInstance(credentials) {
  // Decrypt credentials if encrypted
  const decrypted = credentials.encrypted ? decryptCredentials(credentials) : credentials;
  
  const msalConfig = {
    auth: {
      clientId: decrypted.clientId,
      authority: `https://login.microsoftonline.com/${decrypted.tenantId}`,
      clientSecret: decrypted.clientSecret || undefined,
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: process.env.NODE_ENV === 'production' ? 3 : 2, // Error in prod, Info in dev
      }
    }
  };
  
  return new ConfidentialClientApplication(msalConfig);
}

/**
 * Get access token for Microsoft Graph API
 * @param {ConfidentialClientApplication} msalInstance - MSAL instance
 * @param {Array<string>} scopes - Required scopes
 * @param {Object} account - User account (optional, for OAuth2 flow)
 * @returns {Promise<string>} - Access token
 */
async function getAccessToken(msalInstance, scopes = ['https://graph.microsoft.com/.default'], account = null) {
  try {
    let tokenResponse;
    
    if (account) {
      // Try to get token silently for OAuth2 flow
      const silentRequest = {
        account: account,
        scopes: scopes
      };
      
      try {
        tokenResponse = await msalInstance.acquireTokenSilent(silentRequest);
      } catch (error) {
        // If silent acquisition fails, we need interactive authentication
        throw new Error('Interactive authentication required');
      }
    } else {
      // Client credentials flow (app-only)
      const clientCredentialRequest = {
        scopes: scopes
      };
      
      tokenResponse = await msalInstance.acquireTokenByClientCredential(clientCredentialRequest);
    }
    
    return tokenResponse.accessToken;
  } catch (error) {
    console.error('Token acquisition error:', error);
    throw error;
  }
}

/**
 * Validate Azure AD credentials
 * @param {Object} credentials - Azure AD credentials
 * @returns {Object} - Validation result
 */
async function validateCredentials(credentials) {
  try {
    const msalInstance = createMsalInstance(credentials);
    
    // Try to acquire a token to validate credentials
    const token = await getAccessToken(msalInstance);
    
    return {
      valid: true,
      token: token
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Get authorization URL for OAuth2 interactive login
 * @param {ConfidentialClientApplication} msalInstance - MSAL instance
 * @param {string} redirectUri - Redirect URI after authentication
 * @param {Array<string>} scopes - Required scopes
 * @returns {Promise<string>} - Authorization URL
 */
async function getAuthorizationUrl(msalInstance, redirectUri, scopes) {
  const authCodeUrlParameters = {
    scopes: scopes,
    redirectUri: redirectUri,
  };
  
  const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
  return authUrl;
}

/**
 * Acquire token by authorization code (OAuth2 callback)
 * @param {ConfidentialClientApplication} msalInstance - MSAL instance
 * @param {string} code - Authorization code from callback
 * @param {string} redirectUri - Redirect URI used in authorization request
 * @param {Array<string>} scopes - Required scopes
 * @returns {Promise<Object>} - Token response with account info
 */
async function acquireTokenByCode(msalInstance, code, redirectUri, scopes) {
  const tokenRequest = {
    code: code,
    scopes: scopes,
    redirectUri: redirectUri,
  };
  
  const tokenResponse = await msalInstance.acquireTokenByCode(tokenRequest);
  return tokenResponse;
}

module.exports = {
  createMsalInstance,
  getAccessToken,
  validateCredentials,
  getAuthorizationUrl,
  acquireTokenByCode
};
