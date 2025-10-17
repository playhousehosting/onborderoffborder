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
  }

  // Generic method to make Graph API calls
  async makeRequest(endpoint, options = {}) {
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Graph API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Graph API request error:', error);
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
  async getUsers(top = 25, skip = 0, filter = '') {
    let endpoint = `/users?$top=${top}&$skip=${skip}&$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime`;
    
    if (filter) {
      endpoint += `&$filter=${filter}`;
    }
    
    return this.makeRequest(endpoint);
  }

  async getUserById(userId) {
    return this.makeRequest(`/users/${userId}?$select=id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime,lastPasswordChangeDateTime,officeLocation,companyName,mobilePhone,businessPhones`);
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

  async resetUserPassword(userId, newPassword) {
    return this.makeRequest(`/users/${userId}/changePassword`, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: '',
        newPassword: newPassword,
      }),
    });
  }

  async setUserPassword(userId, newPassword, forceChangePasswordNextSignIn = true) {
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
  async getUserGroups(userId) {
    return this.makeRequest(`/users/${userId}/memberOf?$select=displayName,id,groupTypes`);
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

  async convertToSharedMailbox(userId) {
    return this.makeRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        mailNickname: userId,
        "recipientType": "SharedMailbox"
      }),
    });
  }

  // Teams Management Methods
  async getUserTeams(userId) {
    return this.makeRequest(`/users/${userId}/joinedTeams?$select=displayName,id,description`);
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
  async getUserLicenses(userId) {
    return this.makeRequest(`/users/${userId}/licenseDetails`);
  }

  async assignLicense(userId, skuId, removeLicenses = []) {
    return this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses: [{ skuId }],
        removeLicenses,
      }),
    });
  }

  async removeLicense(userId, skuId) {
    return this.makeRequest(`/users/${userId}/assignLicense`, {
      method: 'POST',
      body: JSON.stringify({
        addLicenses: [],
        removeLicenses: [skuId],
      }),
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