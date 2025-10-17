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
        try {
          const request = {
            scopes,
            account: this.getCurrentAccount(),
          };
          const response = await this.msalInstance.acquireTokenRedirect(request);
          return response.accessToken;
        } catch (redirectError) {
          console.error('Token acquisition redirect error:', redirectError);
          throw redirectError;
        }
      } else {
        console.error('Token acquisition error:', error);
        throw error;
      }
    }
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