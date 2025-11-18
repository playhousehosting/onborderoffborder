/**
 * Graph Service for MSAL-authenticated users
 * Uses backend proxy to call Microsoft Graph API with MSAL access tokens
 */
class MSALGraphService {
  constructor() {
    // Use Convex deployment URL for proxy
    const convexUrl = process.env.REACT_APP_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('REACT_APP_CONVEX_URL environment variable is required');
    }
    // Convex HTTP actions are served from .convex.site, not .convex.cloud
    // Convert .convex.cloud to .convex.site for HTTP actions
    this.baseUrl = convexUrl.replace('.convex.cloud', '.convex.site').replace('/api', '');
    this.proxyPath = '/msal-proxy/graph';
    this._getTokenFunction = null;
  }

  /**
   * Get MSAL access token
   * This will be set by the React component using setGetTokenFunction
   */
  async getAccessToken() {
    if (!this._getTokenFunction) {
      throw new Error('Must call setGetTokenFunction first with getAccessToken from useMSALAuth');
    }
    return await this._getTokenFunction();
  }

  /**
   * Set the function to get MSAL access token (called from React component)
   * @param {Function} getTokenFn - The getAccessToken function from useMSALAuth hook
   */
  setGetTokenFunction(getTokenFn) {
    this._getTokenFunction = getTokenFn;
  }

  /**
   * Make authenticated request to Graph API via proxy
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('No MSAL access token available. Please sign in with Microsoft.');
      }

      // Ensure endpoint starts with / for proper path construction
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${this.baseUrl}${this.proxyPath}${cleanEndpoint}`;
      
      console.log(`📡 MSAL Graph request: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
        credentials: 'omit', // HTTP actions don't use cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        console.error(`❌ Graph request failed (${response.status}):`, errorData);
        
        // Check for OAuth requirement (shouldn't happen with MSAL, but keep for compatibility)
        if (errorData.requiresOAuth) {
          const error = new Error(errorData.message || 'Microsoft authorization required');
          error.requiresOAuth = true;
          throw error;
        }
        
        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Graph request successful:`, data);
      return data;
    } catch (error) {
      console.error('❌ Graph request error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId, select) {
    let endpoint = `/users/${userId}`;
    if (select) {
      endpoint += `?$select=${select}`;
    }
    return await this.makeRequest(endpoint);
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(options = {}) {
    const { top = 999, filter, select } = options;
    
    let queryParams = [`$top=${top}`, '$count=true'];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/users?${queryParams.join('&')}`;
    const response = await this.makeRequest(endpoint);
    
    return response.value || [];
  }

  /**
   * Get user by ID
   */
  async getUser(userId, select) {
    let endpoint = `/users/${userId}`;
    if (select) {
      endpoint += `?$select=${select}`;
    }
    return await this.makeRequest(endpoint);
  }

  /**
   * Get user's manager
   */
  async getUserManager(userId) {
    return await this.makeRequest(`/users/${userId}/manager`);
  }

  /**
   * Get user's direct reports
   */
  async getUserDirectReports(userId) {
    const response = await this.makeRequest(`/users/${userId}/directReports`);
    return response.value || [];
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId) {
    const response = await this.makeRequest(`/users/${userId}/memberOf`);
    return response.value || [];
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Disable user account
   */
  async disableUser(userId) {
    return await this.updateUser(userId, {
      accountEnabled: false,
    });
  }

  /**
   * Enable user account
   */
  async enableUser(userId) {
    return await this.updateUser(userId, {
      accountEnabled: true,
    });
  }

  /**
   * Get all groups
   */
  async getAllGroups(options = {}) {
    const { top = 999, filter, select } = options;
    
    let queryParams = [`$top=${top}`];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/groups?${queryParams.join('&')}`;
    const response = await this.makeRequest(endpoint);
    
    return response.value || [];
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId, select) {
    let endpoint = `/groups/${groupId}`;
    if (select) {
      endpoint += `?$select=${select}`;
    }
    return await this.makeRequest(endpoint);
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId) {
    const response = await this.makeRequest(`/groups/${groupId}/members`);
    return response.value || [];
  }

  /**
   * Add user to group
   */
  async addUserToGroup(groupId, userId) {
    return await this.makeRequest(`/groups/${groupId}/members/$ref`, {
      method: 'POST',
      body: JSON.stringify({
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
      }),
    });
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(groupId, userId) {
    return await this.makeRequest(`/groups/${groupId}/members/${userId}/$ref`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all devices (requires DeviceManagementManagedDevices.ReadWrite.All)
   */
  async getAllDevices(options = {}) {
    const { top = 999, filter, select } = options;
    
    let queryParams = [`$top=${top}`];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/deviceManagement/managedDevices?${queryParams.join('&')}`;
    const response = await this.makeRequest(endpoint);
    
    return response.value || [];
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId, select) {
    let endpoint = `/deviceManagement/managedDevices/${deviceId}`;
    if (select) {
      endpoint += `?$select=${select}`;
    }
    return await this.makeRequest(endpoint);
  }

  /**
   * Wipe device
   */
  async wipeDevice(deviceId, keepEnrollmentData = false) {
    return await this.makeRequest(`/deviceManagement/managedDevices/${deviceId}/wipe`, {
      method: 'POST',
      body: JSON.stringify({ keepEnrollmentData }),
    });
  }

  /**
   * Retire device
   */
  async retireDevice(deviceId) {
    return await this.makeRequest(`/deviceManagement/managedDevices/${deviceId}/retire`, {
      method: 'POST',
    });
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId) {
    return await this.makeRequest(`/deviceManagement/managedDevices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get available licenses (subscribed SKUs) for the organization
   */
  async getAvailableLicenses() {
    const response = await this.makeRequest('/subscribedSkus');
    return response;
  }

  /**
   * Get user license details
   */
  async getUserLicenses(userId) {
    const response = await this.makeRequest(`/users/${userId}/licenseDetails`);
    return response.value || [];
  }

  /**
   * Assign license to user
   */
  async assignLicense(userId, skuId, removeLicenses = []) {
    return await this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses: [{ skuId }],
        removeLicenses,
      }),
    });
  }

  /**
   * Remove license from user
   */
  async removeLicense(userId, skuId) {
    return await this.assignLicense(userId, null, [skuId]);
  }

  /**
   * Execute Graph batch request
   */
  async batch(requests) {
    return await this.makeRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }
}

// Create singleton instance
const msalGraphService = new MSALGraphService();

// Export both class and instance
export { MSALGraphService };
export default msalGraphService;
