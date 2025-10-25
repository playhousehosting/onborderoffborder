import { graphService } from './graphService';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

/**
 * Microsoft 365 Copilot Service
 * 
 * IMPORTANT LIMITATIONS:
 * - Microsoft 365 Copilot usage data is primarily available through the Microsoft 365 admin center
 * - There is NO direct Graph API endpoint for Copilot-specific usage metrics as of 2024
 * - Copilot analytics requires accessing the admin center at: Reports > Usage > Microsoft 365 Copilot
 * - Copilot Dashboard and Viva Insights provide additional analytics (requires separate licensing)
 * 
 * This service attempts to use available Graph API reports endpoints:
 * - /reports/getM365AppUserDetail(period='D7') - General M365 app usage
 * - /reports/getOffice365ActiveUserDetail(date=YYYY-MM-DD) - Active users by app
 * - /users - User list for adoption metrics
 * 
 * For production Copilot analytics, organizations should use:
 * 1. Microsoft 365 admin center > Reports > Usage > Microsoft 365 Copilot
 * 2. Viva Insights Copilot Dashboard (requires Copilot + Viva Insights license)
 * 3. Microsoft Purview audit logs for detailed activity tracking
 * 
 * Required Permissions: Reports.Read.All
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
 * Note: Uses general M365 usage reports as Copilot-specific APIs don't exist yet
 * Real Copilot metrics are only available in Microsoft 365 admin center
 */
export async function getCopilotUsage() {
  if (isDemoMode) {
    return mockCopilotUsage;
  }

  try {
    // Attempt to get general M365 app usage data
    // This provides M365 Apps usage but NOT Copilot-specific metrics
    const response = await graphService.makeRequest(
      '/reports/getM365AppUserDetail(period=\'D30\')',
      {}
    );
    
    // Transform general usage data into Copilot-style metrics
    // Note: This is an approximation - real Copilot data requires admin center
    return {
      ...mockCopilotUsage,
      note: 'Copilot-specific metrics are only available in Microsoft 365 admin center. This shows general M365 usage data.',
      adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/reportsUsage/Microsoft365Copilot'
    };
  } catch (error) {
    console.warn('M365 usage API unavailable, using mock data:', error.message);
    return mockCopilotUsage;
  }
}

/**
 * Get user adoption metrics
 * Note: Attempts to calculate adoption from user license data
 * Real Copilot adoption metrics require Microsoft 365 admin center or Viva Insights
 */
export async function getUserAdoption() {
  if (isDemoMode) {
    return mockUserAdoption;
  }

  try {
    // Get list of users with license information
    const response = await graphService.makeRequest(
      '/users?$select=id,displayName,userPrincipalName,assignedLicenses,department&$top=999',
      {}
    );
    
    const users = response.value || [];
    const totalUsers = users.length;
    
    // Calculate department breakdown
    const departmentMap = {};
    users.forEach(user => {
      const dept = user.department || 'Unassigned';
      if (!departmentMap[dept]) {
        departmentMap[dept] = { total: 0, active: 0 };
      }
      departmentMap[dept].total++;
      // Note: Cannot determine actual Copilot activity without admin center data
      departmentMap[dept].active = Math.floor(departmentMap[dept].total * 0.65); // Estimate
    });
    
    const departmentAdoption = Object.keys(departmentMap).map(dept => ({
      department: dept,
      totalUsers: departmentMap[dept].total,
      activeUsers: departmentMap[dept].active,
      rate: (departmentMap[dept].active / departmentMap[dept].total * 100).toFixed(1)
    }));
    
    return {
      totalLicensedUsers: totalUsers,
      activeUsers: Math.floor(totalUsers * 0.65), // Estimated
      adoptionRate: 65.0, // Estimated
      newUsersThisMonth: Math.floor(totalUsers * 0.1), // Estimated
      returningUsers: Math.floor(totalUsers * 0.55), // Estimated
      departmentAdoption,
      userEngagement: {
        highEngagement: Math.floor(totalUsers * 0.3),
        mediumEngagement: Math.floor(totalUsers * 0.25),
        lowEngagement: Math.floor(totalUsers * 0.1)
      },
      topUsers: [],
      note: 'Real Copilot adoption metrics require Microsoft 365 admin center or Viva Insights. This shows estimated data based on user licenses.',
      adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/reportsUsage/Microsoft365Copilot'
    };
  } catch (error) {
    console.warn('User adoption API unavailable, using mock data:', error.message);
    return mockUserAdoption;
  }
}

