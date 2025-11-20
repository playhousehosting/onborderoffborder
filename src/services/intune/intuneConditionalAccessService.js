/**
 * Intune Conditional Access Service
 * Manages Conditional Access policies for Zero Trust security
 */

import msalGraphService from '../msalGraphService.js';

class IntuneConditionalAccessService {
  constructor() {
    this.graphService = msalGraphService;
  }

  /**
   * Fetch all conditional access policies
   */
  async getConditionalAccessPolicies() {
    try {
      const response = await this.graphService.makeRequest(
        '/identity/conditionalAccess/policies'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching conditional access policies:', error);
      throw error;
    }
  }

  /**
   * Get specific conditional access policy
   */
  async getConditionalAccessPolicy(policyId) {
    try {
      const response = await this.graphService.makeRequest(
        `/identity/conditionalAccess/policies/${policyId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching conditional access policy:', error);
      throw error;
    }
  }

  /**
   * Create conditional access policy
   */
  async createConditionalAccessPolicy(policy) {
    try {
      const response = await this.graphService.makeRequest(
        '/identity/conditionalAccess/policies',
        'POST',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error creating conditional access policy:', error);
      throw error;
    }
  }

  /**
   * Update conditional access policy
   */
  async updateConditionalAccessPolicy(policyId, policy) {
    try {
      const response = await this.graphService.makeRequest(
        `/identity/conditionalAccess/policies/${policyId}`,
        'PATCH',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error updating conditional access policy:', error);
      throw error;
    }
  }

  /**
   * Delete conditional access policy
   */
  async deleteConditionalAccessPolicy(policyId) {
    try {
      await this.graphService.makeRequest(
        `/identity/conditionalAccess/policies/${policyId}`,
        'DELETE'
      );
      return true;
    } catch (error) {
      console.error('Error deleting conditional access policy:', error);
      throw error;
    }
  }

  /**
   * Get named locations (for IP-based conditions)
   */
  async getNamedLocations() {
    try {
      const response = await this.graphService.makeRequest(
        '/identity/conditionalAccess/namedLocations'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching named locations:', error);
      throw error;
    }
  }

  /**
   * Analyze policy conditions
   */
  analyzePolicyConditions(policy) {
    const analysis = {
      userConditions: [],
      deviceConditions: [],
      locationConditions: [],
      appConditions: [],
      riskConditions: [],
      grantControls: [],
      sessionControls: []
    };

    // User conditions
    if (policy.conditions?.users) {
      const users = policy.conditions.users;
      if (users.includeUsers?.includes('All')) {
        analysis.userConditions.push('All users');
      } else if (users.includeUsers?.length > 0) {
        analysis.userConditions.push(`${users.includeUsers.length} specific users`);
      }
      if (users.includeGroups?.length > 0) {
        analysis.userConditions.push(`${users.includeGroups.length} groups`);
      }
      if (users.excludeUsers?.length > 0) {
        analysis.userConditions.push(`Excludes ${users.excludeUsers.length} users`);
      }
    }

    // Device conditions
    if (policy.conditions?.platforms) {
      const platforms = policy.conditions.platforms;
      if (platforms.includePlatforms?.includes('all')) {
        analysis.deviceConditions.push('All platforms');
      } else if (platforms.includePlatforms?.length > 0) {
        analysis.deviceConditions.push(platforms.includePlatforms.join(', '));
      }
    }

    if (policy.conditions?.deviceStates) {
      analysis.deviceConditions.push('Device state conditions');
    }

    // Location conditions
    if (policy.conditions?.locations) {
      const locations = policy.conditions.locations;
      if (locations.includeLocations?.includes('All')) {
        analysis.locationConditions.push('All locations');
      } else if (locations.includeLocations?.length > 0) {
        analysis.locationConditions.push(`${locations.includeLocations.length} locations`);
      }
    }

    // Application conditions
    if (policy.conditions?.applications) {
      const apps = policy.conditions.applications;
      if (apps.includeApplications?.includes('All')) {
        analysis.appConditions.push('All cloud apps');
      } else if (apps.includeApplications?.length > 0) {
        analysis.appConditions.push(`${apps.includeApplications.length} apps`);
      }
    }

    // Risk conditions
    if (policy.conditions?.signInRiskLevels?.length > 0) {
      analysis.riskConditions.push(`Sign-in risk: ${policy.conditions.signInRiskLevels.join(', ')}`);
    }
    if (policy.conditions?.userRiskLevels?.length > 0) {
      analysis.riskConditions.push(`User risk: ${policy.conditions.userRiskLevels.join(', ')}`);
    }

    // Grant controls
    if (policy.grantControls) {
      const grant = policy.grantControls;
      if (grant.operator) {
        analysis.grantControls.push(`Operator: ${grant.operator}`);
      }
      if (grant.builtInControls?.length > 0) {
        analysis.grantControls.push(...grant.builtInControls);
      }
    }

    // Session controls
    if (policy.sessionControls) {
      const session = policy.sessionControls;
      if (session.applicationEnforcedRestrictions?.isEnabled) {
        analysis.sessionControls.push('App enforced restrictions');
      }
      if (session.cloudAppSecurity?.isEnabled) {
        analysis.sessionControls.push('Cloud App Security');
      }
      if (session.signInFrequency?.isEnabled) {
        analysis.sessionControls.push(`Sign-in frequency: ${session.signInFrequency.value} ${session.signInFrequency.type}`);
      }
      if (session.persistentBrowser?.isEnabled) {
        analysis.sessionControls.push(`Persistent browser: ${session.persistentBrowser.mode}`);
      }
    }

    return analysis;
  }

  /**
   * Get policy templates for quick creation
   */
  getPolicyTemplates() {
    return {
      mfaAllUsers: {
        displayName: 'Require MFA for All Users',
        state: 'disabled',
        conditions: {
          users: {
            includeUsers: ['All'],
            excludeUsers: [],
            includeGroups: [],
            excludeGroups: []
          },
          applications: {
            includeApplications: ['All'],
            excludeApplications: []
          },
          platforms: {
            includePlatforms: ['all']
          }
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['mfa']
        }
      },
      blockLegacyAuth: {
        displayName: 'Block Legacy Authentication',
        state: 'disabled',
        conditions: {
          users: {
            includeUsers: ['All'],
            excludeUsers: []
          },
          applications: {
            includeApplications: ['All']
          },
          clientAppTypes: ['exchangeActiveSync', 'other']
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['block']
        }
      },
      requireCompliantDevice: {
        displayName: 'Require Compliant or Hybrid Joined Device',
        state: 'disabled',
        conditions: {
          users: {
            includeUsers: ['All'],
            excludeUsers: []
          },
          applications: {
            includeApplications: ['All']
          },
          platforms: {
            includePlatforms: ['windows', 'macOS']
          }
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['compliantDevice', 'domainJoinedDevice']
        }
      },
      blockHighRisk: {
        displayName: 'Block High Risk Sign-ins',
        state: 'disabled',
        conditions: {
          users: {
            includeUsers: ['All'],
            excludeUsers: []
          },
          applications: {
            includeApplications: ['All']
          },
          signInRiskLevels: ['high']
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['block']
        }
      },
      adminMFA: {
        displayName: 'Require MFA for Administrators',
        state: 'disabled',
        conditions: {
          users: {
            includeRoles: [
              'Global Administrator',
              'Security Administrator',
              'Conditional Access Administrator',
              'Intune Administrator'
            ]
          },
          applications: {
            includeApplications: ['All']
          }
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['mfa']
        }
      },
      untrustedLocation: {
        displayName: 'Require MFA from Untrusted Locations',
        state: 'disabled',
        conditions: {
          users: {
            includeUsers: ['All']
          },
          applications: {
            includeApplications: ['All']
          },
          locations: {
            includeLocations: ['All'],
            excludeLocations: ['AllTrusted']
          }
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['mfa']
        }
      }
    };
  }

  /**
   * Export policy to JSON
   */
  exportPolicyToJSON(policy) {
    const exportData = {
      exportDate: new Date().toISOString(),
      policy: {
        displayName: policy.displayName,
        state: policy.state,
        conditions: policy.conditions,
        grantControls: policy.grantControls,
        sessionControls: policy.sessionControls
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download policy as JSON file
   */
  downloadPolicyJSON(policy, filename = null) {
    const json = this.exportPolicyToJSON(policy);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');

    const defaultFilename = `conditional-access-${policy.displayName?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'policy'}-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  /**
   * Validate policy configuration
   */
  validatePolicy(policy) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!policy.displayName || policy.displayName.trim() === '') {
      errors.push('Display name is required');
    }

    if (!policy.conditions) {
      errors.push('Policy conditions are required');
    } else {
      // Validate user conditions
      if (!policy.conditions.users || 
          (!policy.conditions.users.includeUsers?.length && 
           !policy.conditions.users.includeGroups?.length &&
           !policy.conditions.users.includeRoles?.length)) {
        errors.push('At least one user, group, or role must be included');
      }

      // Validate application conditions
      if (!policy.conditions.applications || 
          !policy.conditions.applications.includeApplications?.length) {
        errors.push('At least one application must be included');
      }
    }

    // Check grant controls
    if (!policy.grantControls || 
        (!policy.grantControls.builtInControls?.length && 
         !policy.grantControls.customAuthenticationFactors?.length)) {
      errors.push('At least one grant control must be specified');
    }

    // Warnings
    if (policy.state === 'enabled' && 
        policy.conditions?.users?.includeUsers?.includes('All') &&
        !policy.conditions?.users?.excludeUsers?.length) {
      warnings.push('Policy applies to all users with no exclusions - ensure this is intended');
    }

    if (policy.grantControls?.builtInControls?.includes('block')) {
      warnings.push('Policy includes block control - users may lose access');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  /**
   * Get policy impact summary
   */
  getPolicyImpact(policy) {
    const impact = {
      scope: 'Unknown',
      severity: 'Medium',
      affectedUsers: 'Unknown',
      affectedApps: 'Unknown',
      action: 'Unknown'
    };

    // Determine scope
    if (policy.conditions?.users?.includeUsers?.includes('All')) {
      impact.scope = 'Organization-wide';
      impact.affectedUsers = 'All users';
    } else if (policy.conditions?.users?.includeGroups?.length > 0) {
      impact.scope = 'Group-based';
      impact.affectedUsers = `${policy.conditions.users.includeGroups.length} groups`;
    } else {
      impact.scope = 'Limited';
      impact.affectedUsers = 'Specific users';
    }

    // Determine affected apps
    if (policy.conditions?.applications?.includeApplications?.includes('All')) {
      impact.affectedApps = 'All cloud apps';
    } else if (policy.conditions?.applications?.includeApplications?.length > 0) {
      impact.affectedApps = `${policy.conditions.applications.includeApplications.length} apps`;
    }

    // Determine action and severity
    if (policy.grantControls?.builtInControls?.includes('block')) {
      impact.action = 'Block access';
      impact.severity = 'High';
    } else if (policy.grantControls?.builtInControls?.includes('mfa')) {
      impact.action = 'Require MFA';
      impact.severity = 'Medium';
    } else if (policy.grantControls?.builtInControls?.includes('compliantDevice')) {
      impact.action = 'Require compliant device';
      impact.severity = 'Medium';
    } else {
      impact.action = 'Custom controls';
      impact.severity = 'Low';
    }

    return impact;
  }

  /**
   * Compare two policies
   */
  comparePolicies(policy1, policy2) {
    const differences = [];

    // Compare basic properties
    if (policy1.displayName !== policy2.displayName) {
      differences.push({ field: 'displayName', value1: policy1.displayName, value2: policy2.displayName });
    }
    if (policy1.state !== policy2.state) {
      differences.push({ field: 'state', value1: policy1.state, value2: policy2.state });
    }

    // Compare conditions (simplified)
    const conditions1 = JSON.stringify(policy1.conditions);
    const conditions2 = JSON.stringify(policy2.conditions);
    if (conditions1 !== conditions2) {
      differences.push({ field: 'conditions', value1: 'Different', value2: 'Different' });
    }

    // Compare grant controls
    const grant1 = JSON.stringify(policy1.grantControls);
    const grant2 = JSON.stringify(policy2.grantControls);
    if (grant1 !== grant2) {
      differences.push({ field: 'grantControls', value1: 'Different', value2: 'Different' });
    }

    return differences;
  }
}

export default new IntuneConditionalAccessService();
