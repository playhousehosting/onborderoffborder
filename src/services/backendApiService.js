import apiConfig from '../config/apiConfig';

/**
 * Backend API Service
 * Handles all communication with the secure backend API
 */

class BackendApiService {
  /**
   * Make a request to the backend API
   */
  async request(endpoint, options = {}) {
    const url = typeof endpoint === 'string' ? endpoint : endpoint;
    const config = {
      ...apiConfig.defaultOptions,
      ...options,
      headers: {
        ...apiConfig.defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ==================== Auth Methods ====================

  /**
   * Save and encrypt credentials on backend
   */
  async configureCredentials(credentials) {
    return this.request(apiConfig.endpoints.configure, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Validate credentials with Microsoft
   */
  async validateCredentials(credentials) {
    return this.request(apiConfig.endpoints.validate, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Login with app-only (client credentials) flow
   */
  async loginAppOnly(credentials) {
    return this.request(apiConfig.endpoints.loginAppOnly, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Get OAuth2 authorization URL
   */
  async getOAuth2LoginUrl(credentials) {
    const params = new URLSearchParams(credentials);
    return `${apiConfig.endpoints.loginOAuth2}?${params.toString()}`;
  }

  /**
   * Check current session status
   */
  async getSession() {
    return this.request(apiConfig.endpoints.session);
  }

  /**
   * Logout and destroy session
   */
  async logout() {
    return this.request(apiConfig.endpoints.logout, {
      method: 'POST',
    });
  }

  // ==================== Graph Methods ====================

  /**
   * Get current user info
   */
  async getCurrentUser() {
    return this.request(apiConfig.endpoints.graphMe);
  }

  /**
   * List all users
   */
  async listUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${apiConfig.endpoints.graphUsers}?${query}` : apiConfig.endpoints.graphUsers;
    return this.request(url);
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    return this.request(`${apiConfig.endpoints.graphUsers}/${userId}`);
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    return this.request(apiConfig.endpoints.graphUsers, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Update a user
   */
  async updateUser(userId, userData) {
    return this.request(`${apiConfig.endpoints.graphUsers}/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(userId) {
    return this.request(`${apiConfig.endpoints.graphUsers}/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * List groups
   */
  async listGroups(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${apiConfig.endpoints.graphGroups}?${query}` : apiConfig.endpoints.graphGroups;
    return this.request(url);
  }

  /**
   * List managed devices
   */
  async listDevices(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${apiConfig.endpoints.graphDevices}?${query}` : apiConfig.endpoints.graphDevices;
    return this.request(url);
  }

  /**
   * Generic Graph API proxy
   * For any Graph API call not explicitly implemented above
   */
  async graphProxyRequest(graphPath, options = {}) {
    const method = options.method || 'GET';
    const url = `${apiConfig.endpoints.graphProxy}/${graphPath}`;
    
    const config = {
      method,
      ...options,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    return this.request(url, config);
  }

  // ==================== Health Check ====================

  /**
   * Check if backend is healthy
   */
  async healthCheck() {
    return this.request(`${apiConfig.baseURL}/health`);
  }
}

// Export singleton instance
const backendApi = new BackendApiService();
export default backendApi;
