/**
 * Intune Assignment Analytics Service
 * Analyze policy and app assignments, detect conflicts, generate reports
 * Uses service factory to support both MSAL and Convex authentication modes
 */

import { getActiveService } from '../serviceFactory';

class IntuneAssignmentService {
  /**
   * Fetch all assignments across all policy types
   * @returns {Promise<Object>} Assignments grouped by policy type
   */
  async fetchAllAssignments() {
    const policyTypes = [
      { 
        type: 'deviceConfigurations', 
        endpoint: '/deviceManagement/deviceConfigurations',
        name: 'Device Configurations'
      },
      { 
        type: 'compliancePolicies', 
        endpoint: '/deviceManagement/deviceCompliancePolicies',
        name: 'Compliance Policies'
      },
      { 
        type: 'configurationPolicies', 
        endpoint: '/deviceManagement/configurationPolicies',
        name: 'Settings Catalog Policies'
      },
      { 
        type: 'intentPolicies', 
        endpoint: '/deviceManagement/intents',
        name: 'Security Baselines'
      },
      { 
        type: 'mobileApps', 
        endpoint: '/deviceAppManagement/mobileApps',
        name: 'Mobile Apps'
      },
      { 
        type: 'appProtectionPolicies', 
        endpoint: '/deviceAppManagement/managedAppPolicies',
        name: 'App Protection Policies'
      },
      { 
        type: 'appConfigurationPolicies', 
        endpoint: '/deviceAppManagement/mobileAppConfigurations',
        name: 'App Configuration Policies'
      },
      { 
        type: 'conditionalAccessPolicies', 
        endpoint: '/identity/conditionalAccess/policies',
        name: 'Conditional Access Policies'
      }
    ];

    const results = {
      assignments: [],
      summary: {
        totalPolicies: 0,
        totalAssignments: 0,
        assignedGroups: new Set(),
        assignedUsers: new Set(),
        unassignedPolicies: 0
      }
    };

    for (const policyType of policyTypes) {
      try {
        // Fetch policies
        const policiesResponse = await getActiveService().makeRequest(policyType.endpoint, 'GET');
        const policies = policiesResponse.value || [];
        
        results.summary.totalPolicies += policies.length;

        // Fetch assignments for each policy
        for (const policy of policies) {
          let assignments = [];
          
          // Different endpoints for different policy types
          if (policyType.type === 'conditionalAccessPolicies') {
            // Conditional Access has inline conditions
            if (policy.conditions?.users?.includeGroups) {
              assignments = policy.conditions.users.includeGroups.map(groupId => ({
                target: { groupId },
                intent: 'required'
              }));
            }
          } else if (policyType.type === 'mobileApps') {
            // Apps have assignments endpoint
            const assignmentsResponse = await getActiveService().makeRequest(
              `${policyType.endpoint}/${policy.id}/assignments`,
              'GET'
            );
            assignments = assignmentsResponse.value || [];
          } else if (policyType.type === 'configurationPolicies') {
            // Settings Catalog uses assignments endpoint
            const assignmentsResponse = await getActiveService().makeRequest(
              `${policyType.endpoint}/${policy.id}/assignments`,
              'GET'
            );
            assignments = assignmentsResponse.value || [];
          } else if (policyType.type === 'intentPolicies') {
            // Security Baselines use assignments endpoint
            const assignmentsResponse = await getActiveService().makeRequest(
              `${policyType.endpoint}/${policy.id}/assignments`,
              'GET'
            );
            assignments = assignmentsResponse.value || [];
          } else {
            // Standard device management policies
            const assignmentsResponse = await getActiveService().makeRequest(
              `${policyType.endpoint}/${policy.id}/assignments`,
              'GET'
            );
            assignments = assignmentsResponse.value || [];
          }

          if (assignments.length === 0) {
            results.summary.unassignedPolicies++;
          }

          results.summary.totalAssignments += assignments.length;

          // Track groups and users
          assignments.forEach(assignment => {
            if (assignment.target) {
              if (assignment.target.groupId) {
                results.summary.assignedGroups.add(assignment.target.groupId);
              }
              if (assignment.target.userId) {
                results.summary.assignedUsers.add(assignment.target.userId);
              }
            }
          });

          // Store assignment data
          results.assignments.push({
            policyType: policyType.type,
            policyTypeName: policyType.name,
            policyId: policy.id,
            policyName: policy.displayName || policy.name || 'Unnamed Policy',
            assignments: assignments.map(a => ({
              id: a.id,
              intent: a.intent || 'required',
              target: a.target,
              groupMode: a.target?.groupAssignmentTarget ? 'included' : 
                        a.target?.exclusionGroupAssignmentTarget ? 'excluded' : 'unknown'
            }))
          });
        }
      } catch (error) {
        console.error(`Error fetching assignments for ${policyType.name}:`, error);
      }
    }

    // Convert Sets to counts
    results.summary.assignedGroups = results.summary.assignedGroups.size;
    results.summary.assignedUsers = results.summary.assignedUsers.size;

    return results;
  }

