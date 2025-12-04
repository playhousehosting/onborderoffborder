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
    this.betaProxyPath = '/msal-proxy/graph-beta';
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
        
        // Extract the actual error message from various response formats
        const errorMessage = errorData.error?.message || 
                            errorData.message || 
                            errorData.details?.error?.message ||
                            errorText;
        
        // For optional endpoints, 403/404 is expected if permissions aren't granted or resource doesn't exist
        const isOptionalEndpoint = cleanEndpoint.includes('/authentication/') || 
                                   cleanEndpoint.includes('/presence') || 
                                   cleanEndpoint.includes('/auditLogs/') ||
                                   cleanEndpoint.includes('/manager') ||
                                   cleanEndpoint.includes('/appRoleAssignments');
        
        // 403 Forbidden - permission not granted (handle silently for optional endpoints)
        const isPermissionError = response.status === 403;
        
        // 404 Not Found - resource doesn't exist
        const isNotFoundError = response.status === 404;
        
        const isExpectedError = (isPermissionError || isNotFoundError) && isOptionalEndpoint;
        
        // Password reset 403 is expected if app lacks UserAuthenticationMethod.ReadWrite.All permission
        const isPasswordResetPermissionError = response.status === 403 && 
                                               options.method === 'PATCH' &&
                                               cleanEndpoint.match(/^\/users\/[^/]+$/) &&
                                               errorMessage?.includes('Insufficient privileges');
        
        // Group removal 400 errors for mail-enabled security groups and on-prem synced groups
        const isGroupRemovalRestriction = response.status === 400 && 
                                         options.method === 'DELETE' &&
                                         cleanEndpoint.includes('/groups/') &&
                                         cleanEndpoint.includes('/members/') &&
                                         (errorMessage?.includes('mail-enabled security') ||
                                          errorMessage?.includes('distribution list') ||
                                          errorMessage?.includes('on-premises mastered') ||
                                          errorMessage?.includes('Directory Sync'));
        
        // EntitlementGrant and app role assignment errors (Graph API limitations)
        const isAppRoleRemovalError = response.status === 400 && 
                                     options.method === 'DELETE' &&
                                     cleanEndpoint.includes('/appRoleAssignments/') &&
                                     (errorMessage?.includes('EntitlementGrant') ||
                                      errorMessage?.includes('Permission grants') ||
                                      errorMessage?.includes('does not exist') ||
                                      errorMessage?.includes('not present'));
        
        if (isExpectedError || isPasswordResetPermissionError || isGroupRemovalRestriction || isAppRoleRemovalError) {
          // Silently fail for expected errors and return null or throw expected error
          const error = new Error(errorMessage || 'Expected API limitation');
          error.isExpected = true;
          error.statusCode = response.status;
          throw error;
        }
        
        console.error(`❌ Graph request failed (${response.status}):`, errorData);
        
        // Check for OAuth requirement (shouldn't happen with MSAL, but keep for compatibility)
        if (errorData.requiresOAuth) {
          const error = new Error(errorMessage || 'Microsoft authorization required');
          error.requiresOAuth = true;
          throw error;
        }
        
        throw new Error(errorMessage || `Request failed: ${response.status}`);
      }

      // Handle empty responses (204 No Content or empty body)
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
        console.log(`✅ Graph request successful (no content)`);
        return null;
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log(`✅ Graph request successful (empty response)`);
        return null;
      }

      const data = JSON.parse(text);
      console.log(`✅ Graph request successful:`, data);
      return data;
    } catch (error) {
      // Don't log expected errors (marked with isExpected flag)
      if (!error.isExpected) {
        console.error('❌ Graph request error:', error);
      }
      throw error;
    }
  }

  /**
   * Make authenticated request to Graph BETA API via proxy
   * Uses /beta endpoint instead of /v1.0 for features not yet in stable API
   */
  async makeBetaRequest(endpoint, options = {}) {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('No MSAL access token available. Please sign in with Microsoft.');
      }

      // Ensure endpoint starts with / for proper path construction
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${this.baseUrl}${this.betaProxyPath}${cleanEndpoint}`;
      
      console.log(`📡 MSAL Graph BETA request: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
        credentials: 'omit',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        console.error(`❌ Graph BETA request failed (${response.status}):`, errorData);
        throw new Error(errorData.message || `Request failed: ${response.status}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
        console.log(`✅ Graph BETA request successful (no content)`);
        return null;
      }

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.log(`✅ Graph BETA request successful (empty response)`);
        return null;
      }

      const data = JSON.parse(text);
      console.log(`✅ Graph BETA request successful:`, data);
      return data;
    } catch (error) {
      console.error('❌ Graph BETA request error:', error);
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
   * Signature matches graphService.getAllUsers for compatibility
   * @param {string} filter - OData filter string (optional)
   * @param {number} pageSize - Number of users per page (default 100)
   */
  async getAllUsers(filter = '', pageSize = 100) {
    const defaultSelect = 'id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime';
    
    let queryParams = [`$top=${pageSize}`, '$count=true', `$select=${defaultSelect}`];
    if (filter) queryParams.push(`$filter=${encodeURIComponent(filter)}`);
    
    const endpoint = `/users?${queryParams.join('&')}`;
    
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
        // Extract just the Graph API path (remove /v1.0 prefix since proxy adds it)
        const url = new URL(currentUrl);
        let path = url.pathname + url.search;
        // Remove /v1.0 or /beta prefix since the proxy endpoint already includes it
        path = path.replace(/^\/v1\.0/, '').replace(/^\/beta/, '');
        currentUrl = path;
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
    try {
      return await this.makeRequest(`/users/${userId}/manager`);
    } catch (error) {
      // 404 is normal when user has no manager
      if (error.message?.includes('404') || error.message?.includes('does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user's direct reports
   */
  async getUserDirectReports(userId) {
    const response = await this.makeRequest(`/users/${userId}/directReports`);
    return response.value || [];
  }

  /**
   * Get user's groups (including distribution lists and security groups)
   */
  async getUserGroups(userId) {
    try {
      const response = await this.makeRequest(`/users/${userId}/memberOf/microsoft.graph.group?$select=id,displayName,groupTypes,mailEnabled,securityEnabled,mail`);
      const allGroups = response.value || [];
      
      // Filter out dynamic groups (cannot manually remove members)
      const nonDynamicGroups = [];
      for (const group of allGroups) {
        const groupTypes = group.groupTypes || [];
        
        // Skip dynamic membership groups
        if (!groupTypes.includes('DynamicMembership')) {
          nonDynamicGroups.push(group);
        }
      }
      
      return {
        value: nonDynamicGroups,
        total: nonDynamicGroups.length
      };
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
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
   * Get user email activity (last 30 days)
   * Requires Reports.Read.All permission
   */
  async getUserEmailActivity(userId) {
    try {
      // Get email activity for the user over the last 30 days
      // Using the reports endpoint for email activity
      const response = await this.makeRequest(
        `/reports/getEmailActivityUserDetail(period='D30')?$format=application/json`
      );
      
      // Find the specific user's activity
      const userActivity = (response.value || []).find(
        activity => activity.userPrincipalName?.toLowerCase() === userId?.toLowerCase() ||
                   activity.userId === userId
      );
      
      if (userActivity) {
        return {
          lastActivityDate: userActivity.lastActivityDate,
          sendCount: userActivity.sendCount || 0,
          receiveCount: userActivity.receiveCount || 0,
          readCount: userActivity.readCount || 0,
          meetingCreatedCount: userActivity.meetingCreatedCount || 0,
          meetingInteractedCount: userActivity.meetingInteractedCount || 0,
        };
      }
      
      // If no activity found in reports, try to get from mailbox
      return null;
    } catch (error) {
      // Reports API might not be available, try alternative approach
      console.warn('Reports API not available, trying alternative method:', error.message);
      
      try {
        // Alternative: Get last message received in mailbox
        const messages = await this.makeRequest(
          `/users/${userId}/messages?$top=1&$orderby=receivedDateTime desc&$select=receivedDateTime,from`
        );
        
        const lastReceived = messages.value?.[0]?.receivedDateTime;
        
        // Get sent items
        const sentMessages = await this.makeRequest(
          `/users/${userId}/mailFolders/sentItems/messages?$top=1&$orderby=sentDateTime desc&$select=sentDateTime`
        );
        
        const lastSent = sentMessages.value?.[0]?.sentDateTime;
        
        // Determine last activity date
        let lastActivityDate = null;
        if (lastReceived && lastSent) {
          lastActivityDate = new Date(lastReceived) > new Date(lastSent) ? lastReceived : lastSent;
        } else {
          lastActivityDate = lastReceived || lastSent;
        }
        
        return {
          lastActivityDate,
          sendCount: sentMessages.value?.length || 0,
          receiveCount: messages.value?.length || 0,
          readCount: 0,
        };
      } catch (altError) {
        console.warn('Alternative method also failed:', altError.message);
        return null;
      }
    }
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
   * Create a new group (distribution or security)
   */
  async createGroup(groupData) {
    return await this.makeRequest('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  /**
   * Update group properties
   */
  async updateGroup(groupId, updates) {
    return await this.makeRequest(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId) {
    return await this.makeRequest(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search groups
   */
  async searchGroups(searchTerm, options = {}) {
    const { groupTypes = [], top = 25 } = options;
    let filters = [];
    
    // Search by display name or mail
    const searchFilter = `(startswith(displayName,'${searchTerm}') or startswith(mail,'${searchTerm}'))`;
    
    // Filter by group types if specified
    if (groupTypes.length > 0) {
      const typeFilters = groupTypes.map(type => {
        if (type === 'distribution') {
          return "mailEnabled eq true and securityEnabled eq false";
        } else if (type === 'security') {
          return "securityEnabled eq true";
        } else if (type === 'microsoft365') {
          return "groupTypes/any(c:c eq 'Unified')";
        }
        return null;
      }).filter(f => f);
      
      if (typeFilters.length > 0) {
        filters.push(`(${typeFilters.join(' or ')})`);
      }
    }
    
    filters.push(searchFilter);
    
    const filterString = filters.join(' and ');
    const endpoint = `/groups?$filter=${encodeURIComponent(filterString)}&$top=${top}&$count=true`;
    
    return await this.makeRequest(endpoint);
  }

  /**
   * Get group owners
   */
  async getGroupOwners(groupId) {
    const response = await this.makeRequest(`/groups/${groupId}/owners`);
    return response.value || [];
  }

  /**
   * Add group owner
   */
  async addGroupOwner(groupId, userId) {
    return await this.makeRequest(`/groups/${groupId}/owners/$ref`, {
      method: 'POST',
      body: JSON.stringify({
        '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`,
      }),
    });
  }

  /**
   * Remove group owner
   */
  async removeGroupOwner(groupId, userId) {
    return await this.makeRequest(`/groups/${groupId}/owners/${userId}/$ref`, {
      method: 'DELETE',
    });
  }

  /**
   * Get distribution group settings
   */
  async getDistributionGroupSettings(groupId) {
    try {
      // Get group with all properties
      const group = await this.getGroup(groupId);
      
      // Get members and owners
      const [members, owners] = await Promise.all([
        this.getGroupMembers(groupId),
        this.getGroupOwners(groupId),
      ]);
      
      return {
        ...group,
        membersCount: members.length,
        ownersCount: owners.length,
        members,
        owners,
      };
    } catch (error) {
      console.error('Error getting distribution group settings:', error);
      throw error;
    }
  }

  /**
   * Get organization verified domains
   */
  async getOrganizationDomains() {
    try {
      const response = await this.makeRequest('/domains');
      const domains = response.value || [];
      
      // Filter to verified domains only and extract domain names
      return domains
        .filter(domain => domain.isVerified)
        .map(domain => ({
          id: domain.id,
          name: domain.id,
          isDefault: domain.isDefault || false,
          isInitial: domain.isInitial || false,
        }))
        .sort((a, b) => {
          // Sort: default first, then initial, then alphabetically
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          if (a.isInitial) return -1;
          if (b.isInitial) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      console.error('Error getting organization domains:', error);
      throw error;
    }
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
   * Note: Requires AppRoleAssignment.ReadWrite.All permission
   */
  async removeUserFromEnterpriseApp(userId, appRoleAssignmentId) {
    try {
      return await this.makeRequest(`/users/${userId}/appRoleAssignments/${appRoleAssignmentId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Handle common errors gracefully
      if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
        console.warn(`⚠️ Could not remove app role assignment ${appRoleAssignmentId} - may already be removed or invalid`);
        return { success: false, skipped: true, reason: 'Assignment may already be removed or is invalid' };
      }
      // Handle 403 Forbidden - missing permissions
      if (error.isExpected || error.isPermissionError || 
          error.message?.includes('403') || error.message?.includes('Authorization') || error.message?.includes('Forbidden')) {
        console.warn(`⚠️ Missing permission to remove app role assignment. Required: AppRoleAssignment.ReadWrite.All`);
        return { success: false, skipped: true, reason: 'Missing permission: AppRoleAssignment.ReadWrite.All' };
      }
      throw error;
    }
  }

  /**
   * Get user's authentication methods
   * Note: Requires UserAuthenticationMethod.Read.All or UserAuthenticationMethod.ReadWrite.All permission
   */
  async getUserAuthenticationMethods(userId) {
    const methods = [];

    const methodTypes = [
      { type: 'phone', endpoint: 'phoneMethods', labelFn: m => `Phone: ${m.phoneNumber || 'Unknown'}` },
      { type: 'email', endpoint: 'emailMethods', labelFn: m => `Email: ${m.emailAddress || 'Unknown'}` },
      { type: 'fido2', endpoint: 'fido2Methods', labelFn: m => `FIDO2 Key: ${m.displayName || m.model || 'Unknown'}` },
      { type: 'microsoftAuthenticator', endpoint: 'microsoftAuthenticatorMethods', labelFn: m => `Microsoft Authenticator: ${m.displayName || m.phoneAppVersion || 'Unknown'}` },
      { type: 'windowsHelloForBusiness', endpoint: 'windowsHelloForBusinessMethods', labelFn: m => `Windows Hello: ${m.displayName || 'Unknown'}` },
    ];

    let permissionDenied = false;

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
        // Handle 403 Forbidden - missing permissions
        if (error.message?.includes('403') || error.message?.includes('Authorization') || error.message?.includes('Forbidden')) {
          if (!permissionDenied) {
            console.warn(`⚠️ Missing permission to read authentication methods. Required: UserAuthenticationMethod.Read.All`);
            permissionDenied = true;
          }
          // Continue to try other method types - some might work
          continue;
        }
        // For other errors, log but continue
        console.warn(`⚠️ Could not fetch ${methodType.type} methods:`, error.message);
      }
    }

    return {
      value: methods,
      total: methods.length,
      permissionDenied,
      message: permissionDenied ? 'Some authentication methods could not be retrieved due to missing permissions' : null
    };
  }

  /**
   * Remove authentication method
   * Note: Requires UserAuthenticationMethod.ReadWrite.All permission
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

    try {
      return await this.makeRequest(`/users/${userId}/authentication/${endpoint}/${methodId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Handle 403 Forbidden - missing permissions
      if (error.isExpected || error.isPermissionError || 
          error.message?.includes('403') || error.message?.includes('Authorization') || error.message?.includes('Forbidden')) {
        console.warn(`⚠️ Missing permission to remove ${methodType} authentication method. Required: UserAuthenticationMethod.ReadWrite.All`);
        return { success: false, skipped: true, reason: 'Missing permission: UserAuthenticationMethod.ReadWrite.All' };
      }
      throw error;
    }
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
   * Get user sign-in logs
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back (default 7)
   * @returns {Promise} Sign-in logs
   */
  async getUserSignInLogs(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const filter = `userId eq '${userId}' and createdDateTime ge ${startDate.toISOString()}`;
      
      return await this.makeRequest(`/auditLogs/signIns?$filter=${encodeURIComponent(filter)}&$top=50&$orderby=createdDateTime desc`);
    } catch (error) {
      // Silently return empty array - requires AuditLog.Read.All permission
      return { value: [] };
    }
  }

  /**
   * Get user presence information
   * @param {string} userId - User ID
   * @returns {Promise} User presence
   */
  async getUserPresence(userId) {
    try {
      return await this.makeRequest(`/users/${userId}/presence`);
    } catch (error) {
      // Silently return null - requires Presence.Read.All permission
      return null;
    }
  }

  /**
   * Get user's registered devices
   * @param {string} userId - User ID
   * @returns {Promise} Registered devices
   */
  async getUserRegisteredDevices(userId) {
    try {
      return await this.makeRequest(`/users/${userId}/registeredDevices`);
    } catch (error) {
      console.warn('Registered devices not available:', error);
      return { value: [] };
    }
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
