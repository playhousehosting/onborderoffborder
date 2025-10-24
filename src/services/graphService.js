import { authService } from './authService';
import { isDemoMode } from '../config/authConfig';

// Mock data for demo mode
const MOCK_USERS = [
  {
    id: '1',
    displayName: 'John Doe',
    userPrincipalName: 'john.doe@demo.com',
    mail: 'john.doe@demo.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    accountEnabled: true,
    createdDateTime: '2024-01-15T00:00:00Z',
    lastPasswordChangeDateTime: '2024-10-01T00:00:00Z',
    officeLocation: 'Building 1',
    companyName: 'Demo Company',
    mobilePhone: '+1 555-0101',
    businessPhones: ['+1 555-0100'],
  },
  {
    id: '2',
    displayName: 'Jane Smith',
    userPrincipalName: 'jane.smith@demo.com',
    mail: 'jane.smith@demo.com',
    jobTitle: 'Product Manager',
    department: 'Product',
    accountEnabled: true,
    createdDateTime: '2024-02-20T00:00:00Z',
    lastPasswordChangeDateTime: '2024-09-15T00:00:00Z',
    officeLocation: 'Building 2',
    companyName: 'Demo Company',
    mobilePhone: '+1 555-0102',
    businessPhones: ['+1 555-0103'],
  },
  {
    id: '3',
    displayName: 'Bob Johnson',
    userPrincipalName: 'bob.johnson@demo.com',
    mail: 'bob.johnson@demo.com',
    jobTitle: 'Designer',
    department: 'Design',
    accountEnabled: false,
    createdDateTime: '2024-03-10T00:00:00Z',
    lastPasswordChangeDateTime: '2024-08-20T00:00:00Z',
    officeLocation: 'Building 1',
    companyName: 'Demo Company',
    mobilePhone: '+1 555-0104',
    businessPhones: ['+1 555-0105'],
  },
  {
    id: '4',
    displayName: 'Alice Brown',
    userPrincipalName: 'alice.brown@demo.com',
    mail: 'alice.brown@demo.com',
    jobTitle: 'Marketing Manager',
    department: 'Marketing',
    accountEnabled: true,
    createdDateTime: '2024-04-05T00:00:00Z',
    lastPasswordChangeDateTime: '2024-10-10T00:00:00Z',
    officeLocation: 'Building 2',
    companyName: 'Demo Company',
    mobilePhone: '+1 555-0106',
    businessPhones: ['+1 555-0107'],
  },
];

const MOCK_DEVICES = [
  {
    id: 'device-1',
    deviceName: 'LAPTOP-001',
    operatingSystem: 'Windows 11',
    osVersion: '10.0.22000.1',
    complianceState: 'compliant',
    lastSyncDateTime: new Date().toISOString(),
    userPrincipalName: 'john.doe@demo.com',
  },
  {
    id: 'device-2',
    deviceName: 'LAPTOP-002',
    operatingSystem: 'macOS',
    osVersion: '13.0',
    complianceState: 'compliant',
    lastSyncDateTime: new Date().toISOString(),
    userPrincipalName: 'jane.smith@demo.com',
  },
];

export class GraphService {
  constructor() {
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.maxRetries = 3;
  }

  /**
   * Categorize and handle Graph API errors with actionable information
   * @param {Error} error - The error object
   * @param {string} operation - Description of the operation that failed
   * @returns {Object} Structured error information
   */
  handleGraphError(error, operation = 'operation') {
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('429')) {
      return { 
        type: 'throttling', 
        message: 'Too many requests. The request will be retried automatically.',
        retryable: true,
        statusCode: 429
      };
    }
    if (errorMessage.includes('401')) {
      return { 
        type: 'authentication', 
        message: 'Authentication failed. Please sign in again.',
        retryable: false,
        statusCode: 401
      };
    }
    if (errorMessage.includes('403')) {
      return { 
        type: 'permission', 
        message: 'You do not have permission to perform this operation. Please contact your administrator.',
        retryable: false,
        statusCode: 403
      };
    }
    if (errorMessage.includes('404')) {
      return { 
        type: 'not_found', 
        message: 'The requested resource was not found.',
        retryable: false,
        statusCode: 404
      };
    }
    if (errorMessage.includes('500') || errorMessage.includes('503')) {
      return { 
        type: 'server_error', 
        message: 'The server is experiencing issues. Please try again in a moment.',
        retryable: true,
        statusCode: parseInt(errorMessage.match(/\d{3}/)?.[0]) || 500
      };
    }
    if (errorMessage.includes('400')) {
      return { 
        type: 'bad_request', 
        message: 'Invalid request. Please check your input and try again.',
        retryable: false,
        statusCode: 400
      };
    }
    
