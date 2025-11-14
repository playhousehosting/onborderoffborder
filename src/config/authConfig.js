/**
 * Authentication configuration for Convex Auth
 * SSO is handled by Convex Auth with Azure AD provider
 */

// Helper function to get config from localStorage
const getAzureConfig = () => {
  try {
    return JSON.parse(localStorage.getItem('azureConfig') || '{}');
  } catch (e) {
    return {};
  }
};

// API endpoints for Microsoft Graph
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