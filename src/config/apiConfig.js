// Backend API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Auth endpoints
    configure: `${API_BASE_URL}/api/auth/configure`,
    validate: `${API_BASE_URL}/api/auth/validate`,
    loginAppOnly: `${API_BASE_URL}/api/auth/login-app-only`,
    loginOAuth2: `${API_BASE_URL}/api/auth/login-oauth2`,
    appOnlyToken: `${API_BASE_URL}/api/auth/app-only-token`,
    callback: `${API_BASE_URL}/api/auth/callback`,
    session: `${API_BASE_URL}/api/auth/session`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    
    // Graph endpoints (proxied through backend)
    graphMe: `${API_BASE_URL}/api/graph/me`,
    graphUsers: `${API_BASE_URL}/api/graph/users`,
    graphGroups: `${API_BASE_URL}/api/graph/groups`,
    graphDevices: `${API_BASE_URL}/api/graph/devices`,
    graphProxy: `${API_BASE_URL}/api/graph/proxy`,
  },
  
  // Default fetch options (include credentials for session cookies)
  defaultOptions: {
    credentials: 'include', // Critical for session cookies
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

export default apiConfig;
