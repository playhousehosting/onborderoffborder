/**
 * Microsoft Intune Service
 * Comprehensive service for managing devices, applications, policies, and compliance via Microsoft Graph API
 * Supports all Intune management capabilities including Win32 apps, settings catalog, and templates
 */

import graphService from './graphService';

// ========== INTUNE API ENDPOINTS ==========
const INTUNE_ENDPOINTS = {
  // Device Management
  MANAGED_DEVICES: '/deviceManagement/managedDevices',
  DEVICE_COMPLIANCE_POLICIES: '/deviceManagement/deviceCompliancePolicies',
  DEVICE_CONFIGURATIONS: '/deviceManagement/deviceConfigurations',
  CONFIGURATION_POLICIES: '/deviceManagement/configurationPolicies',
  
  // Application Management
  MOBILE_APPS: '/deviceAppManagement/mobileApps',
  APP_CONFIGURATIONS: '/deviceAppManagement/mobileAppConfigurations',
  APP_PROTECTION_POLICIES: '/deviceAppManagement/managedAppPolicies',
  
  // Policy Management
  SETTINGS_CATALOG: '/deviceManagement/configurationPolicies',
  TEMPLATES: '/deviceManagement/templates',
  INTENTS: '/deviceManagement/intents',
  
  // Assignments
  ASSIGNMENTS: '/assignments',
  GROUP_ASSIGNMENTS: '/groupAssignments',
  
  // Reports
  REPORTS: '/deviceManagement/reports',
  DEVICE_COMPLIANCE_REPORTS: '/deviceManagement/reports/deviceCompliance',
};

// ========== DEVICE MANAGEMENT ==========

/**
 * Get all managed devices
 * @param {Object} options - Query options (filter, select, orderby)
 * @returns {Promise<Array>} List of managed devices
 */
export const getManagedDevices = async (options = {}) => {
  try {
    let url = INTUNE_ENDPOINTS.MANAGED_DEVICES;
    
    const params = new URLSearchParams();
    if (options.filter) params.append('$filter', options.filter);
    if (options.select) params.append('$select', options.select);
    if (options.orderby) params.append('$orderby', options.orderby);
    if (options.top) params.append('$top', options.top);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await graphService.callMsGraph(url);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching managed devices:', error);
    throw error;
  }
};

/**
 * Get a specific managed device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Device details
 */
export const getManagedDevice = async (deviceId) => {
  try {
    return await graphService.callMsGraph(`${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}`);
  } catch (error) {
    console.error(`Error fetching device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Sync a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
export const syncDevice = async (deviceId) => {
  try {
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}/syncDevice`,
      'POST'
    );
  } catch (error) {
    console.error(`Error syncing device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Reboot a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
export const rebootDevice = async (deviceId) => {
  try {
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}/rebootNow`,
      'POST'
    );
  } catch (error) {
    console.error(`Error rebooting device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Remote lock a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
export const remoteLockDevice = async (deviceId) => {
  try {
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}/remoteLock`,
      'POST'
    );
  } catch (error) {
    console.error(`Error remote locking device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Retire a device
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
export const retireDevice = async (deviceId) => {
  try {
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}/retire`,
      'POST'
    );
  } catch (error) {
    console.error(`Error retiring device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Wipe a device
 * @param {string} deviceId - Device ID
 * @param {Object} options - Wipe options (keepEnrollmentData, keepUserData, etc.)
 * @returns {Promise<void>}
 */
export const wipeDevice = async (deviceId, options = {}) => {
  try {
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MANAGED_DEVICES}/${deviceId}/wipe`,
      'POST',
      options
    );
  } catch (error) {
    console.error(`Error wiping device ${deviceId}:`, error);
    throw error;
  }
};

/**
 * Get device compliance status
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Compliance status
 */
export const getDeviceComplianceStatus = async (deviceId) => {
  try {
    const device = await getManagedDevice(deviceId);
    return {
      complianceState: device.complianceState,
      isCompliant: device.complianceState === 'compliant',
      lastReportedDateTime: device.lastSyncDateTime,
      deviceHealthThreatLevel: device.deviceHealthThreatLevel,
    };
  } catch (error) {
    console.error(`Error fetching compliance status for device ${deviceId}:`, error);
    throw error;
  }
};

// ========== APPLICATION MANAGEMENT ==========

/**
 * Get all mobile apps
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of mobile apps
 */