    return { 
      type: 'unknown', 
      message: `Failed to ${operation}. Please try again.`,
      retryable: true,
      statusCode: 0,
      originalError: errorMessage
    };
  }

  /**
   * Generic method to make Graph API calls with retry logic and throttling handling
   * @param {string} endpoint - The API endpoint (e.g., '/users')
   * @param {Object} options - Fetch options
   * @param {number} retryCount - Current retry attempt (internal use)
   * @returns {Promise} API response
   */
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    // Return mock data in demo mode
    if (isDemoMode()) {
      return this._getMockData(endpoint, options);
    }

    try {
      const token = await authService.getAccessToken();
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultOptions = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      
      // Handle throttling (429 Too Many Requests)
      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.warn(`Request throttled. Retrying after ${retryAfter} seconds... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        
        // Wait for the specified retry period
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        
        // Retry the request
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      // Handle server errors with exponential backoff
      if ((response.status === 500 || response.status === 503) && retryCount < this.maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        console.warn(`Server error (${response.status}). Retrying after ${backoffDelay}ms... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: { message: response.statusText } };
        }
        const error = new Error(`Graph API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        error.statusCode = response.status;
        error.errorData = errorData;
        throw error;
      }
      
      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return { success: true };
      }
      
      return await response.json();
    } catch (error) {
      const structuredError = this.handleGraphError(error, 'complete the request');
      console.error('Graph API request error:', {
        endpoint,
        error: structuredError,
        retryCount,
        originalError: error
      });
      
      // Attach structured error info to the error object
      error.graphError = structuredError;
      throw error;
    }
  }

  // Mock data handler for demo mode
  _getMockData(endpoint, options = {}) {
    console.log('Demo mode: returning mock data for', endpoint);
    
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        // Handle different endpoints
        if (endpoint.includes('/users')) {
          if (endpoint.includes('/users/') && !endpoint.includes('/memberOf')) {
            // Single user request
            const userId = endpoint.split('/users/')[1].split('?')[0];
            const user = MOCK_USERS.find(u => u.id === userId) || MOCK_USERS[0];
            resolve(user);
          } else {
            // User list request
            resolve({ value: MOCK_USERS });
          }
        } else if (endpoint.includes('/deviceManagement/managedDevices')) {
          resolve({ value: MOCK_DEVICES });
        } else if (endpoint.includes('/memberOf')) {
          // Mock groups
          resolve({ value: [] });
        } else if (endpoint.includes('/mailboxSettings')) {
          resolve({
            automaticRepliesSetting: {
              status: 'disabled',
            },
          });
        } else {
          // Default empty response
          resolve({ value: [] });
        }
      }, 300); // Simulate network delay
    });
  }

  // User Management Methods
  
  /**
   * Get users with pagination support
   * Note: Microsoft Graph API doesn't support $skip for users endpoint
   * Use $top for page size and @odata.nextLink for pagination
   * @param {number} top - Number of users per page
   * @param {string} filter - OData filter string
   * @param {string} nextLink - Optional next page URL from previous response
   * @returns {Promise} Response with value array and optional @odata.nextLink
   */
  async getUsers(top = 25, filter = '', nextLink = null) {
    let endpoint;
    
    if (nextLink) {
      // Use the nextLink URL directly (remove base URL if present)
      endpoint = nextLink.replace(this.baseUrl, '');
    } else {
      // Build initial query
      endpoint = `/users?$top=${top}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime`;
      
      if (filter) {
        endpoint += `&$filter=${filter}`;
      }
    }
    
    return this.makeRequest(endpoint);
  }

  /**
   * Get all users by following @odata.nextLink pagination
   * @param {string} filter - Optional OData filter string
   * @param {number} pageSize - Number of users per page (default: 100)
   * @returns {Promise<Array>} All users matching the filter
   */
  async getAllUsers(filter = '', pageSize = 100) {
    const users = [];
    let endpoint = `/users?$top=${pageSize}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime`;
    
    if (filter) {
      endpoint += `&$filter=${filter}`;
    }
    
    // Follow pagination links
    while (endpoint) {
      const response = await this.makeRequest(endpoint.replace(this.baseUrl, ''));
      
      if (response.value) {
        users.push(...response.value);
      }
      
      // Check for next page
      endpoint = response['@odata.nextLink'] || null;
      
      // Log progress for large datasets
      if (endpoint) {
        console.log(`Fetched ${users.length} users, loading more...`);
      }
    }
    
    console.log(`Total users fetched: ${users.length}`);
    return { value: users, totalCount: users.length };
  }

  /**
   * Get paginated users with explicit nextLink handling
   * @param {string} nextLink - The @odata.nextLink from previous response, or null for first page
   * @param {number} pageSize - Number of users per page
   * @param {string} filter - Optional OData filter string
   * @returns {Promise} Response with value array and @odata.nextLink
   */
  async getUsersPage(nextLink = null, pageSize = 25, filter = '') {
    if (nextLink) {
      // Use the full nextLink URL
      return this.makeRequest(nextLink.replace(this.baseUrl, ''));
    } else {
      // First page
      let endpoint = `/users?$top=${pageSize}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime`;
      
      if (filter) {
        endpoint += `&$filter=${filter}`;
      }
      
      return this.makeRequest(endpoint);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    return this.makeRequest(`/users/${userId}?$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime,officeLocation,companyName,mobilePhone,businessPhones`);
  }

  /**
   * Get user changes using delta query for efficient synchronization
   * Use this to track changes instead of repeatedly fetching all users
   * @param {string} deltaLink - The @odata.deltaLink from previous response, or null for initial sync
   * @returns {Promise} Response with changes and new deltaLink
   */
  async getUsersDelta(deltaLink = null) {
    if (isDemoMode()) {
      return { 
        value: MOCK_USERS, 
        '@odata.deltaLink': '/users/delta?$deltatoken=demo-delta-token'
      };
    }

    const endpoint = deltaLink 
      ? deltaLink.replace(this.baseUrl, '')
      : '/users/delta?$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime';
    
    return this.makeRequest(endpoint);
  }

  /**
   * Execute multiple Graph API requests in a single batch
   * Combines up to 20 requests into one HTTP call for better performance
   * @param {Array} requests - Array of request objects with id, method, url, headers, body
   * @returns {Promise} Response with array of individual responses
   * 
   * Example request format:
   * {
   *   id: '1',
   *   method: 'PATCH',
   *   url: '/users/userId',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: { jobTitle: 'Manager' }
   * }
   */
  async batchRequest(requests) {
    if (isDemoMode()) {
      console.log('Demo mode: simulating batch request with', requests.length, 'operations');
      // Simulate successful batch responses in demo mode
      return { 
        responses: requests.map((req, i) => ({ 
          id: req.id, 
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { success: true, id: req.id }
        }))
      };
    }

    // Validate batch size (Microsoft Graph limit is 20)
    if (requests.length > 20) {
      console.warn(`Batch request has ${requests.length} requests, but limit is 20. Splitting into multiple batches...`);
      
      // Split into chunks of 20
      const batches = [];
      for (let i = 0; i < requests.length; i += 20) {
        batches.push(requests.slice(i, i + 20));
      }
      
      // Execute batches sequentially
      const allResponses = [];
      for (const batch of batches) {
        const response = await this.batchRequest(batch);
        allResponses.push(...response.responses);
      }
      
      return { responses: allResponses };
    }

    const batchBody = {
      requests: requests.map(req => ({
        id: req.id.toString(),
        method: req.method || 'GET',
        url: (req.url || '').replace(this.baseUrl, '').replace('https://graph.microsoft.com/v1.0', ''),
        headers: req.headers || {},
        body: req.body || undefined
      }))
    };

    const response = await this.makeRequest('/$batch', {
      method: 'POST',
      body: JSON.stringify(batchBody)
    });

    // Check for failed requests and log warnings
    const failedRequests = response.responses?.filter(r => r.status >= 400) || [];
    if (failedRequests.length > 0) {
      console.warn(`Batch request completed with ${failedRequests.length} failed operations:`, 
        failedRequests.map(r => ({ id: r.id, status: r.status, error: r.body?.error?.message }))
      );
    }

    return response;
  }

  async searchUsers(searchTerm) {
    const filter = `startswith(displayName,'${searchTerm}') or startswith(userPrincipalName,'${searchTerm}') or startswith(mail,'${searchTerm}')`;
    return this.makeRequest(`/users?$filter=${filter}&$top=25&$select=id,displayName,userPrincipalName,mail,jobTitle,department`);
  }

  async updateUser(userId, updateData) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async disableUser(userId) {
    return this.updateUser(userId, { accountEnabled: false });
  }

  async enableUser(userId) {
    return this.updateUser(userId, { accountEnabled: true });
  }

  /**
   * Reset user password (for admin-initiated password reset during offboarding)
   * Uses PATCH /users/{id} with passwordProfile per Microsoft Graph API best practices
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @param {boolean} forceChangePasswordNextSignIn - Force password change on next sign-in
   * @returns {Promise} Response
   */
  async resetUserPassword(userId, newPassword, forceChangePasswordNextSignIn = false) {
    // In demo mode, just return success
    if (isDemoMode()) {
      return Promise.resolve({ success: true });
    }

    return this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        passwordProfile: {
          password: newPassword,
          forceChangePasswordNextSignIn: forceChangePasswordNextSignIn,
        },
      }),
    });
  }

  async setUserPassword(userId, newPassword, forceChangePasswordNextSignIn = true) {
    // Alias for resetUserPassword with default forceChange = true
    return this.resetUserPassword(userId, newPassword, forceChangePasswordNextSignIn);
  }

  async sendWelcomeEmail(userId, welcomeMessage, managerEmail) {
    // In demo mode, just return success
    if (isDemoMode()) {
      return Promise.resolve({ success: true });
    }

    // Get user details for the email
    const user = await this.getUserById(userId);
    
    const emailBody = {
      message: {
        subject: 'Welcome to the Team!',
        body: {
          contentType: 'HTML',
          content: `
            <html>
              <body>
                <h2>Welcome ${user.displayName}!</h2>
                <p>${welcomeMessage}</p>
                <p>Your account has been set up and is ready to use.</p>
                <p>If you have any questions, please don't hesitate to reach out${managerEmail ? ` to your manager at ${managerEmail}` : ''}.</p>
                <br/>
                <p>Best regards,<br/>The Team</p>
              </body>
            </html>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: user.mail || user.userPrincipalName,
            },
          },
        ],
      },
    };

    return this.makeRequest(`/users/${userId}/sendMail`, {
      method: 'POST',
      body: JSON.stringify(emailBody),
    });
  }

  async deleteUser(userId) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUserManager(userId, managerEmail) {
    // In demo mode, just return success
    if (isDemoMode()) {
      return Promise.resolve({ success: true });
    }

    // First, search for the manager by email
    const managerResults = await this.searchUsers(managerEmail);
    if (!managerResults.value || managerResults.value.length === 0) {
      throw new Error('Manager not found');
    }

    const managerId = managerResults.value[0].id;

    return this.makeRequest(`/users/${userId}/manager/$ref`, {
      method: 'PUT',
      body: JSON.stringify({
        "@odata.id": `https://graph.microsoft.com/v1.0/users/${managerId}`
      }),
    });
  }

  async sendTransferNotification(userId, transferOptions, recipientType) {
    // In demo mode, just return success
    if (isDemoMode()) {
      return Promise.resolve({ success: true });
    }

    const user = await this.getUserById(userId);
    
    let subject, content;
    if (recipientType === 'user') {
      subject = 'Your Role Transfer/Promotion';
      content = `
        <html>
          <body>
            <h2>Congratulations ${user.displayName}!</h2>
            <p>We're excited to inform you about your upcoming role change.</p>
            <h3>New Position Details:</h3>
            <ul>
              ${transferOptions.newDepartment ? `<li><strong>Department:</strong> ${transferOptions.newDepartment}</li>` : ''}
              ${transferOptions.newJobTitle ? `<li><strong>Job Title:</strong> ${transferOptions.newJobTitle}</li>` : ''}
              ${transferOptions.newOfficeLocation ? `<li><strong>Location:</strong> ${transferOptions.newOfficeLocation}</li>` : ''}
              ${transferOptions.effectiveDate ? `<li><strong>Effective Date:</strong> ${new Date(transferOptions.effectiveDate).toLocaleDateString()}</li>` : ''}
            </ul>
            ${transferOptions.transferNotes ? `<p><strong>Notes:</strong> ${transferOptions.transferNotes}</p>` : ''}
            <p>If you have any questions, please reach out to your manager or HR.</p>
            <br/>
            <p>Best regards,<br/>Human Resources</p>
          </body>
        </html>
      `;
    } else {
      subject = 'New Team Member Transfer Notification';
      content = `
        <html>
          <body>
            <h2>New Team Member</h2>
            <p>${user.displayName} will be joining your team.</p>
            <h3>Transfer Details:</h3>
            <ul>
              ${transferOptions.newDepartment ? `<li><strong>Department:</strong> ${transferOptions.newDepartment}</li>` : ''}
              ${transferOptions.newJobTitle ? `<li><strong>Job Title:</strong> ${transferOptions.newJobTitle}</li>` : ''}
              ${transferOptions.effectiveDate ? `<li><strong>Start Date:</strong> ${new Date(transferOptions.effectiveDate).toLocaleDateString()}</li>` : ''}
            </ul>
            ${transferOptions.transferNotes ? `<p><strong>Notes:</strong> ${transferOptions.transferNotes}</p>` : ''}
            <p>Please ensure ${user.displayName} has the necessary access and resources.</p>
            <br/>
            <p>Best regards,<br/>Human Resources</p>
          </body>
        </html>
      `;
    }

    const emailBody = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: content,
        },
        toRecipients: [
          {
            emailAddress: {
              address: user.mail || user.userPrincipalName,
            },
          },
        ],
      },
    };

    return this.makeRequest(`/users/${userId}/sendMail`, {
      method: 'POST',
      body: JSON.stringify(emailBody),
    });
  }

  // Group Management Methods
  
  /**
   * Get all groups in the organization
   * @param {number} top - Number of groups to return (default: 999)
   * @returns {Promise} Response with groups
   */
  async getGroups(top = 999) {
    return this.makeRequest(`/groups?$top=${top}&$select=id,displayName,description,groupTypes,mail,mailEnabled,securityEnabled`);
  }

  /**
   * Get all groups by following @odata.nextLink pagination
   * @returns {Promise<Array>} All groups
   */
  async getAllGroups() {
    const groups = [];
    let endpoint = `/groups?$top=999&$select=id,displayName,description,groupTypes,mail,mailEnabled,securityEnabled`;
    
    // Follow pagination links
    while (endpoint) {
      const response = await this.makeRequest(endpoint.replace(this.baseUrl, ''));
      
      if (response.value) {
        groups.push(...response.value);
      }
      
      // Check for next page
      endpoint = response['@odata.nextLink'] || null;
      
      if (endpoint) {
        console.log(`Fetched ${groups.length} groups, loading more...`);
      }
    }
    
    console.log(`Total groups fetched: ${groups.length}`);
    return { value: groups, totalCount: groups.length };
  }
  
  async getUserGroups(userId) {
    try {
      const response = await this.makeRequest(`/users/${userId}/memberOf?$select=id,displayName,groupTypes`);
      // Filter to only security groups (exclude Office 365 groups which are handled separately)
      const groups = (response.value || []).filter(item => 
        item['@odata.type'] && item['@odata.type'].includes('group')
      );
      return {
        value: groups,
        total: groups.length
      };
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  async addUserToGroup(groupId, userId) {
    return this.makeRequest(`/groups/${groupId}/members/$ref`, {
      method: 'POST',
      body: JSON.stringify({
        "@odata.id": `https://graph.microsoft.com/v1.0/users/${userId}`
      }),
    });
  }

  async removeUserFromGroup(groupId, userId) {
    return this.makeRequest(`/groups/${groupId}/members/${userId}/$ref`, {
      method: 'DELETE',
    });
  }

  // Mail Management Methods
  async getUserMailboxSettings(userId) {
    return this.makeRequest(`/users/${userId}/mailboxSettings`);
  }

  async updateUserMailboxSettings(userId, settings) {
    return this.makeRequest(`/users/${userId}/mailboxSettings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async setAutoReply(userId, isEnabled, externalAudience, internalReply, externalReply) {
    return this.updateUserMailboxSettings(userId, {
      automaticRepliesSetting: {
        status: isEnabled ? 'AlwaysEnabled' : 'Disabled',
        externalAudience: externalAudience || 'All',
        internalReply: internalReply || '',
        externalReply: externalReply || '',
      },
    });
  }

  async setMailForwarding(userId, forwardingAddress, deliverToMailboxAndForward) {
    return this.updateUserMailboxSettings(userId, {
      forwardingAddress: forwardingAddress,
      deliverToMailboxAndForwardingAddress: deliverToMailboxAndForward || false,
    });
  }

  /**
   * Convert to shared mailbox
   * NOTE: This operation is NOT supported by Microsoft Graph API
   * It requires Exchange Online PowerShell: Set-Mailbox -Identity {email} -Type Shared
   * This method returns an error with instructions for the administrator
   * @param {string} userId - User ID
   * @returns {Promise} Error response with instructions
   */
  async convertToSharedMailbox(userId) {
    // Get user email for reference
    try {
      const user = await this.makeRequest(`/users/${userId}?$select=id,userPrincipalName,mail`);
      const email = user.mail || user.userPrincipalName;
      
      // Return error with instructions since Graph API doesn't support this
      throw new Error(
        `Converting to shared mailbox is not supported via Microsoft Graph API. ` +
        `Please use Exchange Online PowerShell:\n` +
        `Connect-ExchangeOnline\n` +
        `Set-Mailbox -Identity "${email}" -Type Shared\n` +
        `Or use Exchange Admin Center: https://admin.exchange.microsoft.com`
      );
    } catch (error) {
      console.error('Error with shared mailbox conversion:', error);
      throw error;
    }
  }

  // Teams Management Methods
  async getUserTeams(userId) {
    try {
      const response = await this.makeRequest(`/users/${userId}/joinedTeams?$select=id,displayName,description`);
      return {
        value: response.value || [],
        total: (response.value || []).length
      };
    } catch (error) {
      console.error('Error fetching user teams:', error);
      throw error;
    }
  }

  async removeUserFromTeam(teamId, userId) {
    return this.makeRequest(`/groups/${teamId}/members/${userId}/$ref`, {
      method: 'DELETE',
    });
  }

  // Device Management Methods (Intune)
  async getUserDevices(userId) {
    return this.makeRequest(`/deviceManagement/managedDevices?$filter=userPrincipalName eq '${userId}'&$select=id,deviceName,manufacturer,model,operatingSystem,osVersion,complianceState,lastSyncDateTime`);
  }

  async retireDevice(deviceId) {
    return this.makeRequest(`/deviceManagement/managedDevices/${deviceId}/retire`, {
      method: 'POST',
    });
  }

  async wipeDevice(deviceId, keepEnrollmentData, keepUserData) {
    return this.makeRequest(`/deviceManagement/managedDevices/${deviceId}/wipe`, {
      method: 'POST',
      body: JSON.stringify({
        keepEnrollmentData: keepEnrollmentData || false,
        keepUserData: keepUserData || false,
      }),
    });
  }

  async getUserInstalledApps(userId) {
    return this.makeRequest(`/deviceAppManagement/mobileApps?$filter=owner eq '${userId}'`);
  }

  async removeAppFromDevice(deviceId, appId) {
    return this.makeRequest(`/deviceAppManagement/mobileApps/${appId}/managedDevices/${deviceId}/$ref`, {
      method: 'DELETE',
    });
  }

  // SharePoint/OneDrive Methods
  async getUserOneDriveUsage(userId) {
    return this.makeRequest(`/users/${userId}/drive?$select=id,name,lastModifiedDateTime,quota`);
  }

  async getUserFiles(userId) {
    return this.makeRequest(`/users/${userId}/drive/root/children?$select=id,name,file,folder,size,lastModifiedDateTime`);
  }

  async transferFileOwnership(userId, newOwnerId, fileId) {
    return this.makeRequest(`/drives/${userId}/items/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        '@microsoft.graph.downloadUrl': '',
        'permissions': [{
          'grantedTo': {
            'user': {
              'displayName': newOwnerId
            }
          },
          'roles': ['owner']
        }]
      }),
    });
  }

  async backupUserData(userId) {
    // This would typically trigger a backup process
    // For now, we'll return a placeholder response
    return {
      success: true,
      message: 'Backup process initiated',
      backupId: `backup_${userId}_${Date.now()}`,
    };
  }

  // Directory Methods
  async getUserDirectReports(userId) {
    return this.makeRequest(`/users/${userId}/directReports?$select=displayName,userPrincipalName,jobTitle`);
  }

  async getUserManager(userId) {
    return this.makeRequest(`/users/${userId}/manager?$select=displayName,userPrincipalName,jobTitle`);
  }

  async assignManager(userId, managerId) {
    return this.makeRequest(`/users/${userId}/manager/$ref`, {
      method: 'PUT',
      body: JSON.stringify({
        "@odata.id": `https://graph.microsoft.com/v1.0/users/${managerId}`
      }),
    });
  }

  // License Management
  /**
   * Get user license details
   * @param {string} userId - User ID
   * @returns {Promise} License details
   */
  async getUserLicenses(userId) {
    return this.makeRequest(`/users/${userId}/licenseDetails`);
  }

  /**
   * Assign license to user
   * Per Microsoft Graph API documentation: POST /users/{id}/assignLicense
   * @param {string} userId - User ID
   * @param {string} skuId - SKU ID to assign
   * @param {Array<string>} removeLicenses - Array of SKU IDs to remove
   * @returns {Promise} Response
   */
  async assignLicense(userId, skuId, removeLicenses = []) {
    return this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses: [{ skuId }],
        removeLicenses,
      }),
    });
  }

  /**
   * Assign multiple licenses to user (for onboarding)
   * Per Microsoft Graph API documentation: POST /users/{id}/assignLicense
   * @param {string} userId - User ID
   * @param {Array<string>} skuIds - Array of SKU IDs to assign
   * @returns {Promise} Response
   */
  async assignLicenses(userId, skuIds) {
    if (!skuIds || skuIds.length === 0) {
      return Promise.resolve({ success: true, assignedCount: 0 });
    }

    // Convert SKU ID array to addLicenses format
    const addLicenses = skuIds.map(skuId => ({ skuId }));

    return this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses,
        removeLicenses: [],
      }),
    });
  }

  /**
   * Remove a single license from user
   * Per Microsoft Graph API documentation: POST /users/{id}/assignLicense
   * @param {string} userId - User ID
   * @param {string} skuId - SKU ID to remove
   * @returns {Promise} Response
   */
  async removeLicense(userId, skuId) {
    return this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses: [],
        removeLicenses: [skuId],
      }),
    });
  }

  /**
   * Remove all licenses from user
   * Per Microsoft Graph API documentation: POST /users/{id}/assignLicense
   * Uses correct format: removeLicenses is an array of SKU ID strings
   * @param {string} userId - User ID
   * @returns {Promise} Response with removedCount
   */
  async removeAllLicenses(userId) {
    try {
      // Get current licenses - need to get assignedLicenses from user object, not licenseDetails
      const user = await this.makeRequest(`/users/${userId}?$select=id,assignedLicenses`);
      const assignedLicenses = user.assignedLicenses || [];
      
      if (assignedLicenses.length === 0) {
        return { success: true, removedCount: 0 };
      }

      // Extract SKU IDs - removeLicenses expects array of strings
      const skuIds = assignedLicenses.map(license => license.skuId);

      // Remove all licenses in a single API call
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
   * Revoke all user sign-in sessions
   * Per Microsoft Graph API documentation: POST /users/{id}/revokeSignInSessions
   * This invalidates all refresh tokens and session tokens for the user
   * Essential for security during offboarding
   * @param {string} userId - User ID
   * @returns {Promise} Response
   */
  async revokeUserSessions(userId) {
    // In demo mode, just return success
    if (isDemoMode()) {
      return Promise.resolve({ success: true, value: true });
    }

    return this.makeRequest(`/users/${userId}/revokeSignInSessions`, {
      method: 'POST',
    });
  }

  // Audit and Reporting
  async getUserSignInActivity(userId) {
    return this.makeRequest(`/users/${userId}/signInActivity`);
  }

  async getAuditLogs(startDate, endDate) {
    const filter = `activityDateTime ge ${startDate} and activityDateTime le ${endDate}`;
    return this.makeRequest(`/auditLogs/directoryAudits?$filter=${filter}&$top=50`);
  }
}

// Create a singleton instance
export const graphService = new GraphService();

export default GraphService;