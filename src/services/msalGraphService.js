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
   * Get all users with automatic pagination (fetches all pages)
   */
  async getAllUsers(options = {}) {
    const { top = 999, filter, select, fetchAll = true } = options;
    
    let queryParams = [`$top=${top}`, '$count=true'];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/users?${queryParams.join('&')}`;
    
    if (!fetchAll) {
      return await this.makeRequest(endpoint);
    }
    
    // Fetch all pages automatically
    return await this.getAllWithPagination(endpoint);
  }

  /**
   * Generic method to fetch all pages from a paginated endpoint
   */
  async getAllWithPagination(endpoint) {
    let allResults = [];
    let currentUrl = endpoint;
    let totalCount = null;
    let pageCount = 0;
    
    while (currentUrl) {
      pageCount++;
      const response = await this.makeRequest(currentUrl);
      
      // Store total count from first response
      if (totalCount === null && response['@odata.count'] !== undefined) {
        totalCount = response['@odata.count'];
        console.log(`📊 Total records available: ${totalCount}, fetching all pages...`);
      }
      
      // Accumulate results
      if (response.value && Array.isArray(response.value)) {
        allResults = allResults.concat(response.value);
        console.log(`📄 Page ${pageCount}: Fetched ${response.value.length} records (total so far: ${allResults.length})`);
      }
      
      // Check for next page
      currentUrl = response['@odata.nextLink'];
      if (currentUrl) {
        // Extract just the path and query from the full URL
        const url = new URL(currentUrl);
        currentUrl = url.pathname + url.search;
      }
    }
    
    console.log(`✅ Pagination complete: ${allResults.length} total records fetched in ${pageCount} page(s)`);
    
    // Return in same format as single-page response
    return {
      value: allResults,
      '@odata.count': totalCount !== null ? totalCount : allResults.length,
    };
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
   * Get all groups with automatic pagination (fetches all pages)
   */
  async getAllGroups(options = {}) {
    const { top = 999, filter, select, fetchAll = true } = options;
    
    let queryParams = [`$top=${top}`, '$count=true'];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/groups?${queryParams.join('&')}`;
    
    if (!fetchAll) {
      return await this.makeRequest(endpoint);
    }
    
    // Fetch all pages automatically
    return await this.getAllWithPagination(endpoint);
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
   * Get all devices with automatic pagination (fetches all pages)
   * (requires DeviceManagementManagedDevices.ReadWrite.All)
   */
  async getAllDevices(options = {}) {
    const { top = 999, filter, select, fetchAll = true } = options;
    
    let queryParams = [`$top=${top}`, '$count=true'];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    if (select) queryParams.push(`$select=${select}`);
    
    const endpoint = `/deviceManagement/managedDevices?${queryParams.join('&')}`;
    
    if (!fetchAll) {
      return await this.makeRequest(endpoint);
    }
    
    // Fetch all pages automatically
    return await this.getAllWithPagination(endpoint);
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
   * Remove all licenses from user
   */
  async removeAllLicenses(userId) {
    try {
      const user = await this.makeRequest(`/users/${userId}?$select=id,assignedLicenses`);
      const assignedLicenses = user.assignedLicenses || [];
      
      if (assignedLicenses.length === 0) {
        return { success: true, removedCount: 0 };
      }

      const skuIds = assignedLicenses.map(license => license.skuId);

      await this.makeRequest(`/users/${userId}/assignLicense`, {
        method: 'POST',
        body: JSON.stringify({
          addLicenses: [],
          removeLicenses: skuIds,
        }),
      });

      return { success: true, removedCount: skuIds.length };
    } catch (error) {
      console.error('Error removing all licenses:', error);
      throw new Error(`Failed to remove licenses: ${error.message}`);
    }
  }

  /**
   * Search users
   */
  async searchUsers(searchTerm) {
    const filter = `startswith(displayName,'${searchTerm}') or startswith(userPrincipalName,'${searchTerm}') or startswith(mail,'${searchTerm}')`;
    const response = await this.makeRequest(`/users?$filter=${filter}&$top=25&$select=id,displayName,userPrincipalName,mail,jobTitle,department`);
    return response;
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId, newPassword, forceChangePasswordNextSignIn = false) {
    return await this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        passwordProfile: {
          password: newPassword,
          forceChangePasswordNextSignIn,
        },
      }),
    });
  }

  /**
   * Revoke all user sign-in sessions
   */
  async revokeUserSessions(userId) {
    return await this.makeRequest(`/users/${userId}/revokeSignInSessions`, {
      method: 'POST',
    });
  }

  /**
   * Set auto-reply message
   */
  async setAutoReply(userId, isEnabled, externalAudience, internalReply, externalReply) {
    return await this.makeRequest(`/users/${userId}/mailboxSettings`, {
      method: 'PATCH',
      body: JSON.stringify({
        automaticRepliesSetting: {
          status: isEnabled ? 'AlwaysEnabled' : 'Disabled',
          externalAudience: externalAudience || 'All',
          internalReply: internalReply || '',
          externalReply: externalReply || '',
        },
      }),
    });
  }

  /**
   * Set mail forwarding
   */
  async setMailForwarding(userId, forwardingAddress, deliverToMailboxAndForward) {
    return await this.makeRequest(`/users/${userId}/mailboxSettings`, {
      method: 'PATCH',
      body: JSON.stringify({
        forwardingAddress: forwardingAddress,
        deliverToMailboxAndForwardingAddress: deliverToMailboxAndForward || false,
      }),
    });
  }

  /**
   * Convert to shared mailbox (NOT supported via Graph API - returns instructions)
   */
  async convertToSharedMailbox(userId) {
    const user = await this.makeRequest(`/users/${userId}?$select=id,userPrincipalName,mail`);
    const email = user.mail || user.userPrincipalName;
    
    throw new Error(
      `Converting to shared mailbox is not supported via Microsoft Graph API. ` +
      `Please use Exchange Online PowerShell:\n` +
      `Connect-ExchangeOnline\n` +
      `Set-Mailbox -Identity "${email}" -Type Shared\n` +
      `Or use Exchange Admin Center: https://admin.exchange.microsoft.com`
    );
  }

  /**
   * Get user's Teams
   */
  async getUserTeams(userId) {
    try {
      const response = await this.makeRequest(`/users/${userId}/joinedTeams?$select=id,displayName,description`);
      const allTeams = response.value || [];
      
      const nonDynamicTeams = [];
      for (const team of allTeams) {
        try {
          const groupInfo = await this.makeRequest(`/groups/${team.id}?$select=id,displayName,groupTypes`);
          const groupTypes = groupInfo.groupTypes || [];
          
          if (!groupTypes.includes('DynamicMembership')) {
            nonDynamicTeams.push(team);
          }
        } catch (error) {
          console.warn(`Could not check dynamic status for team ${team.displayName}:`, error);
          nonDynamicTeams.push(team);
        }
      }
      
      return {
        value: nonDynamicTeams,
        total: nonDynamicTeams.length
      };
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw error;
    }
  }

  /**
   * Remove user from Team
   */
  async removeUserFromTeam(teamId, userId) {
    return await this.makeRequest(`/groups/${teamId}/members/${userId}/$ref`, {
      method: 'DELETE',
    });
  }

  /**
   * Get user's app role assignments
   */
  async getUserAppRoleAssignments(userId) {
    try {
      const result = await this.makeRequest(`/users/${userId}/appRoleAssignments`);
      
      if (!result || !result.value) {
        return { value: [], total: 0 };
      }

      const enrichedAssignments = await Promise.all(
        result.value.map(async (assignment) => {
          try {
            const servicePrincipal = await this.makeRequest(
              `/servicePrincipals/${assignment.resourceId}?$select=id,displayName,appId`
            );
            return {
              ...assignment,
              appDisplayName: servicePrincipal.displayName,
              appId: servicePrincipal.appId
            };
          } catch (error) {
            console.warn(`Could not fetch details for service principal ${assignment.resourceId}:`, error);
            return {
              ...assignment,
              appDisplayName: 'Unknown Application',
              appId: assignment.resourceId
            };
          }
        })
      );

      return {
        value: enrichedAssignments,
        total: enrichedAssignments.length
      };
    } catch (error) {
      console.error('Error fetching user app role assignments:', error);
      throw error;
    }
  }

  /**
   * Remove user from enterprise app
   */
  async removeUserFromEnterpriseApp(userId, appRoleAssignmentId) {
    return await this.makeRequest(`/users/${userId}/appRoleAssignments/${appRoleAssignmentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get user's authentication methods
   */
  async getUserAuthenticationMethods(userId) {
    try {
      const methods = [];

      const methodTypes = [
        { type: 'phone', endpoint: 'phoneMethods', labelFn: m => `Phone: ${m.phoneNumber || 'Unknown'}` },
        { type: 'email', endpoint: 'emailMethods', labelFn: m => `Email: ${m.emailAddress || 'Unknown'}` },
        { type: 'fido2', endpoint: 'fido2Methods', labelFn: m => `FIDO2 Key: ${m.displayName || m.model || 'Unknown'}` },
        { type: 'microsoftAuthenticator', endpoint: 'microsoftAuthenticatorMethods', labelFn: m => `Microsoft Authenticator: ${m.displayName || m.phoneAppVersion || 'Unknown'}` },
        { type: 'windowsHelloForBusiness', endpoint: 'windowsHelloForBusinessMethods', labelFn: m => `Windows Hello: ${m.displayName || 'Unknown'}` },
      ];

      for (const methodType of methodTypes) {
        try {
          const data = await this.makeRequest(`/users/${userId}/authentication/${methodType.endpoint}`);
          if (data && data.value) {
            methods.push(...data.value.map(method => ({
              ...method,
              methodType: methodType.type,
              displayName: methodType.labelFn(method)
            })));
          }
        } catch (error) {
          console.warn(`Could not fetch ${methodType.type} methods:`, error);
        }
      }

      return {
        value: methods,
        total: methods.length
      };
    } catch (error) {
      console.error('Error fetching user authentication methods:', error);
      throw error;
    }
  }

  /**
   * Remove authentication method
   */
  async removeAuthenticationMethod(userId, methodId, methodType) {
    const endpoints = {
      phone: `phoneMethods`,
      email: `emailMethods`,
      fido2: `fido2Methods`,
      microsoftAuthenticator: `microsoftAuthenticatorMethods`,
      windowsHelloForBusiness: `windowsHelloForBusinessMethods`,
    };

    const endpoint = endpoints[methodType];
    if (!endpoint) {
      throw new Error(`Unsupported authentication method type: ${methodType}`);
    }

    return await this.makeRequest(`/users/${userId}/authentication/${endpoint}/${methodId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userPrincipalName) {
    const response = await this.makeRequest(`/deviceManagement/managedDevices?$filter=userPrincipalName eq '${userPrincipalName}'&$select=id,deviceName,manufacturer,model,operatingSystem,osVersion,complianceState,lastSyncDateTime`);
    return response;
  }

  /**
   * Backup user data (placeholder - returns success)
   */
  async backupUserData(userId) {
    return {
      success: true,
      message: 'Backup process initiated',
      backupId: `backup_${userId}_${Date.now()}`,
    };
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
