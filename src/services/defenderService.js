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
 * Required Permissions:
 * - SecurityEvents.Read.All - Read security events
 * - SecurityAlert.Read.All - Read security alerts
 * - ThreatIndicators.Read.All - Read threat intelligence
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

export const defenderService = {
  getSecurityAlerts,
  getSecurityIncidents,
  getSecureScore,
  getSecurityRecommendations,
  getVulnerabilities,
  updateAlert,
  updateIncident
};

export default defenderService;
