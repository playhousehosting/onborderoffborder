import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest, offboardingScopes, onboardingScopes } from '../config/authConfig';

export class AuthService {
  constructor(msalInstance = null) {
    this.msalInstance = msalInstance;
    this.account = null;
  }

  // Set MSAL instance (called from App.js after initialization)
  setMsalInstance(msalInstance) {
    this.msalInstance = msalInstance;
    // Update account if there's one signed in
    const accounts = this.msalInstance?.getAllAccounts() || [];
    if (accounts.length > 0) {
      this.account = accounts[0];
    }
  }

  // Get current account
  getCurrentAccount() {
    if (!this.msalInstance) {
      return null;
    }
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentAccount() !== null;
  }

  // Login using redirect
  loginRedirect(scopes = loginRequest.scopes) {
    if (!this.msalInstance) {
      throw new Error('MSAL instance not initialized');
    }
    const request = {
      ...loginRequest,
      scopes,
    };
    this.msalInstance.loginRedirect(request);
  }

  // Login using popup
  async loginPopup(scopes = loginRequest.scopes) {
    if (!this.msalInstance) {
      throw new Error('MSAL instance not initialized');
    }
    try {
      const request = {
        ...loginRequest,
        scopes,
      };
      const response = await this.msalInstance.loginPopup(request);
      this.account = response.account;
      return response;
    } catch (error) {
      console.error('Login popup error:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    if (!this.msalInstance) {
      return;
    }
    const logoutRequest = {
      account: this.getCurrentAccount(),
    };
    this.msalInstance.logoutRedirect(logoutRequest);
  }

  // Get access token for Graph API
  async getAccessToken(scopes = loginRequest.scopes) {
    // Check if we're using app-only authentication (client credentials flow)
    const authMode = localStorage.getItem('authMode');

    if (authMode === 'app-only') {
      return this.getAppOnlyToken();
    }

    // Standard OAuth2 flow with MSAL
    try {
      const account = this.getCurrentAccount();
      if (!account) {
        throw new Error('No account found');
      }

      const request = {
        scopes,
        account: account,
      };

      // Try to get token from cache first
      const response = await this.msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      // If silent acquisition fails, try interactive method
      if (error instanceof InteractionRequiredAuthError) {
        // acquireTokenRedirect does not return a value - it redirects the page
        // The token will be available after redirect via handleRedirectPromise()
        const request = {
          scopes,
          account: this.getCurrentAccount(),
        };

        console.log('Interactive authentication required - redirecting...');
        // This will redirect the page and not return
        await this.msalInstance.acquireTokenRedirect(request);

        // Code after redirect will never execute
        // Token will be acquired on page load via handleRedirectPromise()
        throw new Error('Redirecting for authentication');
      } else {
        console.error('Token acquisition error:', error);
        throw error;
      }
    }
  }

  // Get access token using app-only (client credentials) flow
  async getAppOnlyToken() {
    try {
      // Get credentials from localStorage
      const azureConfig = JSON.parse(localStorage.getItem('azureConfig') || '{}');
      const { clientId, clientSecret, tenantId } = azureConfig;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('App-only credentials not configured');
      }

      // Check if we have a cached token that's still valid
      const cachedToken = this._getAppOnlyCachedToken();
      if (cachedToken) {
        return cachedToken;
      }

      // Get new token from backend (avoids CORS issues)
      console.log('🔑 Acquiring app-only access token via backend...');
      
      // Import apiConfig to get the correct backend URL
      const { apiConfig } = await import('../config/apiConfig');
      
      // Call backend endpoint instead of Azure AD directly (avoids CORS)
      const response = await fetch(apiConfig.endpoints.appOnlyToken, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          tenantId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get app-only token: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the token with expiration
      this._cacheAppOnlyToken(data.access_token, data.expires_in);
      
      console.log('✅ App-only access token acquired from backend');
      return data.access_token;
    } catch (error) {
      console.error('Error getting app-only token:', error);
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

  // Get token with specific scopes for offboarding
  async getOffboardingToken() {
    return this.getAccessToken(offboardingScopes);
  }

  // Get token with specific scopes for onboarding
  async getOnboardingToken() {
    return this.getAccessToken(onboardingScopes);
  }

  // Get token for user management
  async getUserManagementToken() {
    return this.getAccessToken(['User.Read.All', 'User.ReadWrite.All']);
  }

  // Get token for device management (Intune)
  async getDeviceManagementToken() {
    return this.getAccessToken([
      'DeviceManagementManagedDevices.ReadWrite.All',
      'DeviceManagementApps.ReadWrite.All'
    ]);
  }

  // Get token for mail management
  async getMailManagementToken() {
    return this.getAccessToken([
      'MailboxSettings.ReadWrite',
      'Mail.ReadWrite'
    ]);
  }

  // Get token for SharePoint/OneDrive
  async getSharePointToken() {
    return this.getAccessToken(['Sites.ReadWrite.All']);
  }

  // Get token for Teams
  async getTeamsToken() {
    return this.getAccessToken(['Team.ReadWrite.All']);
  }

  // Request additional permissions
  async requestAdditionalPermissions(scopes) {
    try {
      const request = {
        scopes,
        prompt: 'consent',
      };
      await this.msalInstance.acquireTokenRedirect(request);
    } catch (error) {
      console.error('Permission request error:', error);
      throw error;
    }
  }

  // Check if user has specific permissions
  async hasPermissions(scopes) {
    try {
      await this.getAccessToken(scopes);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get user info from Graph API
  async getUserInfo() {
    try {
      const token = await this.getAccessToken(['User.Read']);
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const authService = new AuthService();

// Export class for potential multiple instances
export default AuthService;