  /**
   * Analyze assignment conflicts and overlaps
   * @param {Array} assignments - Array of policy assignments
   * @returns {Object} Conflict analysis
   */
  analyzeAssignmentConflicts(assignments) {
    const conflicts = [];
    const groupPolicyMap = {}; // groupId -> [policies]

    // Build group to policy mapping
    assignments.forEach(item => {
      item.assignments.forEach(assignment => {
        if (assignment.target?.groupId) {
          const groupId = assignment.target.groupId;
          if (!groupPolicyMap[groupId]) {
            groupPolicyMap[groupId] = [];
          }
          groupPolicyMap[groupId].push({
            policyType: item.policyType,
            policyTypeName: item.policyTypeName,
            policyId: item.policyId,
            policyName: item.policyName,
            intent: assignment.intent,
            groupMode: assignment.groupMode
          });
        }
      });
    });

    // Detect conflicts
    Object.entries(groupPolicyMap).forEach(([groupId, policies]) => {
      // Multiple policies of same type to same group
      const policyTypeMap = {};
      policies.forEach(policy => {
        if (!policyTypeMap[policy.policyType]) {
          policyTypeMap[policy.policyType] = [];
        }
        policyTypeMap[policy.policyType].push(policy);
      });

      Object.entries(policyTypeMap).forEach(([policyType, typePolicies]) => {
        if (typePolicies.length > 1) {
          conflicts.push({
            type: 'MULTIPLE_POLICIES_SAME_TYPE',
            severity: 'WARNING',
            groupId,
            policyType,
            policyTypeName: typePolicies[0].policyTypeName,
            policies: typePolicies.map(p => ({
              id: p.policyId,
              name: p.policyName,
              intent: p.intent
            })),
            message: `Group has ${typePolicies.length} ${typePolicies[0].policyTypeName} policies assigned`
          });
        }
      });

      // Conflicting intents (available vs required for apps)
      const appPolicies = policies.filter(p => p.policyType === 'mobileApps');
      const intents = [...new Set(appPolicies.map(p => p.intent))];
      if (intents.length > 1) {
        conflicts.push({
          type: 'CONFLICTING_INTENTS',
          severity: 'ERROR',
          groupId,
          policyType: 'mobileApps',
          policyTypeName: 'Mobile Apps',
          intents,
          policies: appPolicies.map(p => ({
            id: p.policyId,
            name: p.policyName,
            intent: p.intent
          })),
          message: `Group has apps with conflicting intents: ${intents.join(', ')}`
        });
      }
    });

    return {
      totalConflicts: conflicts.length,
      conflicts,
      groupsWithConflicts: [...new Set(conflicts.map(c => c.groupId))].length
    };
  }

