import { graphService } from './graphService';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

/**
 * Microsoft 365 Copilot Service
 * 
 * IMPORTANT NOTE: Many Copilot features are only accessible through the Microsoft 365 admin center,
 * not via Graph API. Additionally, Copilot APIs require a Microsoft 365 Copilot license.
 * 
 * This service provides comprehensive mock data for demo purposes. In production, some endpoints
 * may return limited data or require admin center access.
 * 
 * Graph API namespace: /v1.0/copilot and /beta/copilot
 * Admin center: Microsoft 365 admin center → Copilot → Settings
 */

// Mock usage data
const mockCopilotUsage = {
  periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  periodEnd: new Date().toISOString(),
  totalActiveUsers: 456,
  totalInteractions: 12847,
  averageInteractionsPerUser: 28.2,
  totalTimeSavedHours: 1523,
  adoptionRate: 68.5,
  trends: {
    dailyActiveUsers: [
      { date: '2024-12-01', count: 420 },
      { date: '2024-12-02', count: 432 },
      { date: '2024-12-03', count: 445 },
      { date: '2024-12-04', count: 438 },
      { date: '2024-12-05', count: 451 },
      { date: '2024-12-06', count: 456 },
      { date: '2024-12-07', count: 449 }
    ],
    weeklyInteractions: [
      { week: 'Week 1', count: 2847 },
      { week: 'Week 2', count: 3124 },
      { week: 'Week 3', count: 3456 },
      { week: 'Week 4', count: 3420 }
    ]
  },
  topFeatures: [
    { feature: 'Document Summarization', usage: 3456, percentage: 26.9 },
    { feature: 'Email Drafting', usage: 2987, percentage: 23.2 },
    { feature: 'Meeting Recap', usage: 2234, percentage: 17.4 },
    { feature: 'Data Analysis', usage: 1876, percentage: 14.6 },
    { feature: 'Content Creation', usage: 2294, percentage: 17.9 }
  ]
};

// Mock user adoption data
const mockUserAdoption = {
  totalLicensedUsers: 666,
  activeUsers: 456,
  adoptionRate: 68.5,
  newUsersThisMonth: 87,
  returningUsers: 369,
  departmentAdoption: [
    { department: 'Engineering', totalUsers: 150, activeUsers: 128, rate: 85.3 },
    { department: 'Marketing', totalUsers: 80, activeUsers: 64, rate: 80.0 },
    { department: 'Sales', totalUsers: 120, activeUsers: 89, rate: 74.2 },
    { department: 'HR', totalUsers: 45, activeUsers: 31, rate: 68.9 },
    { department: 'Finance', totalUsers: 60, activeUsers: 38, rate: 63.3 },
    { department: 'Operations', totalUsers: 100, activeUsers: 56, rate: 56.0 },
    { department: 'Executive', totalUsers: 25, activeUsers: 22, rate: 88.0 },
    { department: 'Support', totalUsers: 86, activeUsers: 28, rate: 32.6 }
  ],
  userEngagement: {
    highEngagement: 187, // >20 interactions per month
    mediumEngagement: 156, // 5-20 interactions
    lowEngagement: 113 // <5 interactions
  },
  topUsers: [
    { displayName: 'Sarah Johnson', department: 'Engineering', interactions: 147 },
    { displayName: 'Michael Brown', department: 'Marketing', interactions: 134 },
    { displayName: 'Emily Davis', department: 'Sales', interactions: 128 },
    { displayName: 'David Wilson', department: 'Engineering', interactions: 119 },
    { displayName: 'Lisa Chen', department: 'Executive', interactions: 112 }
  ]
};

// Mock activity reports
const mockActivityReports = {
  businessOutcomes: {
    productivityGain: {
      value: 23.4,
      unit: 'percentage',
      description: 'Average productivity increase reported by users'
    },
    timeSaved: {
      value: 1523,
      unit: 'hours',
      description: 'Total hours saved across organization in last 30 days'
    },
    contentCreated: {
      value: 4532,
      unit: 'documents',
      description: 'Documents created or enhanced with Copilot assistance'
    },
    meetingsOptimized: {
      value: 876,
      unit: 'meetings',
      description: 'Meetings with Copilot-generated recaps or summaries'
    }
  },
  usagePatterns: {
    peakUsageHours: [
      { hour: '9 AM', usage: 87 },
      { hour: '10 AM', usage: 124 },
      { hour: '11 AM', usage: 145 },
      { hour: '1 PM', usage: 132 },
      { hour: '2 PM', usage: 156 },
      { hour: '3 PM', usage: 143 },
      { hour: '4 PM', usage: 98 }
    ],
    mostUsedApps: [
      { app: 'Word', interactions: 3456 },
      { app: 'Outlook', interactions: 2987 },
      { app: 'Teams', interactions: 2234 },
      { app: 'Excel', interactions: 1876 },
      { app: 'PowerPoint', interactions: 1294 },
      { app: 'Loop', interactions: 1000 }
    ]
  },
  qualityMetrics: {
    userSatisfaction: 4.3, // out of 5
    accuracyRating: 4.5,
    promptSuccessRate: 87.3,
    averageResponseTime: 2.4 // seconds
  }
};

