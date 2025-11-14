/**
 * Auth Service for handling access tokens
 * Uses Convex backend for app-only authentication
 * SSO authentication is handled by Convex Auth directly
 */
export class AuthService {
  constructor() {
    // No MSAL instance needed
  }

  // Get access token for Graph API
  async getAccessToken() {
    // Check if we're using app-only authentication (client credentials flow)
    const authMode = localStorage.getItem('authMode');

    if (authMode === 'app-only') {
      return this.getAppOnlyToken();
    }

    // For SSO mode, tokens are managed by Convex Auth
    // This method shouldn't be called for SSO users
    // Graph API calls should use Convex backend actions instead
    throw new Error('Token access not available. Use Convex backend actions for Graph API calls.');
  }

  // Get access token using app-only (client credentials) flow
  async getAppOnlyToken() {
    try {
      // Get sessionId from localStorage
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID found. Please configure your Azure AD credentials in Settings.');
      }

      console.log('🔑 Getting app-only token via Convex backend...');

      // Check if we have a cached token that's still valid
      const cachedToken = this._getAppOnlyCachedToken();
      if (cachedToken) {
        console.log('✅ Using cached app-only token');
        return cachedToken;
      }

      // Import Convex client and API
      const { ConvexHttpClient } = await import('convex/browser');
      const { api } = await import('../convex/_generated/api');
      const client = new ConvexHttpClient(process.env.REACT_APP_CONVEX_URL);

      // Get token from Convex backend (which calls Azure AD server-side)
      console.log('🔑 Requesting token from Convex backend...');
      const result = await client.action(api.auth.getAppOnlyToken, { sessionId });

      if (!result || !result.accessToken) {
        throw new Error('Failed to get access token from backend');
      }

      // Cache the token with expiration
      this._cacheAppOnlyToken(result.accessToken, result.expiresIn);

      console.log('✅ App-only access token acquired successfully from Convex backend');
      return result.accessToken;
    } catch (error) {
      console.error('❌ Error getting app-only token:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  // Get cached app-only token if still valid
  _getAppOnlyCachedToken() {
    try {
      const cached = localStorage.getItem('appOnlyToken');
      if (!cached) return null;

      const { token, expiresAt } = JSON.parse(cached);
      
      // Check if token is still valid (with 5-minute buffer)
      if (Date.now() < expiresAt - (5 * 60 * 1000)) {
        console.log('✅ Using cached app-only token');
        return token;
      }

      // Token expired, remove it
      localStorage.removeItem('appOnlyToken');
      return null;
    } catch (error) {
      return null;
    }
  }

  // Cache app-only token with expiration
  _cacheAppOnlyToken(token, expiresIn) {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem('appOnlyToken', JSON.stringify({ token, expiresAt }));
  }

  // Legacy methods - kept for compatibility but redirected to getAccessToken
  async getOffboardingToken() {
    return this.getAccessToken();
  }

  async getOnboardingToken() {
    return this.getAccessToken();
  }

  async getUserManagementToken() {
    return this.getAccessToken();
  }

  async getDeviceManagementToken() {
    return this.getAccessToken();
  }

  async getMailManagementToken() {
    return this.getAccessToken();
  }

  async getSharePointToken() {
    return this.getAccessToken();
  }

  async getTeamsToken() {
    return this.getAccessToken();
  }
}

// Create a singleton instance
export const authService = new AuthService();

// Export class for potential multiple instances
export default AuthService;