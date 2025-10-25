/**
 * Microsoft Defender Service
 * 
 * Provides access to Microsoft Defender for Endpoint and Microsoft 365 Defender security data
 * via Microsoft Graph Security API endpoints.
 * 
 * Available Graph API Endpoints:
 * - /security/alerts_v2 - Security alerts from all sources
 * - /security/incidents - Security incidents (correlated alerts)
 * - /security/secureScores - Secure Score and recommendations
 * - /security/secureScoreControlProfiles - Detailed control information
 * 
 * Email Security (Exchange Online Protection):
 * - Quarantined messages management
 * - Tenant allow/block lists for domains, senders, URLs
 * - Anti-spam and anti-phishing policies
 * 
 * Required Permissions:
 * - SecurityEvents.Read.All - Read security events
 * - SecurityAlert.Read.All - Read security alerts
 * - ThreatIndicators.Read.All - Read threat intelligence
 * - SecurityActions.ReadWrite.All - Manage security actions (quarantine release, block/allow lists)
 */

import graphService from './graphService';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

// Mock data for demo mode
const mockAlerts = {
  value: [
    {
      id: 'alert-001',
      title: 'Suspicious PowerShell Execution',
      severity: 'high',
      status: 'new',
      category: 'Execution',
      detectionSource: 'microsoftDefenderForEndpoint',
      createdDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      description: 'Suspicious PowerShell command detected attempting to download external content',
      recommendedActions: 'Investigate the user and device, isolate if necessary',
      assignedTo: null,
      classification: null,
      determination: null
    },
    {
      id: 'alert-002',
      title: 'Malware Detected',
      severity: 'medium',
      status: 'inProgress',
      category: 'Malware',
      detectionSource: 'microsoftDefenderForEndpoint',
      createdDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      description: 'Trojan malware detected in downloaded file',
      recommendedActions: 'Remove malicious file and scan device',
      assignedTo: 'security-team@company.com',
      classification: 'truePositive',
      determination: 'malware'
    },
    {
      id: 'alert-003',
      title: 'Impossible Travel',
      severity: 'medium',
      status: 'new',
      category: 'CredentialAccess',
      detectionSource: 'azureActiveDirectoryIdentityProtection',
      createdDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      description: 'User signed in from two geographically distant locations within a short time',
      recommendedActions: 'Verify with user and reset credentials if compromised',
      assignedTo: null,
      classification: null,
      determination: null
    }
  ],
  '@odata.nextLink': null
};

const mockIncidents = {
  value: [
    {
      id: 'incident-001',
      displayName: 'Multi-stage ransomware attack',
      severity: 'high',
      status: 'active',
      classification: 'truePositive',
      determination: 'multiStagedAttack',
      createdDateTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      assignedTo: 'security-analyst@company.com',
      tags: ['ransomware', 'critical'],
      alerts: [
        { id: 'alert-001', title: 'Suspicious PowerShell Execution' },
        { id: 'alert-004', title: 'Lateral Movement Detected' }
      ],
      description: 'Coordinated attack with multiple stages detected across devices'
    },
    {
      id: 'incident-002',
      displayName: 'Phishing campaign',
      severity: 'medium',
      status: 'resolved',
      classification: 'truePositive',
      determination: 'phishing',
      createdDateTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      lastUpdateDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: 'security-team@company.com',
      tags: ['phishing', 'email'],
      alerts: [
        { id: 'alert-005', title: 'Suspicious Email Link Click' }
      ],
      description: 'Multiple users received phishing emails, one user clicked malicious link'
    }
  ],
  '@odata.nextLink': null
};

const mockSecureScore = {
  id: 'secure-score-current',
  createdDateTime: new Date().toISOString(),
  currentScore: 342,
  maxScore: 500,
  enabledServices: ['Azure AD', 'Microsoft Defender', 'Intune', 'Microsoft 365'],
  averageComparativeScores: [
    {
      basis: 'AllTenants',
      averageScore: 285
    },
    {
      basis: 'TotalSeats',
      averageScore: 310
    }
  ],
  controlScores: [
    {
      controlName: 'EnableMFA',
      controlCategory: 'Identity',
      score: 45,
      percentage: 90
    },
    {
      controlName: 'EnableATP',
      controlCategory: 'Data',
      score: 38,
      percentage: 76
    },
    {
      controlName: 'EnableDLP',
      controlCategory: 'Data',
      score: 28,
      percentage: 70
    }
  ]
};

