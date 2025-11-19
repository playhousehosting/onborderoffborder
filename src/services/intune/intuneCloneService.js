/**
 * Intune Clone Service
 * Bulk clone policies with pattern-based name transformations
 * Uses MSAL authentication via Convex proxy
 */

import msalGraphService from '../msalGraphService';

class IntuneCloneService {
  constructor() {
    this.policyTypeConfig = {
      deviceConfigurations: {
        endpoint: '/deviceManagement/deviceConfigurations',
        supportsClone: true
      },
      compliancePolicies: {
        endpoint: '/deviceManagement/deviceCompliancePolicies',
        supportsClone: true
      },
      configurationPolicies: {
        endpoint: '/deviceManagement/configurationPolicies',
        supportsClone: true
      },
      mobileApps: {
        endpoint: '/deviceAppManagement/mobileApps',
        supportsClone: false // Complex dependencies
      },
      appProtectionPolicies: {
        endpoint: '/deviceAppManagement/managedAppPolicies',
        supportsClone: true
      },
      appConfigurationPolicies: {
        endpoint: '/deviceAppManagement/mobileAppConfigurations',
        supportsClone: true
      },
      conditionalAccessPolicies: {
        endpoint: '/identity/conditionalAccess/policies',
        supportsClone: true
      },
      endpointSecurityPolicies: {
        endpoint: '/deviceManagement/intents',
        supportsClone: true
      },
      autopilotProfiles: {
        endpoint: '/deviceManagement/windowsAutopilotDeploymentProfiles',
        supportsClone: true
      },
      scripts: {
        endpoint: '/deviceManagement/deviceManagementScripts',
        supportsClone: true
      }
    };
  }

  /**
   * Clone multiple policies with name transformations
   * @param {Array} policies - Policies to clone
   * @param {Object} transformation - Name transformation rules
   * @param {Object} options - Clone options
   * @param {Function} onProgress - Progress callback
   */
  async clonePolicies(policies, transformation, options = {}, onProgress = null) {
    const results = {
      total: policies.length,
      cloned: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      
      try {
        // Check if policy type supports cloning
        const config = this.policyTypeConfig[policy.policyType];
        if (!config || !config.supportsClone) {
          results.skipped++;
          results.details.push({
            originalName: policy.displayName || policy.name,
            status: 'skipped',
            reason: 'Policy type does not support cloning'
          });
          
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: policies.length,
              percentage: Math.round(((i + 1) / policies.length) * 100),
              currentPolicy: policy.displayName || policy.name
            });
          }
          continue;
        }

        // Transform policy name
        const newName = this.transformPolicyName(
          policy.displayName || policy.name,
          transformation
        );

        // Check if name already exists
        if (options.checkDuplicates !== false) {
          const exists = await this.policyNameExists(
            config.endpoint,
            newName,
            policy['@odata.type']
          );

          if (exists) {
            results.skipped++;
            results.details.push({
              originalName: policy.displayName || policy.name,
              newName,
              status: 'skipped',
              reason: 'Policy with this name already exists'
            });

            if (onProgress) {
              onProgress({
                current: i + 1,
                total: policies.length,
                percentage: Math.round(((i + 1) / policies.length) * 100),
                currentPolicy: policy.displayName || policy.name
              });
            }
            continue;
          }
        }

        // Clone the policy
        const clonedPolicy = await this.cloneSinglePolicy(
          policy,
          newName,
          config.endpoint,
          options
        );

