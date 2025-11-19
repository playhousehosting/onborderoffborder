/**
 * Intune Import Service
 * Imports Intune policies from JSON backup files
 * Handles assignment mapping and conflict resolution
 * Uses MSAL authentication via Convex proxy
 */

import msalGraphService from '../msalGraphService';

// Import modes
export const IMPORT_MODES = {
  ALWAYS: 'always', // Always create new policies
  SKIP: 'skip', // Skip if policy with same name exists
  REPLACE: 'replace', // Delete existing and create new
  UPDATE: 'update' // Update existing policy settings
};

class IntuneImportService {
  constructor() {
    this.importStats = {
      totalPolicies: 0,
      importedPolicies: 0,
      skippedPolicies: 0,
      failedPolicies: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Import policies from JSON backup
   * @param {Object} importData - The backup data to import
   * @param {Object} options - Import options
   * @param {string} options.mode - Import mode (always, skip, replace, update)
   * @param {Object} options.assignmentMapping - Group/user ID mapping for cross-tenant migration
   * @param {Array<string>} options.selectedTypes - Policy types to import (if null, imports all)
   * @param {Function} onProgress - Progress callback (current, total, message)
   * @returns {Promise<Object>} Import results
   */
  async importPolicies(importData, options = {}, onProgress = null) {
    this.importStats = {
      totalPolicies: 0,
      importedPolicies: 0,
      skippedPolicies: 0,
      failedPolicies: 0,
      startTime: new Date().toISOString(),
      endTime: null,
      errors: []
    };

    const mode = options.mode || IMPORT_MODES.ALWAYS;
    const assignmentMapping = options.assignmentMapping || {};
    const selectedTypes = options.selectedTypes || Object.keys(importData.policies || {});

    const results = {
      success: [],
      skipped: [],
      failed: [],
      importStats: {}
    };

    try {
      if (onProgress) onProgress(0, 100, 'Starting import...');

      // Validate import data
      if (!importData.policies) {
        throw new Error('Invalid import file: missing policies data');
      }

      // Calculate total policies to import
      let totalItems = 0;
      selectedTypes.forEach(type => {
        const policies = importData.policies[type] || [];
        totalItems += policies.length;
      });

      this.importStats.totalPolicies = totalItems;

      if (totalItems === 0) {
        throw new Error('No policies selected for import');
      }

      let currentItem = 0;

      // Import each policy type
      for (const policyType of selectedTypes) {
        const policies = importData.policies[policyType] || [];
        
        if (policies.length === 0) continue;

        for (const policy of policies) {
          currentItem++;
          const progress = Math.round((currentItem / totalItems) * 100);
          const policyName = policy.displayName || policy.name || 'Unknown';

          if (onProgress) {
            onProgress(progress, 100, `Importing ${policyName}...`);
          }

          try {
            const result = await this.importSinglePolicy(
              policy,
              policyType,
              mode,
              assignmentMapping
            );

            if (result.action === 'imported') {
              results.success.push({
                name: policyName,
                type: policyType,
                id: result.id
              });
              this.importStats.importedPolicies++;
            } else if (result.action === 'skipped') {
              results.skipped.push({
                name: policyName,
                type: policyType,
                reason: result.reason
              });
              this.importStats.skippedPolicies++;
            }

          } catch (error) {
            console.error(`Failed to import ${policyName}:`, error);
            results.failed.push({
              name: policyName,
              type: policyType,
              error: error.message
            });
            this.importStats.failedPolicies++;
            this.importStats.errors.push({
              policy: policyName,
              error: error.message
            });
          }
        }
      }

      this.importStats.endTime = new Date().toISOString();
      results.importStats = { ...this.importStats };

      if (onProgress) onProgress(100, 100, 'Import complete!');

      return results;

    } catch (error) {
      console.error('Import failed:', error);
      this.importStats.endTime = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Import a single policy
   */
  async importSinglePolicy(policy, policyType, mode, assignmentMapping) {
    const policyName = policy.displayName || policy.name;
    const endpoint = this.getEndpointForType(policyType);

    // Check if policy exists
    if (mode === IMPORT_MODES.SKIP || mode === IMPORT_MODES.REPLACE || mode === IMPORT_MODES.UPDATE) {
      const existing = await this.findExistingPolicy(endpoint, policyName, policy['@odata.type']);
      
      if (existing) {
        if (mode === IMPORT_MODES.SKIP) {
          return {
            action: 'skipped',
            reason: 'Policy already exists'
          };
        }

        if (mode === IMPORT_MODES.REPLACE) {
          await this.deletePolicy(endpoint, existing.id);
          // Continue to create new policy below
        }

        if (mode === IMPORT_MODES.UPDATE) {
          const updatedId = await this.updatePolicy(endpoint, existing.id, policy);
          // Update assignments
          if (policy._assignments) {
            await this.updateAssignments(
              endpoint,
              updatedId,
              policy._assignments,
              assignmentMapping
            );
          }
          return {
            action: 'imported',
            id: updatedId,
            method: 'updated'
          };
        }
      }
    }

    // Create new policy
    const cleanedPolicy = this.cleanPolicyForImport(policy);
    const created = await this.createPolicy(endpoint, cleanedPolicy);

    // Apply assignments
    if (policy._assignments && policy._assignments.length > 0) {
      await this.createAssignments(
        endpoint,
        created.id,
        policy._assignments,
        assignmentMapping
      );
    }

    return {
      action: 'imported',
      id: created.id,
      method: 'created'
    };
  }

  /**
   * Clean policy data for import (remove read-only properties)
   */
  cleanPolicyForImport(policy) {
    const cleaned = { ...policy };
    
    // Remove metadata
    delete cleaned._metadata;
    delete cleaned._assignments;
    delete cleaned._scriptContent;
    
    // Remove read-only properties
    delete cleaned.id;
    delete cleaned.createdDateTime;
    delete cleaned.lastModifiedDateTime;
    delete cleaned.version;
    delete cleaned.isAssigned;
    delete cleaned.roleScopeTagIds;
    
    return cleaned;
  }

  /**
   * Find existing policy by name
   */
  async findExistingPolicy(baseEndpoint, name, odataType) {
    try {
      let filter = `displayName eq '${name.replace(/'/g, "''")}'`;
      
      // For some types, use 'name' instead of 'displayName'
      if (odataType?.includes('managedAppProtection') || odataType?.includes('windowsInformationProtection')) {
        filter = `name eq '${name.replace(/'/g, "''")}'`;
      }

      const endpoint = `${baseEndpoint}?$filter=${encodeURIComponent(filter)}`;
      const response = await msalGraphService.makeRequest(endpoint);
      
      if (response.value && response.value.length > 0) {
        return response.value[0];
      }
      return null;
    } catch (error) {
      console.warn('Error finding existing policy:', error);
      return null;
    }
  }

  /**
   * Create new policy
   */
  async createPolicy(endpoint, policy) {
    try {
      const response = await msalGraphService.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(policy)
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to create policy: ${error.message}`);
    }
  }

  /**
   * Update existing policy
   */
  async updatePolicy(endpoint, policyId, policy) {
    try {
      const updateEndpoint = `${endpoint}/${policyId}`;
      const cleanedPolicy = this.cleanPolicyForImport(policy);
      
      await msalGraphService.makeRequest(updateEndpoint, {
        method: 'PATCH',
        body: JSON.stringify(cleanedPolicy)
      });
      
      return policyId;
    } catch (error) {
      throw new Error(`Failed to update policy: ${error.message}`);
    }
  }

  /**
   * Delete policy
   */
  async deletePolicy(endpoint, policyId) {
    try {
      const deleteEndpoint = `${endpoint}/${policyId}`;
      await msalGraphService.makeRequest(deleteEndpoint, {
        method: 'DELETE'
      });
    } catch (error) {
      throw new Error(`Failed to delete policy: ${error.message}`);
    }
  }

  /**
   * Create assignments for imported policy
   */
  async createAssignments(baseEndpoint, policyId, assignments, mapping) {
    try {
      const mappedAssignments = this.mapAssignments(assignments, mapping);
      
      if (mappedAssignments.length === 0) {
        return; // No valid assignments to create
      }

      const endpoint = `${baseEndpoint}/${policyId}/assignments`;
      
      for (const assignment of mappedAssignments) {
        try {
          await msalGraphService.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(assignment)
          });
        } catch (error) {
          console.warn(`Failed to create assignment:`, error);
          // Continue with other assignments
        }
      }
    } catch (error) {
      console.warn('Error creating assignments:', error);
      // Don't fail the entire import if assignments fail
    }
  }

  /**
   * Update assignments for existing policy
   */
  async updateAssignments(baseEndpoint, policyId, assignments, mapping) {
    try {
      // Delete existing assignments
      const existingEndpoint = `${baseEndpoint}/${policyId}/assignments`;
      const existing = await msalGraphService.makeRequest(existingEndpoint);
      
      if (existing.value && existing.value.length > 0) {
        for (const assignment of existing.value) {
          try {
            await msalGraphService.makeRequest(`${existingEndpoint}/${assignment.id}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.warn('Failed to delete assignment:', error);
          }
        }
      }

      // Create new assignments
      await this.createAssignments(baseEndpoint, policyId, assignments, mapping);
    } catch (error) {
      console.warn('Error updating assignments:', error);
    }
  }

  /**
   * Map assignments using migration table
   */
  mapAssignments(assignments, mapping) {
    const mapped = [];

    for (const assignment of assignments) {
      const target = assignment.target;
      
      if (!target) continue;

      // Map group assignments
      if (target.groupId) {
        const newGroupId = mapping.groups?.[target.groupId];
        if (newGroupId) {
          mapped.push({
            ...assignment,
            target: {
              ...target,
              groupId: newGroupId
            }
          });
        } else {
          console.warn(`No mapping found for group: ${target.groupId}`);
        }
      }
      // All Users/All Devices assignments don't need mapping
      else if (target['@odata.type']?.includes('allLicensedUsersAssignmentTarget') ||
               target['@odata.type']?.includes('allDevicesAssignmentTarget')) {
        mapped.push(assignment);
      }
    }

    return mapped;
  }

  /**
   * Get Graph API endpoint for policy type
   */
  getEndpointForType(policyType) {
    const endpoints = {
      deviceConfigurations: '/deviceManagement/deviceConfigurations',
      compliancePolicies: '/deviceManagement/deviceCompliancePolicies',
      configurationPolicies: '/deviceManagement/configurationPolicies',
      mobileApps: '/deviceAppManagement/mobileApps',
      appProtectionPolicies: '/deviceAppManagement/managedAppPolicies',
      appConfigurationPolicies: '/deviceAppManagement/mobileAppConfigurations',
      conditionalAccessPolicies: '/identity/conditionalAccess/policies',
      endpointSecurityPolicies: '/deviceManagement/intents',
      enrollmentRestrictions: '/deviceManagement/deviceEnrollmentConfigurations',
      autopilotProfiles: '/deviceManagement/windowsAutopilotDeploymentProfiles',
      scripts: '/deviceManagement/deviceManagementScripts',
      policySets: '/deviceAppManagement/policySets',
      scopeTags: '/deviceManagement/roleScopeTags',
      roleDefinitions: '/deviceManagement/roleDefinitions'
    };

    return endpoints[policyType] || '/deviceManagement/deviceConfigurations';
  }

  /**
   * Validate import file
   */
  validateImportFile(importData) {
    const errors = [];

    if (!importData) {
      errors.push('Import file is empty or invalid');
      return { valid: false, errors };
    }

    if (!importData.policies) {
      errors.push('Missing policies data in import file');
    }

    if (!importData.exportDate) {
      errors.push('Missing export date in import file');
    }

    if (importData.policies) {
      const policyCount = Object.values(importData.policies)
        .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      
      if (policyCount === 0) {
        errors.push('No policies found in import file');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      policyCount: importData.statistics?.totalPolicies || 0,
      exportDate: importData.exportDate,
      organization: importData.organization
    };
  }

  /**
   * Get import statistics
   */
  getImportStats() {
    return { ...this.importStats };
  }
}

// Export singleton instance
export const intuneImportService = new IntuneImportService();

export default intuneImportService;