// Mock settings data
const mockCopilotSettings = {
  licensingInfo: {
    totalLicenses: 666,
    assignedLicenses: 456,
    availableLicenses: 210,
    licenseType: 'Microsoft 365 Copilot',
    requiresCopilotLicense: true
  },
  features: {
    userAccess: {
      enabled: true,
      scope: 'Selected users and groups',
      description: 'Controls who can access Microsoft 365 Copilot'
    },
    dataAccess: {
      enabled: true,
      respects: ['Permissions', 'Sensitivity labels', 'Conditional access'],
      description: 'Copilot respects existing data access controls'
    },
    webSearch: {
      enabled: true,
      configuredVia: 'Cloud Policy service',
      description: 'Allows Copilot to use web search for current information'
    },
    copilotPages: {
      enabled: true,
      description: 'Allow users to create and view Copilot Pages'
    },
    copilotNotebooks: {
      enabled: true,
      description: 'Allow users to create and view Copilot Notebooks'
    }
  },
  governance: {
    copilotControlSystem: {
      enabled: true,
      description: 'Centralized controls for Copilot scenarios'
    },
    agentLifecycle: {
      connectorManagement: 'Enabled',
      sharingControls: 'Editor and Viewer roles',
      dlpPolicies: 'Active',
      description: 'Manage agent connectors, sharing, and DLP'
    },
    complianceIntegration: {
      purviewIntegration: true,
      sensitivityLabels: true,
      retentionPolicies: true,
      description: 'Integration with Microsoft Purview for compliance'
    }
  },
  adminCenterExclusive: [
    'User access configuration',
    'Data access settings',
    'Copilot actions policies',
    'Agent connector management',
    'Advanced governance controls'
  ],
  apiAvailability: {
    usageAnalytics: 'Limited - some via Graph API',
    settingsManagement: 'Admin center only',
    agentManagement: 'Partial Graph API support',
    complianceReports: 'Admin center only'
  }
};

// Mock agent information
const mockAgentInfo = {
  connectors: [
    { name: 'SharePoint', status: 'Enabled', lastUsed: '2024-12-07T14:30:00Z' },
    { name: 'OneDrive', status: 'Enabled', lastUsed: '2024-12-07T15:45:00Z' },
    { name: 'Microsoft Graph', status: 'Enabled', lastUsed: '2024-12-07T16:20:00Z' },
    { name: 'Power Platform', status: 'Enabled', lastUsed: '2024-12-06T11:15:00Z' },
    { name: 'Third-party APIs', status: 'Restricted', lastUsed: null }
  ],
  customAgents: [
    {
      name: 'HR Assistant',
      description: 'Help with HR policies and procedures',
      status: 'Active',
      usage: 234
    },
    {
      name: 'Sales Intelligence',
      description: 'Customer insights and sales analytics',
      status: 'Active',
      usage: 187
    },
    {
      name: 'IT Support Bot',
      description: 'Technical support and troubleshooting',
      status: 'Active',
      usage: 156
    }
  ],
  dlpPolicies: 3,
  activeShares: 12
};

/**
 * Get Copilot usage statistics and metrics
 * Note: In production, this may require admin center access or specific Copilot APIs
 */
export async function getCopilotUsage() {
  if (isDemoMode) {
    return mockCopilotUsage;
  }

  try {
    // Attempt to call Copilot Graph API endpoint
    // Note: Requires Microsoft 365 Copilot license
    const response = await graphService.makeRequest(
      '/beta/copilot/usage',
      {}
    );
    return response;
  } catch (error) {
    console.warn('Copilot usage API unavailable, using mock data:', error.message);
    return mockCopilotUsage;
  }
}

/**
 * Get user adoption metrics
 * Note: Most detailed adoption metrics are available through admin center only
 */