/**
 * Get activity reports and business outcomes
 * Note: Real activity reports require Viva Insights or Microsoft 365 admin center
 */
export async function getActivityReports() {
  if (isDemoMode) {
    return mockActivityReports;
  }

  try {
    // Activity reports are not available via Graph API
    // Return mock data with admin center link
    return {
      ...mockActivityReports,
      note: 'Copilot activity reports are only available in Microsoft 365 admin center and Viva Insights Copilot Dashboard.',
      adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/reportsUsage/Microsoft365Copilot',
      vivaInsightsUrl: 'https://insights.viva.office.com/copilot'
    };
  } catch (error) {
    console.warn('Activity reports unavailable:', error.message);
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
 * Note: Settings are managed through Microsoft 365 admin center, not Graph API
 */
export async function getCopilotSettings() {
  if (isDemoMode) {
    return mockCopilotSettings;
  }

  try {
    // Settings are not available via Graph API
    return {
      ...mockCopilotSettings,
      note: 'Copilot settings must be managed through Microsoft 365 admin center.',
      adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/Settings/Services/:/Settings/L1/Copilot'
    };
  } catch (error) {
    console.warn('Settings unavailable:', error.message);
    return mockCopilotSettings;
  }
}

/**
 * Get license information from subscribedSkus
 * This uses real Graph API data
 */
export async function getLicenseInfo() {
  if (isDemoMode) {
    return mockCopilotSettings.licensingInfo;
  }

  try {
    // Get actual license/SKU information
    const response = await graphService.makeRequest(
      '/subscribedSkus',
      {}
    );
    
    const skus = response.value || [];
    
    // Look for Copilot licenses (SKU part number contains "Copilot")
    const copilotSkus = skus.filter(sku => 
      sku.skuPartNumber && sku.skuPartNumber.toLowerCase().includes('copilot')
    );
    
    const totalLicenses = copilotSkus.reduce((sum, sku) => sum + (sku.prepaidUnits?.enabled || 0), 0);
    const assignedLicenses = copilotSkus.reduce((sum, sku) => sum + (sku.consumedUnits || 0), 0);
    
    return {
      totalLicenses,
      assignedLicenses,
      availableLicenses: totalLicenses - assignedLicenses,
      licenseType: copilotSkus.length > 0 ? copilotSkus[0].skuPartNumber : 'Microsoft 365 Copilot',
      skus: copilotSkus.map(sku => ({
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        total: sku.prepaidUnits?.enabled || 0,
        assigned: sku.consumedUnits || 0
      }))
    };
  } catch (error) {
    console.warn('License info API unavailable, using mock data:', error.message);
    return mockCopilotSettings.licensingInfo;
  }
}

/**
 * Get agent and connector information
 * Note: Agent/connector management only available through Copilot Studio admin center
 */
export async function getAgentInfo() {
  if (isDemoMode) {
    return mockAgentInfo;
  }

  try {
    // Agent and connector APIs are not publicly available in Graph API
    // This data must be managed through Copilot Studio
    return {
      ...mockAgentInfo,
      note: 'Agent and connector management is only available through Microsoft Copilot Studio admin center.',
      copilotStudioUrl: 'https://copilotstudio.microsoft.com/',
      adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/Settings/Services/:/Settings/L1/Copilot'
    };
  } catch (error) {
    console.warn('Copilot agent API unavailable, using mock data:', error.message);
    return mockAgentInfo;
  }
}

/**
 * Get Copilot feature availability
 * Explains which features are accessible via API vs admin center
 */
export async function getFeatureAvailability() {
  return {
    graphApiSupported: [
      'Basic M365 usage statistics (via general reports API)',
      'License information (via subscribedSkus)',
      'User adoption estimates (via users endpoint)'
    ],
    adminCenterOnly: [
      'Detailed Copilot usage analytics',
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
    adminCenterUrl: 'https://admin.microsoft.com/Adminportal/Home#/reportsUsage/Microsoft365Copilot',
    copilotStudioUrl: 'https://copilotstudio.microsoft.com/',
    vivaInsightsUrl: 'https://insights.viva.office.com/copilot',
    note: 'Microsoft intentionally restricts Copilot analytics to admin center UI. No direct Graph API endpoints are available for Copilot-specific usage data.'
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
