// Backend API Configuration
// In production (Vercel), backend is on same domain, so use empty string
// In development, use localhost:5000
const isProduction = () => {
  // Check if we're in production by looking at the hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Production: vercel.app domains or custom domains (not localhost)
    return hostname.includes('vercel.app') || 
           hostname.includes('dynamicendpoint.com') ||
           (!hostname.includes('localhost') && hostname !== '127.0.0.1');
  }
  // Fallback to NODE_ENV during build
  return process.env.NODE_ENV === 'production';
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (isProduction() ? '' : 'http://localhost:5000');

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