        results.cloned++;
        results.details.push({
          originalName: policy.displayName || policy.name,
          newName,
          status: 'success',
          id: clonedPolicy.id
        });

      } catch (error) {
        console.error('Clone error:', error);
        results.failed++;
        results.details.push({
          originalName: policy.displayName || policy.name,
          status: 'failed',
          error: error.message
        });
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: policies.length,
          percentage: Math.round(((i + 1) / policies.length) * 100),
          currentPolicy: policy.displayName || policy.name,
          results
        });
      }
    }

    return results;
  }

  /**
   * Clone a single policy
   */
  async cloneSinglePolicy(policy, newName, endpoint, options = {}) {
    // Clean policy for creation
    const cleanedPolicy = this.cleanPolicyForClone(policy);
    cleanedPolicy.displayName = newName;
    if (cleanedPolicy.name) {
      cleanedPolicy.name = newName;
    }

    // Create the cloned policy
    const response = await msalGraphService.makeRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanedPolicy)
    });

    // Clone assignments if requested
    if (options.cloneAssignments !== false && policy._assignments) {
      await this.cloneAssignments(
        endpoint,
        response.id,
        policy._assignments,
        options.assignmentMapping
      );
    }

    return response;
  }

  /**
   * Clean policy for cloning (remove read-only properties)
   */
  cleanPolicyForClone(policy) {
    const cleaned = { ...policy };

    // Remove read-only and metadata properties
    const removeProps = [
      'id',
      'createdDateTime',
      'lastModifiedDateTime',
      'version',
      'supportsScopeTags',
      'isAssigned',
      '_metadata',
      '_assignments',
      '_scriptContent',
      '@odata.context',
      '@odata.etag',
      'roleScopeTagIds', // Will be set to default
      'deployedAppCount',
      'deviceStatuses',
      'userStatuses',
      'deviceStatusOverview',
      'userStatusOverview',
      'installSummary'
    ];

    removeProps.forEach(prop => delete cleaned[prop]);

    // Reset roleScopeTagIds to default (0 = default scope tag)
    if (!cleaned.roleScopeTagIds) {
      cleaned.roleScopeTagIds = [0];
    }

    return cleaned;
  }

  /**
   * Transform policy name based on pattern
   */
  transformPolicyName(originalName, transformation) {
    let newName = originalName;

    // Apply prefix
    if (transformation.prefix) {
      newName = transformation.prefix + newName;
    }

    // Apply suffix
    if (transformation.suffix) {
      newName = newName + transformation.suffix;
    }

    // Apply find/replace
    if (transformation.find && transformation.replace !== undefined) {
      const regex = new RegExp(transformation.find, 'g');
      newName = newName.replace(regex, transformation.replace);
    }

    // Apply pattern (e.g., "{name} - Copy", "{name} (v2)")
    if (transformation.pattern) {
      newName = transformation.pattern.replace('{name}', originalName);
    }

    return newName;
  }

  /**
   * Check if policy name already exists
   */
  async policyNameExists(endpoint, name, odataType) {
    try {
      const filter = `displayName eq '${name.replace(/'/g, "''")}'`;
      const response = await msalGraphService.makeRequest(
        `${endpoint}?$filter=${encodeURIComponent(filter)}`,
        { method: 'GET' }
      );

      if (response.value && response.value.length > 0) {
        // If odataType provided, check for exact match
        if (odataType) {
          return response.value.some(p => p['@odata.type'] === odataType);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking policy name:', error);
      return false; // Assume doesn't exist on error
    }
  }

  /**
   * Clone assignments to new policy
   */
  async cloneAssignments(baseEndpoint, policyId, assignments, mapping = null) {
    if (!assignments || assignments.length === 0) {
      return;
    }

    // Map assignments if mapping provided
    let mappedAssignments = assignments;
    if (mapping) {
      mappedAssignments = assignments.map(assignment => {
        const target = assignment.target;
        if (target?.groupId && mapping[target.groupId]) {
          return {
            ...assignment,
            target: {
              ...target,
              groupId: mapping[target.groupId]
            }
          };
        }
        return assignment;
      });
    }

    // Clean assignments (remove IDs)
    const cleanedAssignments = mappedAssignments.map(a => {
      const cleaned = { ...a };
      delete cleaned.id;
      return cleaned;
    });

    // POST assignments
    const assignEndpoint = `${baseEndpoint}/${policyId}/assign`;
    await msalGraphService.makeRequest(assignEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignments: cleanedAssignments
      })
    });
  }

  /**
   * Preview name transformations without cloning
   */
  previewTransformations(policies, transformation) {
    return policies.map(policy => ({
      originalName: policy.displayName || policy.name,
      newName: this.transformPolicyName(
        policy.displayName || policy.name,
        transformation
      ),
      policyType: policy.policyType,
      supportsClone: this.policyTypeConfig[policy.policyType]?.supportsClone || false
    }));
  }

  /**
   * Get supported policy types for cloning
   */
  getSupportedTypes() {
    return Object.entries(this.policyTypeConfig)
      .filter(([_, config]) => config.supportsClone)
      .map(([key, config]) => ({
        key,
        endpoint: config.endpoint
      }));
  }

  /**
   * Validate transformation rules
   */
  validateTransformation(transformation) {
    const errors = [];

    // Must have at least one transformation rule
    const hasRule = transformation.prefix || 
                    transformation.suffix || 
                    transformation.find || 
                    transformation.pattern;

    if (!hasRule) {
      errors.push('At least one transformation rule is required');
    }

    // If find is provided, replace must be provided
    if (transformation.find && transformation.replace === undefined) {
      errors.push('Replace value is required when using find');
    }

    // Pattern must contain {name} placeholder
    if (transformation.pattern && !transformation.pattern.includes('{name}')) {
      errors.push('Pattern must contain {name} placeholder');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const intuneCloneService = new IntuneCloneService();

export default intuneCloneService;