export async function getUserAdoption() {
  if (isDemoMode) {
    return mockUserAdoption;
  }

  try {
    const response = await graphService.makeRequest(
      '/beta/copilot/adoption',
      {}
    );
    return response;
  } catch (error) {
    console.warn('Copilot adoption API unavailable, using mock data:', error.message);
    return mockUserAdoption;
  }
}

/**
 * Get activity reports and business outcomes
 * Note: Comprehensive reports available in admin center (Copilot Dashboard)
 */
export async function getActivityReports() {
  if (isDemoMode) {
    return mockActivityReports;
  }

  try {
    const response = await graphService.makeRequest(
      '/beta/copilot/reports/activity',
      {}
    );
    return response;
  } catch (error) {
    console.warn('Copilot activity reports API unavailable, using mock data:', error.message);
    return mockActivityReports;
  }
}

/**
 * Get Copilot Dashboard data (high-level overview)
 */
export async function getCopilotDashboardData() {
  if (isDemoMode) {
    return {
      usage: mockCopilotUsage,
      adoption: mockUserAdoption,
      activity: mockActivityReports
    };
  }

  try {
    const [usage, adoption, activity] = await Promise.all([
      getCopilotUsage(),
      getUserAdoption(),
      getActivityReports()
    ]);

    return {
      usage,
      adoption,
      activity
    };
  } catch (error) {
    console.error('Error fetching Copilot dashboard data:', error);
    throw error;
  }
}

/**
 * Get Copilot settings and configuration
 * Note: Most settings are managed through admin center, not Graph API
 */
export async function getCopilotSettings() {
  if (isDemoMode) {
    return mockCopilotSettings;
  }

  try {
    const response = await graphService.makeRequest(
      '/beta/copilot/settings',
      {}
    );
    return response;
  } catch (error) {
    console.warn('Copilot settings API unavailable, using mock data:', error.message);
    return mockCopilotSettings;
  }
}

/**
 * Get license information
 * Note: License data can be retrieved from standard Graph API
 */
export async function getLicenseInfo() {
  if (isDemoMode) {
    return mockCopilotSettings.licensingInfo;
  }

  try {
    // Get subscribed SKUs to find Copilot licenses
    const response = await graphService.makeRequest(
      "/v1.0/subscribedSkus?$filter=contains(servicePlanId,'MICROSOFT_365_COPILOT')",
      {}
    );
    
    // Process license data
    const copilotSkus = response.value || [];
    const totalLicenses = copilotSkus.reduce((sum, sku) => sum + (sku.prepaidUnits?.enabled || 0), 0);
    const assignedLicenses = copilotSkus.reduce((sum, sku) => sum + (sku.consumedUnits || 0), 0);
    
    return {
      totalLicenses,
      assignedLicenses,
      availableLicenses: totalLicenses - assignedLicenses,
      licenseType: 'Microsoft 365 Copilot',
      requiresCopilotLicense: true
    };
  } catch (error) {
    console.warn('License info API unavailable, using mock data:', error.message);
    return mockCopilotSettings.licensingInfo;
  }
}

/**
 * Get agent and connector information
 * Note: Detailed agent management is through admin center (Copilot Control System)
 */
export async function getAgentInfo() {
  if (isDemoMode) {
    return mockAgentInfo;
  }

  try {
    const response = await graphService.makeRequest(
      '/beta/copilot/agents',
      {}
    );
    return response;
  } catch (error) {
    console.warn('Copilot agent API unavailable, using mock data:', error.message);
    return mockAgentInfo;
  }
}

/**
 * Get Copilot feature availability
 * Useful for understanding which features are accessible via API vs admin center
 */
export async function getFeatureAvailability() {
  return {
    graphApiSupported: [
      'Basic usage statistics (limited)',
      'License information',
      'Some adoption metrics'
    ],
    adminCenterOnly: [
      'Detailed usage analytics',
      'User access configuration',
      'Data access settings',
      'Copilot actions policies',
      'Agent lifecycle management',
      'Connector enable/block controls',
      'DLP policy configuration',
      'Sharing controls',
      'Copilot Pages settings',
      'Copilot Notebooks settings',
      'Web search configuration',
      'Governance reports',
      'Compliance monitoring'
    ],
    requiresCopilotLicense: true,
    apiNamespace: '/v1.0/copilot and /beta/copilot',
    adminCenterPath: 'Microsoft 365 admin center → Copilot → Settings'
  };
}

export const copilotService = {
  getCopilotUsage,
  getUserAdoption,
  getActivityReports,
  getCopilotDashboardData,
  getCopilotSettings,
  getLicenseInfo,
  getAgentInfo,
  getFeatureAvailability
};
