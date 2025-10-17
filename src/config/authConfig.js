/**
 * Configuration for MSAL.js authentication
 */

// Helper function to get config from localStorage
const getAzureConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('azureConfig') || '{}');
  } catch (e) {
    return {};
  }
};

export const msalConfig = {
  auth: {
    // Application (client) ID from the app registration
    clientId: process.env.REACT_APP_CLIENT_ID || getAzureConfig().clientId || '',
    // Directory (tenant) ID from the app registration
    authority: process.env.REACT_APP_AUTHORITY || (() => {
      const config = getAzureConfig();
      return config.tenantId ? `https://login.microsoftonline.com/${config.tenantId}` : 'https://login.microsoftonline.com/common';
    })(),
    // Usually the same as the App ID URI
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // Error
            console.error(message);
            return;
          case 1: // Warning
            console.warn(message);
            return;
          case 2: // Info
            console.info(message);
            return;
          case 3: // Verbose
            console.debug(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Scopes for Microsoft Graph API
export const graphScopes = {
  // User management
  userRead: ['User.Read'],
  userReadAll: ['User.Read.All'],
  userReadWriteAll: ['User.ReadWrite.All'],
  
  // Group management
  groupReadAll: ['Group.Read.All'],
  groupReadWriteAll: ['Group.ReadWrite.All'],
  
  // Device management (Intune)
  deviceManagedDevicesReadWriteAll: ['DeviceManagementManagedDevices.ReadWrite.All'],
  deviceAppsReadWriteAll: ['DeviceManagementApps.ReadWrite.All'],
  deviceConfigReadWriteAll: ['DeviceManagementConfiguration.ReadWrite.All'],
  
  // Mail and calendar
  mailboxSettingsReadWrite: ['MailboxSettings.ReadWrite'],
  mailRead: ['Mail.Read'],
  mailReadWrite: ['Mail.ReadWrite'],
  mailSend: ['Mail.Send'],
  
  // SharePoint and OneDrive
  sitesReadWriteAll: ['Sites.ReadWrite.All'],
  sitesFullControlAll: ['Sites.FullControl.All'],
  
  // Teams
  teamReadBasicAll: ['Team.ReadBasic.All'],
  teamReadWriteAll: ['Team.ReadWrite.All'],
  
  // Directory
  directoryReadAll: ['Directory.Read.All'],
  directoryReadWriteAll: ['Directory.ReadWrite.All'],
  
  // Reports
  reportsReadAll: ['Reports.Read.All'],
  
  // Policy
  policyReadAll: ['Policy.Read.All'],
  policyReadWriteAll: ['Policy.ReadWrite.All'],
};

// Login request configuration
export const loginRequest = {
  scopes: [...graphScopes.userRead, ...graphScopes.userReadAll, ...graphScopes.groupReadAll],
};

// Offboarding process required scopes
export const offboardingScopes = [
  ...graphScopes.userReadWriteAll,
  ...graphScopes.groupReadWriteAll,
  ...graphScopes.deviceManagedDevicesReadWriteAll,
  ...graphScopes.deviceAppsReadWriteAll,
  ...graphScopes.mailboxSettingsReadWrite,
  ...graphScopes.mailReadWrite,
  ...graphScopes.sitesReadWriteAll,
  ...graphScopes.teamReadWriteAll,
  ...graphScopes.directoryReadWriteAll,
];

// Onboarding process required scopes
export const onboardingScopes = [
  ...graphScopes.userReadWriteAll,
  ...graphScopes.groupReadWriteAll,
  ...graphScopes.mailReadWrite,
  ...graphScopes.sitesReadWriteAll,
  ...graphScopes.teamReadWriteAll,
];

// Consent scopes for admin operations
export const adminConsentScopes = [
  ...graphScopes.userReadWriteAll,
  ...graphScopes.groupReadWriteAll,
  ...graphScopes.deviceManagedDevicesReadWriteAll,
  ...graphScopes.deviceAppsReadWriteAll,
  ...graphScopes.deviceConfigReadWriteAll,
  ...graphScopes.mailboxSettingsReadWrite,
  ...graphScopes.mailReadWrite,
  ...graphScopes.sitesFullControlAll,
  ...graphScopes.teamReadWriteAll,
  ...graphScopes.directoryReadWriteAll,
  ...graphScopes.policyReadWriteAll,
];

// API endpoints
export const apiConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphUsersEndpoint: 'https://graph.microsoft.com/v1.0/users',
  graphGroupsEndpoint: 'https://graph.microsoft.com/v1.0/groups',
  graphDevicesEndpoint: 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices',
  graphApplicationsEndpoint: 'https://graph.microsoft.com/v1.0/deviceAppManagement/mobileApps',
};

// Check if we're in demo mode (no valid credentials)
export const isDemoMode = () => {
  // Check localStorage first
  const demoModeFlag = localStorage.getItem('demoMode');
  if (demoModeFlag === 'true') {
    return true;
  }
  
  // Check if environment variables are missing or placeholder values
  const hasValidEnvVars = process.env.REACT_APP_CLIENT_ID && 
                          process.env.REACT_APP_CLIENT_ID !== 'your-client-id-here' &&
                          process.env.REACT_APP_AUTHORITY &&
                          !process.env.REACT_APP_AUTHORITY.includes('your-tenant-id');
  
  // Check if we have valid config in localStorage
  const config = getAzureConfig();
  const hasValidLocalConfig = config.clientId && 
                               config.clientId !== 'your-client-id-here' &&
                               config.tenantId &&
                               config.tenantId !== 'your-tenant-id';
  
  // We're in demo mode if we have neither valid env vars nor valid local config
  return !hasValidEnvVars && !hasValidLocalConfig;
};