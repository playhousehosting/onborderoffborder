/**
 * Intune Export Service
 * Exports Intune policies, configurations, and assignments to JSON files
 * Supports all policy types from Microsoft Graph API
 */

import msalGraphService from '../msalGraphService';

// Use your existing MSAL Graph Service
const graphService = msalGraphService;

// Policy type definitions with Graph API endpoints
const POLICY_TYPES = {
  deviceConfigurations: {
    endpoint: '/deviceManagement/deviceConfigurations',
    name: 'Device Configurations',
    folder: 'DeviceConfigurations',
    supportsAssignments: true
  },
  compliancePolicies: {
    endpoint: '/deviceManagement/deviceCompliancePolicies',
    name: 'Compliance Policies',
    folder: 'CompliancePolicies',
    supportsAssignments: true
  },
  configurationPolicies: {
    endpoint: '/deviceManagement/configurationPolicies',
    name: 'Settings Catalog',
    folder: 'SettingsCatalog',
    supportsAssignments: true
  },
  mobileApps: {
    endpoint: '/deviceAppManagement/mobileApps',
    name: 'Applications',
    folder: 'Applications',
    supportsAssignments: true,
    filter: "isAssigned eq true or (microsoft.graph.managedApp/appAvailability eq null or microsoft.graph.managedApp/appAvailability eq 'lineOfBusiness' or isAssigned eq true)"
  },
  appProtectionPolicies: {
    endpoint: '/deviceAppManagement/managedAppPolicies',
    name: 'App Protection Policies',
    folder: 'AppProtection',
    supportsAssignments: true
  },
  appConfigurationPolicies: {
    endpoint: '/deviceAppManagement/mobileAppConfigurations',
    name: 'App Configuration Policies',
    folder: 'AppConfiguration',
    supportsAssignments: true
  },
  conditionalAccessPolicies: {
    endpoint: '/identity/conditionalAccess/policies',
    name: 'Conditional Access',
    folder: 'ConditionalAccess',
    supportsAssignments: false
  },
  endpointSecurityPolicies: {
    endpoint: '/deviceManagement/intents',
    name: 'Endpoint Security',
    folder: 'EndpointSecurity',
    supportsAssignments: true
  },
  enrollmentRestrictions: {
    endpoint: '/deviceManagement/deviceEnrollmentConfigurations',
    name: 'Enrollment Restrictions',
    folder: 'EnrollmentRestrictions',
    supportsAssignments: true
  },
  autopilotProfiles: {
    endpoint: '/deviceManagement/windowsAutopilotDeploymentProfiles',
    name: 'Autopilot Profiles',
    folder: 'AutopilotProfiles',
    supportsAssignments: true
  },
  scripts: {
    endpoint: '/deviceManagement/deviceManagementScripts',
    name: 'PowerShell Scripts',
    folder: 'Scripts',
    supportsAssignments: true,
    includeContent: true
  },
  policySets: {
    endpoint: '/deviceAppManagement/policySets',
    name: 'Policy Sets',
    folder: 'PolicySets',
    supportsAssignments: true
  },
  scopeTags: {
    endpoint: '/deviceManagement/roleScopeTags',
    name: 'Scope Tags',
    folder: 'ScopeTags',
    supportsAssignments: false
  },
  roleDefinitions: {
    endpoint: '/deviceManagement/roleDefinitions',
    name: 'Role Definitions',
    folder: 'RoleDefinitions',
    supportsAssignments: false
  }
};

