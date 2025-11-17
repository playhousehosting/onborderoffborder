import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

/**
 * Microsoft Authentication Library (MSAL) Configuration
 * Enables native Microsoft SSO for multi-tenant applications
 */

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || '3f4637ee-e352-4273-96a6-3996a4a7f8c0',
    authority: 'https://login.microsoftonline.com/0851dcc0-890e-4381-b82d-c14fe2915be3',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: 'localStorage', // Enables SSO across tabs
    storeAuthStateInCookie: false // Set to true for IE11/Edge legacy
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL]', message);
            break;
          case LogLevel.Info:
            console.info('[MSAL]', message);
            break;
          case LogLevel.Verbose:
            console.debug('[MSAL]', message);
            break;
          case LogLevel.Warning:
            console.warn('[MSAL]', message);
            break;
        }
      },
      logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Verbose : LogLevel.Warning
    }
  }
};

/**
 * Scopes for Microsoft Graph API
 * These enable access to user profiles, directory, groups, and devices
 */
export const loginRequest = {
  scopes: [
    'User.Read',
    'User.ReadWrite.All',
    'Directory.Read.All',
    'Directory.ReadWrite.All',
    'Group.Read.All',
    'DeviceManagementManagedDevices.ReadWrite.All',
    'offline_access' // For refresh tokens
  ]
};

/**
 * Scopes for Graph API token acquisition
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphUsersEndpoint: 'https://graph.microsoft.com/v1.0/users'
};

// Create the MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirects
msalInstance.initialize().then(() => {
  console.log('✅ MSAL initialized successfully');
  
  // Handle redirect promise (for loginRedirect/logoutRedirect flows)
  msalInstance.handleRedirectPromise()
    .then((response) => {
      if (response) {
        console.log('✅ MSAL: Redirect authentication successful', response.account?.username);
        msalInstance.setActiveAccount(response.account);
      } else {
        // No redirect response, check if there's an existing account in cache
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          console.log('✅ Active account restored:', accounts[0].username);
        }
      }
    })
    .catch((error) => {
      console.error('❌ MSAL: Redirect error', error);
      // Display user-friendly error message
      if (error.errorCode === 'invalid_request' && error.errorMessage?.includes('AADSTS9002326')) {
        console.error('⚠️ Azure App Registration must be configured as "Single-Page Application" (SPA) type');
        console.error('📖 See AZURE_SPA_CONFIGURATION_REQUIRED.md for setup instructions');
      }
    });
}).catch((error) => {
  console.error('❌ MSAL initialization error:', error);
});

export default msalInstance;