const mockRecommendations = [
  {
    id: 'rec-001',
    displayName: 'Enable Multi-Factor Authentication',
    productName: 'Azure Active Directory',
    recommendationCategory: 'Identity',
    actionType: 'Config',
    status: 'Active',
    score: 10,
    maxScore: 10,
    implementationCost: 'Low',
    userImpact: 'Moderate',
    rank: 1,
    remediationImpact: 'Users will need to use MFA for sign-in',
    actionUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/Security'
  },
  {
    id: 'rec-002',
    displayName: 'Enable Microsoft Defender for Office 365',
    productName: 'Microsoft Defender',
    recommendationCategory: 'Data',
    actionType: 'Config',
    status: 'Active',
    score: 8,
    maxScore: 10,
    implementationCost: 'Moderate',
    userImpact: 'Low',
    rank: 2,
    remediationImpact: 'Email attachments and links will be scanned',
    actionUrl: 'https://security.microsoft.com/threatprotection'
  },
  {
    id: 'rec-003',
    displayName: 'Turn on audit logging',
    productName: 'Microsoft 365',
    recommendationCategory: 'Data',
    actionType: 'Config',
    status: 'Active',
    score: 7,
    maxScore: 10,
    implementationCost: 'Low',
    userImpact: 'Low',
    rank: 3,
    remediationImpact: 'All activities will be logged for compliance',
    actionUrl: 'https://compliance.microsoft.com/auditlogsearch'
  }
];

/**
 * Get security alerts from Microsoft Defender
 * Uses /security/alerts_v2 endpoint
 */
