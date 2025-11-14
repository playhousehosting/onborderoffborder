import React from 'react';
import { useAuth } from '@clerk/clerk-react';

/**
 * Graph Service for Clerk-authenticated users
 * Uses backend proxy to call Microsoft Graph API with app-only credentials
 */
class ClerkGraphService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    this.proxyPath = '/api/clerk-proxy/graph';
  }

  /**
   * Get Clerk session token
   */
  async getClerkToken() {
    // This will be called from React components with useAuth hook
    throw new Error('Must call setGetTokenFunction first');
  }

  /**
   * Set the function to get Clerk token (called from React component)
   */
  setGetTokenFunction(getToken) {
    this.getClerkToken = getToken;
  }

  /**
   * Make authenticated request to Graph API via proxy
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const token = await this.getClerkToken();
      if (!token) {
        throw new Error('No Clerk session token available');
      }

      const url = `${this.baseUrl}${this.proxyPath}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error?.message || error.message || 'Request failed');
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Clerk Graph API request failed:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(filter = '', top = 999) {
    let endpoint = `/users?$top=${top}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime`;
    
    if (filter) {
      endpoint += `&$filter=${encodeURIComponent(filter)}`;
    }

    return await this.makeRequest(endpoint);
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    return await this.makeRequest(`/users/${userId}`);
  }

  /**
   * Create user
   */
  async createUser(userData) {
    return await this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId) {
    return await this.makeRequest(`/users/${userId}/memberOf`);
  }

  /**
   * Get all groups
   */
  async getAllGroups() {
    return await this.makeRequest('/groups?$select=id,displayName,mail,groupTypes');
  }

  /**
   * Get managed devices
   */
  async getManagedDevices(top = 999) {
    return await this.makeRequest(`/deviceManagement/managedDevices?$top=${top}&$select=id,deviceName,complianceState,operatingSystem,osVersion,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime`);
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId) {
    return await this.makeRequest(`/deviceManagement/managedDevices/${deviceId}`);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(top = 50) {
    return await this.makeRequest(`/auditLogs/directoryAudits?$top=${top}&$orderby=activityDateTime desc`);
  }

  /**
   * Check proxy health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/clerk-proxy/health`);
      return await response.json();
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return { status: 'error', configured: false, message: error.message };
    }
  }
}

export const clerkGraphService = new ClerkGraphService();

/**
 * React Hook to initialize Clerk Graph Service
 * Call this in your component to enable Graph API access
 */
export const useClerkGraphService = () => {
  const { getToken } = useAuth();

  // Set the token getter function
  React.useEffect(() => {
    clerkGraphService.setGetTokenFunction(async () => {
      return await getToken();
    });
  }, [getToken]);

  return clerkGraphService;
};