export const getMobileApps = async (options = {}) => {
  try {
    let url = INTUNE_ENDPOINTS.MOBILE_APPS;
    
    const params = new URLSearchParams();
    if (options.filter) params.append('$filter', options.filter);
    if (options.select) params.append('$select', options.select);
    if (options.expand) params.append('$expand', options.expand);
    if (options.top) params.append('$top', options.top);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await graphService.callMsGraph(url);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching mobile apps:', error);
    throw error;
  }
};

/**
 * Get a specific mobile app
 * @param {string} appId - App ID
 * @returns {Promise<Object>} App details
 */
export const getMobileApp = async (appId) => {
  try {
    return await graphService.callMsGraph(`${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}`);
  } catch (error) {
    console.error(`Error fetching app ${appId}:`, error);
    throw error;
  }
};

/**
 * Create a Win32 app
 * @param {Object} appData - App configuration
 * @returns {Promise<Object>} Created app
 */
export const createWin32App = async (appData) => {
  try {
    const app = {
      '@odata.type': '#microsoft.graph.win32LobApp',
      displayName: appData.displayName,
      description: appData.description || '',
      publisher: appData.publisher || '',
      fileName: appData.fileName,
      installCommandLine: appData.installCommandLine,
      uninstallCommandLine: appData.uninstallCommandLine,
      installExperience: {
        runAsAccount: appData.runAsAccount || 'system',
        deviceRestartBehavior: appData.deviceRestartBehavior || 'allow'
      },
      detectionRules: appData.detectionRules || [],
      requirementRules: appData.requirementRules || [],
      rules: appData.rules || [],
      ...appData
    };
    
    return await graphService.callMsGraph(INTUNE_ENDPOINTS.MOBILE_APPS, 'POST', app);
  } catch (error) {
    console.error('Error creating Win32 app:', error);
    throw error;
  }
};

/**
 * Create content version for Win32 app
 * @param {string} appId - App ID
 * @returns {Promise<Object>} Content version
 */
export const createWin32AppContentVersion = async (appId) => {
  try {
    return await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}/microsoft.graph.win32LobApp/contentVersions`,
      'POST',
      {}
    );
  } catch (error) {
    console.error('Error creating content version:', error);
    throw error;
  }
};

/**
 * Create file for Win32 app content version
 * @param {string} appId - App ID
 * @param {string} contentVersionId - Content version ID
 * @param {Object} fileData - File information
 * @returns {Promise<Object>} File
 */
export const createWin32AppContentFile = async (appId, contentVersionId, fileData) => {
  try {
    const file = {
      '@odata.type': '#microsoft.graph.mobileAppContentFile',
      name: fileData.name,
      size: fileData.size,
      sizeEncrypted: fileData.sizeEncrypted,
      manifest: fileData.manifest
    };
    
    return await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}/microsoft.graph.win32LobApp/contentVersions/${contentVersionId}/files`,
      'POST',
      file
    );
  } catch (error) {
    console.error('Error creating content file:', error);
    throw error;
  }
};

/**
 * Get app install status for a device
 * @param {string} appId - App ID
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Install status
 */
export const getAppInstallStatus = async (appId, deviceId) => {
  try {
    const url = `${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}/deviceStatuses?$filter=deviceId eq '${deviceId}'`;
    const response = await graphService.callMsGraph(url);
    return response.value && response.value.length > 0 ? response.value[0] : null;
  } catch (error) {
    console.error(`Error fetching app install status:`, error);
    throw error;
  }
};

/**
 * Delete a mobile app
 * @param {string} appId - App ID
 * @returns {Promise<void>}
 */
export const deleteMobileApp = async (appId) => {
  try {
    await graphService.callMsGraph(`${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting app ${appId}:`, error);
    throw error;
  }
};

// ========== COMPLIANCE POLICIES ==========

/**
 * Get all device compliance policies
 * @returns {Promise<Array>} List of compliance policies
 */