export async function getSecurityAlerts(filters = {}) {
  if (isDemoMode) {
    return mockAlerts;
  }

  try {
    let endpoint = '/security/alerts_v2';
    const queryParams = [];

    // Build filter query
    if (filters.severity) {
      queryParams.push(`severity eq '${filters.severity}'`);
    }
    if (filters.status) {
      queryParams.push(`status eq '${filters.status}'`);
    }
    if (filters.days) {
      const date = new Date();
      date.setDate(date.getDate() - filters.days);
      queryParams.push(`createdDateTime ge ${date.toISOString()}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?$filter=${queryParams.join(' and ')}`;
    }

    endpoint += (queryParams.length > 0 ? '&' : '?') + '$top=50&$orderby=createdDateTime desc';

    const response = await graphService.makeRequest(endpoint, {});
    return response;
  } catch (error) {
    console.warn('Security alerts API unavailable:', error.message);
    return mockAlerts;
  }
}

/**
 * Get security incidents
 * Uses /security/incidents endpoint
 */
export async function getSecurityIncidents(filters = {}) {
  if (isDemoMode) {
    return mockIncidents;
  }

  try {
    let endpoint = '/security/incidents';
    const queryParams = [];

    if (filters.status) {
      queryParams.push(`status eq '${filters.status}'`);
    }
    if (filters.severity) {
      queryParams.push(`severity eq '${filters.severity}'`);
    }

    if (queryParams.length > 0) {
      endpoint += `?$filter=${queryParams.join(' and ')}`;
    }

    endpoint += (queryParams.length > 0 ? '&' : '?') + '$top=50&$orderby=lastUpdateDateTime desc&$expand=alerts';

    const response = await graphService.makeRequest(endpoint, {});
    return response;
  } catch (error) {
    console.warn('Security incidents API unavailable:', error.message);
    return mockIncidents;
  }
}

/**
 * Get Microsoft Secure Score
 * Uses /security/secureScores endpoint
 */
export async function getSecureScore() {
  if (isDemoMode) {
    return mockSecureScore;
  }

  try {
    // Get the most recent secure score
    const response = await graphService.makeRequest(
      '/security/secureScores?$top=1&$orderby=createdDateTime desc',
      {}
    );

    if (response.value && response.value.length > 0) {
      return response.value[0];
    }

    return mockSecureScore;
  } catch (error) {
    console.warn('Secure Score API unavailable:', error.message);
    return mockSecureScore;
  }
}

/**
 * Get security recommendations
 * Uses /security/secureScoreControlProfiles endpoint
 */
export async function getSecurityRecommendations() {
  if (isDemoMode) {
    return mockRecommendations;
  }

  try {
    const response = await graphService.makeRequest(
      '/security/secureScoreControlProfiles?$top=20&$orderby=rank',
      {}
    );

    // Transform to simpler format
    if (response.value) {
      return response.value.map(control => ({
        id: control.id,
        displayName: control.title,
        productName: control.service,
        recommendationCategory: control.controlCategory,
        actionType: control.actionType,
        status: control.deprecated ? 'Deprecated' : 'Active',
        score: control.score,
        maxScore: control.maxScore,
        implementationCost: control.implementationCost,
        userImpact: control.userImpact,
        rank: control.rank,
        remediationImpact: control.remediationImpact,
        actionUrl: control.actionUrl
      }));
    }

    return mockRecommendations;
  } catch (error) {
    console.warn('Security recommendations API unavailable:', error.message);
    return mockRecommendations;
  }
}

/**
 * Get vulnerability information
 * Note: Full vulnerability assessment requires Microsoft Defender Vulnerability Management
 */
export async function getVulnerabilities() {
  if (isDemoMode) {
    return {
      critical: 5,
      high: 12,
      medium: 28,
      low: 45,
      total: 90,
      topVulnerabilities: [
        {
          id: 'CVE-2024-0001',
          name: 'Critical Windows Vulnerability',
          severity: 'Critical',
          cvssScore: 9.8,
          affectedDevices: 15,
          published: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'CVE-2024-0002',
          name: 'Office Remote Code Execution',
          severity: 'High',
          cvssScore: 8.1,
          affectedDevices: 23,
          published: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }

  try {
    // Note: This endpoint may require Defender Vulnerability Management license
    const response = await graphService.makeRequest(
      '/security/vulnerabilities?$top=100',
      {}
    );
    
    if (response.value) {
      const vulnerabilities = response.value;
      const critical = vulnerabilities.filter(v => v.severity === 'Critical').length;
      const high = vulnerabilities.filter(v => v.severity === 'High').length;
      const medium = vulnerabilities.filter(v => v.severity === 'Medium').length;
      const low = vulnerabilities.filter(v => v.severity === 'Low').length;

      return {
        critical,
        high,
        medium,
        low,
        total: vulnerabilities.length,
        topVulnerabilities: vulnerabilities.slice(0, 10)
      };
    }
  } catch (error) {
    console.warn('Vulnerabilities API unavailable, using summary data:', error.message);
  }

  // Fallback: return mock summary
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
    topVulnerabilities: [],
    note: 'Detailed vulnerability data requires Microsoft Defender Vulnerability Management. View in Microsoft 365 Defender portal: https://security.microsoft.com/vulnerabilities'
  };
}

/**
 * Update alert status
 */
export async function updateAlert(alertId, updates) {
  if (isDemoMode) {
    return { success: true };
  }

  try {
    await graphService.makeRequest(
      `/security/alerts_v2/${alertId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to update alert:', error);
    throw error;
  }
}

/**
 * Update incident
 */
export async function updateIncident(incidentId, updates) {
  if (isDemoMode) {
    return { success: true };
  }

  try {
    await graphService.makeRequest(
      `/security/incidents/${incidentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to update incident:', error);
    throw error;
  }
}

// ==================== EMAIL SECURITY FUNCTIONS ====================

/**
 * Mock quarantined messages for demo mode
 */
const mockQuarantinedMessages = {
  value: [
    {
      id: 'quarantine-001',
      receivedDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      senderEmailAddress: 'suspicious@external-domain.com',
      recipientEmailAddress: 'john.doe@company.com',
      subject: 'Urgent: Update your account information',
      size: 45678,
      direction: 'Inbound',
      quarantineReason: 'Phishing',
      releaseStatus: 'NotReleased',
      threatTypes: ['Phishing', 'Malware']
    },
    {
      id: 'quarantine-002',
      receivedDateTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      senderEmailAddress: 'spam@marketing-blast.net',
      recipientEmailAddress: 'jane.smith@company.com',
      subject: 'You won $1,000,000!',
      size: 23456,
      direction: 'Inbound',
      quarantineReason: 'Spam',
      releaseStatus: 'NotReleased',
      threatTypes: ['Spam']
    },
    {
      id: 'quarantine-003',
      receivedDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      senderEmailAddress: 'malicious@bad-actor.org',
      recipientEmailAddress: 'admin@company.com',
      subject: 'Invoice Attachment - Please Review',
      size: 156789,
      direction: 'Inbound',
      quarantineReason: 'Malware',
      releaseStatus: 'NotReleased',
      threatTypes: ['Malware']
    }
  ]
};

/**
 * Mock tenant allow/block lists
 */
const mockTenantAllowBlockList = {
  allowedDomains: [
    { id: 'allow-001', value: 'trusted-partner.com', notes: 'Business partner', createdDateTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'allow-002', value: 'vendor-company.net', notes: 'Approved vendor', createdDateTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
  ],
  blockedDomains: [
    { id: 'block-001', value: 'known-phishing.com', notes: 'Phishing campaign source', createdDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'block-002', value: 'spam-sender.net', notes: 'Persistent spam source', createdDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'block-003', value: 'malware-distribution.org', notes: 'Malware distribution', createdDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
  ],
  allowedSenders: [
    { id: 'allow-sender-001', value: 'newsletter@trusted-source.com', notes: 'Company newsletter', createdDateTime: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() }
  ],
  blockedSenders: [
    { id: 'block-sender-001', value: 'spammer@bad-domain.com', notes: 'Known spammer', createdDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
  ]
};

/**
 * Get quarantined messages
 * Retrieves messages quarantined by Exchange Online Protection
 */
export async function getQuarantinedMessages(filters = {}) {
  if (isDemoMode) {
    let messages = mockQuarantinedMessages.value;
    
    // Apply filters
    if (filters.quarantineReason) {
      messages = messages.filter(m => m.quarantineReason === filters.quarantineReason);
    }
    if (filters.recipientEmail) {
      messages = messages.filter(m => 
        m.recipientEmailAddress.toLowerCase().includes(filters.recipientEmail.toLowerCase())
      );
    }
    
    return { value: messages };
  }

  try {
    // Use Microsoft Graph Security API for quarantined messages
    let endpoint = '/security/threatSubmission/emailThreats';
    const queryParams = [];

    if (filters.recipientEmail) {
      queryParams.push(`$filter=recipientEmailAddress eq '${filters.recipientEmail}'`);
    }
    if (filters.startDate) {
      queryParams.push(`receivedDateTime ge ${filters.startDate}`);
    }

    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }

    const response = await graphService.makeRequest(endpoint, {});
    return response;
  } catch (error) {
    console.warn('Quarantine API unavailable, using mock data:', error.message);
    return mockQuarantinedMessages;
  }
}

/**
 * Release message from quarantine
 */
export async function releaseQuarantinedMessage(messageId, releaseToAll = false) {
  if (isDemoMode) {
    return { success: true, message: 'Message released from quarantine' };
  }

  try {
    // Release message using Security API
    await graphService.makeRequest(
      `/security/threatSubmission/emailThreats/${messageId}/release`,
      {
        method: 'POST',
        body: JSON.stringify({
          releaseToAll: releaseToAll
        })
      }
    );
    return { success: true, message: 'Message released successfully' };
  } catch (error) {
    console.error('Failed to release message:', error);
    throw error;
  }
}

/**
 * Delete message from quarantine
 */
export async function deleteQuarantinedMessage(messageId) {
  if (isDemoMode) {
    return { success: true, message: 'Message deleted from quarantine' };
  }

  try {
    await graphService.makeRequest(
      `/security/threatSubmission/emailThreats/${messageId}`,
      {
        method: 'DELETE'
      }
    );
    return { success: true, message: 'Message deleted successfully' };
  } catch (error) {
    console.error('Failed to delete quarantined message:', error);
    throw error;
  }
}

/**
 * Get tenant allow/block lists
 * Retrieves domains and senders in allow/block lists
 */
export async function getTenantAllowBlockList() {
  if (isDemoMode) {
    return mockTenantAllowBlockList;
  }

  try {
    // Get tenant allow/block list entries
    // Note: This may require Exchange Online PowerShell or Security & Compliance Center API
    // For now, using a placeholder endpoint structure
    const [allowedDomains, blockedDomains, allowedSenders, blockedSenders] = await Promise.all([
      graphService.makeRequest('/security/tenantAllowBlockList/allowedDomains', {}).catch(() => ({ value: [] })),
      graphService.makeRequest('/security/tenantAllowBlockList/blockedDomains', {}).catch(() => ({ value: [] })),
      graphService.makeRequest('/security/tenantAllowBlockList/allowedSenders', {}).catch(() => ({ value: [] })),
      graphService.makeRequest('/security/tenantAllowBlockList/blockedSenders', {}).catch(() => ({ value: [] }))
    ]);

    return {
      allowedDomains: allowedDomains.value || [],
      blockedDomains: blockedDomains.value || [],
      allowedSenders: allowedSenders.value || [],
      blockedSenders: blockedSenders.value || []
    };
  } catch (error) {
    console.warn('Tenant allow/block list API unavailable, using mock data:', error.message);
    return mockTenantAllowBlockList;
  }
}

/**
 * Add domain to allow list (whitelist)
 */
export async function addDomainToAllowList(domain, notes = '') {
  if (isDemoMode) {
    return { 
      success: true, 
      message: `Domain ${domain} added to allow list`,
      entry: {
        id: `allow-${Date.now()}`,
        value: domain,
        notes: notes,
        createdDateTime: new Date().toISOString()
      }
    };
  }

  try {
    const response = await graphService.makeRequest(
      '/security/tenantAllowBlockList/allowedDomains',
      {
        method: 'POST',
        body: JSON.stringify({
          value: domain,
          notes: notes,
          action: 'Allow'
        })
      }
    );
    return { success: true, message: 'Domain added to allow list', entry: response };
  } catch (error) {
    console.error('Failed to add domain to allow list:', error);
    throw error;
  }
}

/**
 * Add domain to block list (blacklist)
 */
export async function addDomainToBlockList(domain, notes = '') {
  if (isDemoMode) {
    return { 
      success: true, 
      message: `Domain ${domain} added to block list`,
      entry: {
        id: `block-${Date.now()}`,
        value: domain,
        notes: notes,
        createdDateTime: new Date().toISOString()
      }
    };
  }

  try {
    const response = await graphService.makeRequest(
      '/security/tenantAllowBlockList/blockedDomains',
      {
        method: 'POST',
        body: JSON.stringify({
          value: domain,
          notes: notes,
          action: 'Block'
        })
      }
    );
    return { success: true, message: 'Domain added to block list', entry: response };
  } catch (error) {
    console.error('Failed to add domain to block list:', error);
    throw error;
  }
}

/**
 * Remove domain from allow list
 */
export async function removeDomainFromAllowList(entryId) {
  if (isDemoMode) {
    return { success: true, message: 'Domain removed from allow list' };
  }

  try {
    await graphService.makeRequest(
      `/security/tenantAllowBlockList/allowedDomains/${entryId}`,
      {
        method: 'DELETE'
      }
    );
    return { success: true, message: 'Domain removed from allow list' };
  } catch (error) {
    console.error('Failed to remove domain from allow list:', error);
    throw error;
  }
}

/**
 * Remove domain from block list
 */
export async function removeDomainFromBlockList(entryId) {
  if (isDemoMode) {
    return { success: true, message: 'Domain removed from block list' };
  }

  try {
    await graphService.makeRequest(
      `/security/tenantAllowBlockList/blockedDomains/${entryId}`,
      {
        method: 'DELETE'
      }
    );
    return { success: true, message: 'Domain removed from block list' };
  } catch (error) {
    console.error('Failed to remove domain from block list:', error);
    throw error;
  }
}

/**
 * Add sender to allow list
 */
export async function addSenderToAllowList(email, notes = '') {
  if (isDemoMode) {
    return { 
      success: true, 
      message: `Sender ${email} added to allow list`,
      entry: {
        id: `allow-sender-${Date.now()}`,
        value: email,
        notes: notes,
        createdDateTime: new Date().toISOString()
      }
    };
  }

  try {
    const response = await graphService.makeRequest(
      '/security/tenantAllowBlockList/allowedSenders',
      {
        method: 'POST',
        body: JSON.stringify({
          value: email,
          notes: notes,
          action: 'Allow'
        })
      }
    );
    return { success: true, message: 'Sender added to allow list', entry: response };
  } catch (error) {
    console.error('Failed to add sender to allow list:', error);
    throw error;
  }
}

/**
 * Add sender to block list
 */
export async function addSenderToBlockList(email, notes = '') {
  if (isDemoMode) {
    return { 
      success: true, 
      message: `Sender ${email} added to block list`,
      entry: {
        id: `block-sender-${Date.now()}`,
        value: email,
        notes: notes,
        createdDateTime: new Date().toISOString()
      }
    };
  }

  try {
    const response = await graphService.makeRequest(
      '/security/tenantAllowBlockList/blockedSenders',
      {
        method: 'POST',
        body: JSON.stringify({
          value: email,
          notes: notes,
          action: 'Block'
        })
      }
    );
    return { success: true, message: 'Sender added to block list', entry: response };
  } catch (error) {
    console.error('Failed to add sender to block list:', error);
    throw error;
  }
}

export const defenderService = {
  getSecurityAlerts,
  getSecurityIncidents,
  getSecureScore,
  getSecurityRecommendations,
  getVulnerabilities,
  updateAlert,
  updateIncident,
  // Email Security
  getQuarantinedMessages,
  releaseQuarantinedMessage,
  deleteQuarantinedMessage,
  getTenantAllowBlockList,
  addDomainToAllowList,
  addDomainToBlockList,
  removeDomainFromAllowList,
  removeDomainFromBlockList,
  addSenderToAllowList,
  addSenderToBlockList
};

export default defenderService;