  /**
   * Generate assignment coverage report
   * @param {Array} assignments - Array of policy assignments
   * @param {Array} groups - Optional array of all groups for coverage calculation
   * @returns {Object} Coverage report
   */
  async generateAssignmentCoverage(assignments, groups = null) {
    // Fetch groups if not provided
    if (!groups) {
      try {
        const groupsResponse = await getActiveService().makeRequest('/groups', 'GET');
        groups = groupsResponse.value || [];
      } catch (error) {
        console.error('Error fetching groups:', error);
        groups = [];
      }
    }

    const assignedGroupIds = new Set();
    const unassignedGroupIds = new Set(groups.map(g => g.id));

    // Track assigned groups
    assignments.forEach(item => {
      item.assignments.forEach(assignment => {
        if (assignment.target?.groupId) {
          assignedGroupIds.add(assignment.target.groupId);
          unassignedGroupIds.delete(assignment.target.groupId);
        }
      });
    });

    // Policy type coverage
    const policyTypeCoverage = {};
    assignments.forEach(item => {
      if (!policyTypeCoverage[item.policyType]) {
        policyTypeCoverage[item.policyType] = {
          name: item.policyTypeName,
          totalPolicies: 0,
          assignedPolicies: 0,
          totalAssignments: 0
        };
      }
      policyTypeCoverage[item.policyType].totalPolicies++;
      if (item.assignments.length > 0) {
        policyTypeCoverage[item.policyType].assignedPolicies++;
      }
      policyTypeCoverage[item.policyType].totalAssignments += item.assignments.length;
    });

    return {
      groupCoverage: {
        totalGroups: groups.length,
        assignedGroups: assignedGroupIds.size,
        unassignedGroups: unassignedGroupIds.size,
        coveragePercent: groups.length > 0 ? 
          Math.round((assignedGroupIds.size / groups.length) * 100) : 0
      },
      policyTypeCoverage,
      topAssignedGroups: this._getTopAssignedGroups(assignments, 10),
      unassignedGroupsList: Array.from(unassignedGroupIds).slice(0, 50)
    };
  }

  /**
   * Get top assigned groups (most policies)
   * @private
   */
  _getTopAssignedGroups(assignments, limit = 10) {
    const groupPolicyCount = {};

    assignments.forEach(item => {
      item.assignments.forEach(assignment => {
        if (assignment.target?.groupId) {
          const groupId = assignment.target.groupId;
          groupPolicyCount[groupId] = (groupPolicyCount[groupId] || 0) + 1;
        }
      });
    });

    return Object.entries(groupPolicyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([groupId, count]) => ({
        groupId,
        policyCount: count
      }));
  }

  /**
   * Export assignment matrix to CSV
   * @param {Array} assignments - Array of policy assignments
   * @returns {string} CSV content
   */
  exportAssignmentMatrix(assignments) {
    const rows = [];
    
    // Header
    rows.push(['Policy Type', 'Policy Name', 'Assignment Target', 'Group ID', 'Intent', 'Mode']);

    // Data rows
    assignments.forEach(item => {
      if (item.assignments.length === 0) {
        // Unassigned policy
        rows.push([
          item.policyTypeName,
          item.policyName,
          'Unassigned',
          '',
          '',
          ''
        ]);
      } else {
        item.assignments.forEach(assignment => {
          rows.push([
            item.policyTypeName,
            item.policyName,
            assignment.target?.['@odata.type']?.split('.').pop() || 'Unknown',
            assignment.target?.groupId || '',
            assignment.intent || '',
            assignment.groupMode || ''
          ]);
        });
      }
    });

    // Convert to CSV
    return rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Download assignment matrix as CSV file
   * @param {Array} assignments - Array of policy assignments
   * @param {string} filename - Output filename
   */
  downloadAssignmentMatrix(assignments, filename = 'assignment-matrix.csv') {
    const csv = this.exportAssignmentMatrix(assignments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default new IntuneAssignmentService();