export const getCompliancePolicies = async () => {
  try {
    const response = await graphService.callMsGraph(INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching compliance policies:', error);
    throw error;
  }
};

/**
 * Get a specific compliance policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object>} Policy details
 */
export const getCompliancePolicy = async (policyId) => {
  try {
    return await graphService.callMsGraph(`${INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES}/${policyId}`);
  } catch (error) {
    console.error(`Error fetching compliance policy ${policyId}:`, error);
    throw error;
  }
};

/**
 * Create a compliance policy
 * @param {Object} policyData - Policy configuration
 * @returns {Promise<Object>} Created policy
 */
export const createCompliancePolicy = async (policyData) => {
  try {
    return await graphService.callMsGraph(
      INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES,
      'POST',
      policyData
    );
  } catch (error) {
    console.error('Error creating compliance policy:', error);
    throw error;
  }
};

/**
 * Delete a compliance policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<void>}
 */
export const deleteCompliancePolicy = async (policyId) => {
  try {
    await graphService.callMsGraph(`${INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES}/${policyId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting compliance policy ${policyId}:`, error);
    throw error;
  }
};

// ========== CONFIGURATION POLICIES (Settings Catalog) ==========

/**
 * Get all configuration policies
 * @returns {Promise<Array>} List of configuration policies
 */
export const getConfigurationPolicies = async () => {
  try {
    const response = await graphService.callMsGraph(INTUNE_ENDPOINTS.CONFIGURATION_POLICIES);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching configuration policies:', error);
    throw error;
  }
};

/**
 * Get a specific configuration policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object>} Policy details
 */
export const getConfigurationPolicy = async (policyId) => {
  try {
    return await graphService.callMsGraph(`${INTUNE_ENDPOINTS.CONFIGURATION_POLICIES}/${policyId}`);
  } catch (error) {
    console.error(`Error fetching configuration policy ${policyId}:`, error);
    throw error;
  }
};

/**
 * Create a configuration policy from settings catalog
 * @param {Object} policyData - Policy configuration
 * @returns {Promise<Object>} Created policy
 */
export const createConfigurationPolicy = async (policyData) => {
  try {
    const policy = {
      name: policyData.name,
      description: policyData.description || '',
      platforms: policyData.platforms, // e.g., 'windows10', 'iOS', 'macOS', 'android'
      technologies: policyData.technologies, // e.g., 'mdm', 'windows10XManagement'
      settings: policyData.settings || [],
      ...policyData
    };
    
    return await graphService.callMsGraph(
      INTUNE_ENDPOINTS.CONFIGURATION_POLICIES,
      'POST',
      policy
    );
  } catch (error) {
    console.error('Error creating configuration policy:', error);
    throw error;
  }
};

/**
 * Update a configuration policy
 * @param {string} policyId - Policy ID
 * @param {Object} updates - Policy updates
 * @returns {Promise<Object>} Updated policy
 */
export const updateConfigurationPolicy = async (policyId, updates) => {
  try {
    return await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.CONFIGURATION_POLICIES}/${policyId}`,
      'PATCH',
      updates
    );
  } catch (error) {
    console.error(`Error updating configuration policy ${policyId}:`, error);
    throw error;
  }
};

/**
 * Delete a configuration policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<void>}
 */
export const deleteConfigurationPolicy = async (policyId) => {
  try {
    await graphService.callMsGraph(`${INTUNE_ENDPOINTS.CONFIGURATION_POLICIES}/${policyId}`, 'DELETE');
  } catch (error) {
    console.error(`Error deleting configuration policy ${policyId}:`, error);
    throw error;
  }
};

// ========== DEVICE CONFIGURATION PROFILES (Templates) ==========

/**
 * Get all device configuration profiles
 * @returns {Promise<Array>} List of configuration profiles
 */
export const getDeviceConfigurations = async () => {
  try {
    const response = await graphService.callMsGraph(INTUNE_ENDPOINTS.DEVICE_CONFIGURATIONS);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching device configurations:', error);
    throw error;
  }
};

/**
 * Create a device configuration profile from template
 * @param {Object} profileData - Profile configuration
 * @returns {Promise<Object>} Created profile
 */
export const createDeviceConfiguration = async (profileData) => {
  try {
    return await graphService.callMsGraph(
      INTUNE_ENDPOINTS.DEVICE_CONFIGURATIONS,
      'POST',
      profileData
    );
  } catch (error) {
    console.error('Error creating device configuration:', error);
    throw error;
  }
};

// ========== POLICY ASSIGNMENTS ==========

/**
 * Assign a policy to groups
 * @param {string} policyId - Policy ID
 * @param {string} policyType - Type: 'compliance', 'configuration', 'configurationPolicy'
 * @param {Array<Object>} assignments - Assignment configurations
 * @returns {Promise<void>}
 */
export const assignPolicy = async (policyId, policyType, assignments) => {
  try {
    let endpoint;
    
    switch (policyType) {
      case 'compliance':
        endpoint = `${INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES}/${policyId}/assign`;
        break;
      case 'configuration':
        endpoint = `${INTUNE_ENDPOINTS.DEVICE_CONFIGURATIONS}/${policyId}/assign`;
        break;
      case 'configurationPolicy':
        endpoint = `${INTUNE_ENDPOINTS.CONFIGURATION_POLICIES}/${policyId}/assign`;
        break;
      default:
        throw new Error(`Unknown policy type: ${policyType}`);
    }
    
    const payload = {
      assignments: assignments.map(assignment => ({
        '@odata.type': '#microsoft.graph.deviceConfigurationAssignment',
        target: {
          '@odata.type': assignment.targetType || '#microsoft.graph.groupAssignmentTarget',
          groupId: assignment.groupId
        }
      }))
    };
    
    await graphService.callMsGraph(endpoint, 'POST', payload);
  } catch (error) {
    console.error('Error assigning policy:', error);
    throw error;
  }
};

/**
 * Assign an app to groups
 * @param {string} appId - App ID
 * @param {Array<Object>} assignments - Assignment configurations
 * @returns {Promise<void>}
 */
export const assignApp = async (appId, assignments) => {
  try {
    const payload = {
      mobileAppAssignments: assignments.map(assignment => ({
        '@odata.type': '#microsoft.graph.mobileAppAssignment',
        intent: assignment.intent || 'required', // 'required', 'available', 'uninstall'
        target: {
          '@odata.type': assignment.targetType || '#microsoft.graph.groupAssignmentTarget',
          groupId: assignment.groupId
        },
        settings: assignment.settings || null
      }))
    };
    
    await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.MOBILE_APPS}/${appId}/assign`,
      'POST',
      payload
    );
  } catch (error) {
    console.error('Error assigning app:', error);
    throw error;
  }
};