class IntuneExportService {
  constructor() {
    this.exportStats = {
      totalPolicies: 0,
      exportedPolicies: 0,
      failedPolicies: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Export all selected policy types
   * @param {Array<string>} policyTypes - Array of policy type keys to export
   * @param {Object} options - Export options
   * @param {Function} onProgress - Progress callback (current, total, message)
   * @returns {Promise<Object>} Export manifest with metadata
   */
  async exportPolicies(policyTypes, options = {}, onProgress = null) {
    this.exportStats = {
      totalPolicies: 0,
      exportedPolicies: 0,
      failedPolicies: 0,
      startTime: new Date().toISOString(),
      endTime: null
    };

    const exportData = {
      exportDate: new Date().toISOString(),
      organization: null,
      policies: {},
      migrationTable: {
        groups: {},
        users: {}
      },
      statistics: {}
    };

    try {
      // Get organization info
      if (onProgress) onProgress(0, 100, 'Fetching organization information...');
      exportData.organization = await this.getOrganizationInfo();

      // Calculate total items to export
      let totalItems = policyTypes.length;
      let currentItem = 0;

      // Export each policy type
      for (const policyType of policyTypes) {
        const typeConfig = POLICY_TYPES[policyType];
        if (!typeConfig) {
          console.warn(`Unknown policy type: ${policyType}`);
          continue;
        }

        currentItem++;
        const progress = Math.round((currentItem / totalItems) * 100);
        
        if (onProgress) {
          onProgress(progress, 100, `Exporting ${typeConfig.name}...`);
        }

        try {
          const policies = await this.exportPolicyType(
            policyType,
            typeConfig,
            options,
            (subProgress, subMessage) => {
              if (onProgress) {
                onProgress(progress, 100, `${typeConfig.name}: ${subMessage}`);
              }
            }
          );

          exportData.policies[policyType] = policies;
          exportData.statistics[policyType] = policies.length;
          this.exportStats.totalPolicies += policies.length;
          this.exportStats.exportedPolicies += policies.length;

        } catch (error) {
          console.error(`Error exporting ${typeConfig.name}:`, error);
          exportData.policies[policyType] = [];
          exportData.statistics[policyType] = 0;
          this.exportStats.failedPolicies++;
        }
      }

      this.exportStats.endTime = new Date().toISOString();
      exportData.exportStats = { ...this.exportStats };

      if (onProgress) onProgress(100, 100, 'Export complete!');

      return exportData;

    } catch (error) {
      console.error('Error during export:', error);
      throw error;
    }
  }

  /**
   * Export a single policy type
   */
  async exportPolicyType(policyType, typeConfig, options, onProgress) {
    try {
      // Fetch policies
      if (onProgress) onProgress(0, 'Fetching policies...');
      
      let endpoint = typeConfig.endpoint;
      if (typeConfig.filter) {
        endpoint += `?$filter=${encodeURIComponent(typeConfig.filter)}`;
      }

      const response = await graphService.makeRequest(endpoint);
      const policies = response.value || [];

      if (policies.length === 0) {
        if (onProgress) onProgress(100, 'No policies found');
        return [];
      }

      const exportedPolicies = [];
      const total = policies.length;

      // Export each policy
      for (let i = 0; i < policies.length; i++) {
        const policy = policies[i];
        const progress = Math.round(((i + 1) / total) * 100);
        
        if (onProgress) {
          onProgress(progress, `Exporting ${policy.displayName || policy.name || 'policy'} (${i + 1}/${total})`);
        }

        const exportedPolicy = {
          ...policy,
          '@odata.type': policy['@odata.type'],
          _metadata: {
            exportDate: new Date().toISOString(),
            policyType: policyType,
            originalId: policy.id
          }
        };

        // Export assignments if supported
        if (typeConfig.supportsAssignments && options.includeAssignments !== false) {
          try {
            exportedPolicy._assignments = await this.getAssignments(policy.id, typeConfig.endpoint);
          } catch (error) {
            console.warn(`Could not fetch assignments for ${policy.displayName}:`, error);
            exportedPolicy._assignments = [];
          }
        }

        // Export script content if this is a script
        if (typeConfig.includeContent && policy.id) {
          try {
            exportedPolicy._scriptContent = await this.getScriptContent(policy.id);
          } catch (error) {
            console.warn(`Could not fetch script content for ${policy.displayName}:`, error);
          }
        }

        exportedPolicies.push(exportedPolicy);
      }

      return exportedPolicies;

    } catch (error) {
      console.error(`Error exporting ${typeConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Get policy assignments
   */
  async getAssignments(policyId, baseEndpoint) {
    try {
      const endpoint = `${baseEndpoint}/${policyId}/assignments`;
      const response = await graphService.makeRequest(endpoint);
      return response.value || [];
    } catch (error) {
      // Silently return empty if 404 or permission denied
      if (error.message?.includes('404') || error.message?.includes('403')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get script content
   */
  async getScriptContent(scriptId) {
    try {
      const endpoint = `/deviceManagement/deviceManagementScripts/${scriptId}`;
      const response = await graphService.makeRequest(endpoint);
      
      // Decode base64 script content
      if (response.scriptContent) {
        return atob(response.scriptContent);
      }
      return null;
    } catch (error) {
      console.warn('Could not fetch script content:', error);
      return null;
    }
  }

  /**
   * Get organization information
   */
  async getOrganizationInfo() {
    try {
      const response = await graphService.makeRequest('/organization');
      const org = response.value?.[0];
      
      return {
        name: org?.displayName || 'Unknown Organization',
        tenantId: org?.id,
        verifiedDomains: org?.verifiedDomains?.map(d => d.name) || []
      };
    } catch (error) {
      console.warn('Could not fetch organization info:', error);
      return {
        name: 'Unknown Organization',
        tenantId: null,
        verifiedDomains: []
      };
    }
  }

  /**
   * Generate export manifest
   */
  generateManifest(exportData) {
    const totalPolicies = Object.values(exportData.statistics || {})
      .reduce((sum, count) => sum + count, 0);

    return {
      exportDate: exportData.exportDate,
      organization: exportData.organization,
      statistics: {
        ...exportData.statistics,
        totalPolicies
      },
      exportStats: exportData.exportStats,
      policyTypes: Object.keys(exportData.policies).map(key => ({
        key,
        name: POLICY_TYPES[key]?.name,
        count: exportData.statistics[key] || 0
      }))
    };
  }

  /**
   * Download export as JSON files (browser download)
   */
  async downloadExport(exportData, format = 'json') {
    try {
      if (format === 'json') {
        // Create a single JSON file with all data
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `intune-export-${exportData.organization?.name || 'backup'}-${timestamp}.json`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return filename;
      }
    } catch (error) {
      console.error('Error downloading export:', error);
      throw error;
    }
  }

  /**
   * Get available policy types for export
   */
  getAvailablePolicyTypes() {
    return Object.keys(POLICY_TYPES).map(key => ({
      key,
      ...POLICY_TYPES[key]
    }));
  }

  /**
   * Get export statistics
   */
  getExportStats() {
    return { ...this.exportStats };
  }
}

// Export singleton instance
export const intuneExportService = new IntuneExportService();

export default intuneExportService;
