/**
 * Configuration for MSAL.js authentication
 */

import { backendApi } from './apiConfig';

// Helper function to get config from localStorage
const getAzureConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('azureConfig') || '{}');
  } catch (e) {
    return {};
  }
};

// Fetch MSAL configuration from backend environment variables
let backendConfigPromise = null;
let cachedBackendConfig = null;

export const fetchMsalConfigFromBackend = async () => {
  // Return cached config if available
  if (cachedBackendConfig) {
    return cachedBackendConfig;
  }
  
  // Return existing promise if already fetching
  if (backendConfigPromise) {
    return backendConfigPromise;
  }
  
  backendConfigPromise = (async () => {
    try {
      console.log('🔍 Fetching MSAL config from backend...');
      const url = `${backendApi.baseURL}/api/auth/msal-config`;
      console.log('🔍 Fetching from URL:', url);
      const response = await fetch(url);
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response content-type:', response.headers.get('content-type'));
      
      if (response.ok) {
        const config = await response.json();
        console.log('✅ Received MSAL config from backend');
        console.log('  - Client ID:', config.clientId?.substring(0, 8) + '...');
        console.log('  - Tenant ID:', config.tenantId?.substring(0, 8) + '...');
        cachedBackendConfig = config;
        return config;
      } else {
        const text = await response.text();
        console.warn('⚠️ Backend MSAL config not available:', response.status);
        console.warn('⚠️ Response body:', text.substring(0, 200));
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch MSAL config from backend:', error.message);
      return null;
    } finally {
      backendConfigPromise = null;
    }
  })();
  
  return backendConfigPromise;
};

export const msalConfig = {
  auth: {
    // Application (client) ID from the app registration
    clientId: process.env.REACT_APP_CLIENT_ID || getAzureConfig().clientId || '',
    // Directory (tenant) ID from the app registration
    // For multi-tenant apps, use authority from backend config
    // For single-tenant, use specific tenant ID
    authority: process.env.REACT_APP_AUTHORITY || (() => {
      const config = getAzureConfig();
      
      // If backend provided authority (multi-tenant config), use it
      if (config.authority) {
        return config.authority;
      }
      
      // If we have a tenant ID but no authority, check if multi-tenant
      if (config.tenantId) {
        // If marked as multi-tenant, use 'organizations'
        if (config.isMultiTenant) {
          return 'https://login.microsoftonline.com/organizations';
        }
        // Single-tenant: use specific tenant ID
        return `https://login.microsoftonline.com/${config.tenantId}`;
      }
      
      // Fallback to 'organizations' (work/school accounts only)
      return 'https://login.microsoftonline.com/organizations';
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
  // Check if we have valid config in localStorage (prioritize this over demo mode flag)
  const config = getAzureConfig();
  const hasValidLocalConfig = config.clientId && 
                               config.clientId !== 'your-client-id-here' &&
                               config.tenantId &&
                               config.tenantId !== 'your-tenant-id';
  
  // If we have valid local config (app-only or OAuth2), we're NOT in demo mode
  // This takes precedence over the demoMode flag
  if (hasValidLocalConfig) {
    return false;
  }
  
  // Check if environment variables exist and are valid (fallback)
  const hasValidEnvVars = process.env.REACT_APP_CLIENT_ID && 
                          process.env.REACT_APP_CLIENT_ID !== 'your-client-id-here' &&
                          process.env.REACT_APP_AUTHORITY &&
                          !process.env.REACT_APP_AUTHORITY.includes('your-tenant-id');
  
  // If we have valid env vars, we're not in demo mode
  if (hasValidEnvVars) {
    return false;
  }
  
  // Check localStorage for explicit demo mode flag (only if no valid credentials)
  const demoModeFlag = localStorage.getItem('demoMode');
  if (demoModeFlag === 'true') {
    return true;
  }
  
  // No valid configuration found - not in demo mode, just unconfigured
  // Demo mode must be explicitly enabled
  return false;
};