/**
 * Get policy assignments
 * @param {string} policyId - Policy ID
 * @param {string} policyType - Policy type
 * @returns {Promise<Array>} List of assignments
 */
export const getPolicyAssignments = async (policyId, policyType) => {
  try {
    let endpoint;
    
    switch (policyType) {
      case 'compliance':
        endpoint = `${INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_POLICIES}/${policyId}/assignments`;
        break;
      case 'configuration':
        endpoint = `${INTUNE_ENDPOINTS.DEVICE_CONFIGURATIONS}/${policyId}/assignments`;
        break;
      case 'configurationPolicy':
        endpoint = `${INTUNE_ENDPOINTS.CONFIGURATION_POLICIES}/${policyId}/assignments`;
        break;
      default:
        throw new Error(`Unknown policy type: ${policyType}`);
    }
    
    const response = await graphService.callMsGraph(endpoint);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching policy assignments:', error);
    throw error;
  }
};

// ========== REPORTS ==========

/**
 * Get device compliance report
 * @returns {Promise<Object>} Compliance report data
 */
export const getDeviceComplianceReport = async () => {
  try {
    const response = await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.DEVICE_COMPLIANCE_REPORTS}/getDeviceCompliance`
    );
    return response;
  } catch (error) {
    console.error('Error fetching device compliance report:', error);
    throw error;
  }
};

/**
 * Export a report
 * @param {string} reportName - Report name
 * @param {Object} parameters - Report parameters
 * @returns {Promise<Object>} Export job
 */
export const exportReport = async (reportName, parameters = {}) => {
  try {
    const payload = {
      reportName,
      filter: parameters.filter || '',
      select: parameters.select || [],
      orderBy: parameters.orderBy || []
    };
    
    return await graphService.callMsGraph(
      `${INTUNE_ENDPOINTS.REPORTS}/exportJobs`,
      'POST',
      payload
    );
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Get common policy templates
 * @param {string} platform - Platform: 'windows', 'iOS', 'macOS', 'android'
 * @returns {Array<Object>} List of template definitions
 */
export const getPolicyTemplates = (platform = 'windows') => {
  const templates = {
    windows: [
      {
        id: 'bitlocker',
        name: '🔒 BitLocker Encryption',
        description: 'Enable and configure BitLocker drive encryption',
        category: 'Security',
        icon: '🔒',
        settings: [
          {
            definitionId: 'device_vendor_msft_bitlocker_requiredeviceencryption',
            value: true
          }
        ]
      },
      {
        id: 'firewall',
        name: '🛡️ Windows Firewall',
        description: 'Configure Windows Defender Firewall settings',
        category: 'Security',
        icon: '🛡️'
      },
      {
        id: 'defender',
        name: '🦠 Microsoft Defender Antivirus',
        description: 'Configure antivirus and threat protection settings',
        category: 'Security',
        icon: '🦠'
      },
      {
        id: 'edge',
        name: '🌐 Microsoft Edge Browser',
        description: 'Configure Microsoft Edge browser policies',
        category: 'Applications',
        icon: '🌐'
      },
      {
        id: 'wifi',
        name: '📶 Wi-Fi Configuration',
        description: 'Deploy Wi-Fi network profiles',
        category: 'Network',
        icon: '📶'
      },
      {
        id: 'vpn',
        name: '🔐 VPN Configuration',
        description: 'Deploy VPN connection profiles',
        category: 'Network',
        icon: '🔐'
      },
      {
        id: 'kiosk',
        name: '📱 Kiosk Mode',
        description: 'Configure single-app or multi-app kiosk mode',
        category: 'Device Configuration',
        icon: '📱'
      },
      {
        id: 'updates',
        name: '🔄 Windows Update',
        description: 'Configure Windows Update for Business policies',
        category: 'Updates',
        icon: '🔄'
      }
    ],
    iOS: [
      {
        id: 'restrictions',
        name: '🚫 Device Restrictions',
        description: 'Configure iOS/iPadOS device restrictions',
        category: 'Security',
        icon: '🚫'
      },
      {
        id: 'wifi-ios',
        name: '📶 Wi-Fi (iOS)',
        description: 'Deploy Wi-Fi profiles for iOS devices',
        category: 'Network',
        icon: '📶'
      }
    ],
    macOS: [
      {
        id: 'restrictions-macos',
        name: '🚫 Device Restrictions (macOS)',
        description: 'Configure macOS device restrictions',
        category: 'Security',
        icon: '🚫'
      },
      {
        id: 'edge-macos',
        name: '🌐 Microsoft Edge (macOS)',
        description: 'Configure Edge browser on macOS',
        category: 'Applications',
        icon: '🌐'
      }
    ],
    android: [
      {
        id: 'work-profile',
        name: '💼 Android Enterprise Work Profile',
        description: 'Configure work profile settings',
        category: 'Device Configuration',
        icon: '💼'
      }
    ]
  };
  
  return templates[platform] || [];
};

/**
 * Get device statistics
 * @returns {Promise<Object>} Device statistics
 */
export const getDeviceStatistics = async () => {
  try {
    const devices = await getManagedDevices();
    
    const stats = {
      total: devices.length,
      byPlatform: {},
      byCompliance: {
        compliant: 0,
        nonCompliant: 0,
        inGracePeriod: 0,
        configManager: 0,
        unknown: 0
      },
      byOwnership: {
        corporate: 0,
        personal: 0
      }
    };
    
    devices.forEach(device => {
      // Platform counts
      const os = device.operatingSystem || 'Unknown';
      stats.byPlatform[os] = (stats.byPlatform[os] || 0) + 1;
      
      // Compliance counts
      const compliance = device.complianceState || 'unknown';
      if (stats.byCompliance.hasOwnProperty(compliance)) {
        stats.byCompliance[compliance]++;
      }
      
      // Ownership counts
      if (device.managedDeviceOwnerType === 'company') {
        stats.byOwnership.corporate++;
      } else {
        stats.byOwnership.personal++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error calculating device statistics:', error);
    throw error;
  }
};

export default {
  // Device Management
  getManagedDevices,
  getManagedDevice,
  syncDevice,
  rebootDevice,
  remoteLockDevice,
  retireDevice,
  wipeDevice,
  getDeviceComplianceStatus,
  
  // Application Management
  getMobileApps,
  getMobileApp,
  createWin32App,
  createWin32AppContentVersion,
  createWin32AppContentFile,
  getAppInstallStatus,
  deleteMobileApp,
  
  // Compliance Policies
  getCompliancePolicies,
  getCompliancePolicy,
  createCompliancePolicy,
  deleteCompliancePolicy,
  
  // Configuration Policies
  getConfigurationPolicies,
  getConfigurationPolicy,
  createConfigurationPolicy,
  updateConfigurationPolicy,
  deleteConfigurationPolicy,
  
  // Device Configurations (Templates)
  getDeviceConfigurations,
  createDeviceConfiguration,
  
  // Assignments
  assignPolicy,
  assignApp,
  getPolicyAssignments,
  
  // Reports
  getDeviceComplianceReport,
  exportReport,
  
  // Utilities
  getPolicyTemplates,
  getDeviceStatistics,
};
