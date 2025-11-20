/**
 * Intune Comparison Service
 * Compare Intune policies between tenant and backup files, or between two backups
 * Provides detailed diff analysis with property-level comparison
 * Uses MSAL authentication via Convex proxy
 */

import msalGraphService from '../msalGraphService';

// Comparison result types
export const DIFF_TYPES = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified',
  UNCHANGED: 'unchanged'
};

class IntuneComparisonService {
  constructor() {
    this.comparisonCache = new Map();
  }

  /**
   * Compare current tenant policies with backup file
   * @param {Object} backupData - Backup file data
   * @param {Array<string>} policyTypes - Policy types to compare
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Comparison results
   */
  async compareWithBackup(backupData, policyTypes, onProgress = null) {
    const results = {
      summary: {
        added: 0,
        removed: 0,
        modified: 0,
        unchanged: 0
      },
      details: {}
    };

    try {
      let currentItem = 0;
      const totalItems = policyTypes.length;

      for (const policyType of policyTypes) {
        currentItem++;
        const progress = Math.round((currentItem / totalItems) * 100);

        if (onProgress) {
          onProgress(progress, 100, `Comparing ${policyType}...`);
        }

        // Get current tenant policies
        const currentPolicies = await this.fetchCurrentPolicies(policyType);
        const backupPolicies = backupData.policies?.[policyType] || [];

        // Compare
        const comparison = this.comparePolicyLists(
          currentPolicies,
          backupPolicies,
          policyType
        );

        results.details[policyType] = comparison;
        results.summary.added += comparison.added.length;
        results.summary.removed += comparison.removed.length;
        results.summary.modified += comparison.modified.length;
        results.summary.unchanged += comparison.unchanged.length;
      }

      if (onProgress) onProgress(100, 100, 'Comparison complete!');

      return results;

    } catch (error) {
      console.error('Comparison failed:', error);
      throw error;
    }
  }

  /**
   * Compare two backup files
   * @param {Object} backup1 - First backup file
   * @param {Object} backup2 - Second backup file
   * @param {Array<string>} policyTypes - Policy types to compare
   * @returns {Object} Comparison results
   */
  compareTwoBackups(backup1, backup2, policyTypes) {
    const results = {
      summary: {
        added: 0,
        removed: 0,
        modified: 0,
        unchanged: 0
      },
      details: {}
    };

    for (const policyType of policyTypes) {
      const policies1 = backup1.policies?.[policyType] || [];
      const policies2 = backup2.policies?.[policyType] || [];

      const comparison = this.comparePolicyLists(
        policies1,
        policies2,
        policyType
      );

      results.details[policyType] = comparison;
      results.summary.added += comparison.added.length;
      results.summary.removed += comparison.removed.length;
      results.summary.modified += comparison.modified.length;
      results.summary.unchanged += comparison.unchanged.length;
    }

    return results;
  }

  /**
   * Compare two lists of policies
   */
  comparePolicyLists(currentPolicies, backupPolicies, policyType) {
    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    // Create name-based indexes
    const currentByName = new Map();
    const backupByName = new Map();

    currentPolicies.forEach(p => {
      const name = p.displayName || p.name;
      if (name) currentByName.set(name, p);
    });

    backupPolicies.forEach(p => {
      const name = p.displayName || p.name;
      if (name) backupByName.set(name, p);
    });

    // Find added (in current but not in backup)
    for (const [name, policy] of currentByName) {
      if (!backupByName.has(name)) {
        added.push({
          name,
          type: policyType,
          diffType: DIFF_TYPES.ADDED,
          current: this.extractKeyProperties(policy)
        });
      }
    }

    // Find removed (in backup but not in current)
    for (const [name, policy] of backupByName) {
      if (!currentByName.has(name)) {
        removed.push({
          name,
          type: policyType,
          diffType: DIFF_TYPES.REMOVED,
          backup: this.extractKeyProperties(policy)
        });
      }
    }

    // Find modified/unchanged (in both)
    for (const [name, currentPolicy] of currentByName) {
      if (backupByName.has(name)) {
        const backupPolicy = backupByName.get(name);
        const diff = this.compareProperties(currentPolicy, backupPolicy);

        if (diff.changes.length > 0) {
          modified.push({
            name,
            type: policyType,
            diffType: DIFF_TYPES.MODIFIED,
            changes: diff.changes,
            current: this.extractKeyProperties(currentPolicy),
            backup: this.extractKeyProperties(backupPolicy)
          });
        } else {
          unchanged.push({
            name,
            type: policyType,
            diffType: DIFF_TYPES.UNCHANGED,
            current: this.extractKeyProperties(currentPolicy)
          });
        }
      }
    }

    return { added, removed, modified, unchanged };
  }

  /**
   * Compare individual policy properties
   */
  compareProperties(policy1, policy2) {
    const changes = [];
    const ignore = [
      'id', 'createdDateTime', 'lastModifiedDateTime', 'version',
      '_metadata', '_assignments', '_scriptContent', '@odata.context',
      '@odata.type', 'roleScopeTagIds'
    ];

    // Get all unique keys
    const allKeys = new Set([
      ...Object.keys(policy1),
      ...Object.keys(policy2)
    ]);

    for (const key of allKeys) {
      if (ignore.includes(key)) continue;

      const value1 = policy1[key];
      const value2 = policy2[key];

      if (!this.isEqual(value1, value2)) {
        changes.push({
          property: key,
          currentValue: this.formatValue(value1),
          backupValue: this.formatValue(value2),
          type: this.getChangeType(value1, value2)
        });
      }
    }

    return { changes };
  }

  /**
   * Check if two values are equal (deep comparison)
   */
  isEqual(val1, val2) {
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return false;
    if (typeof val1 !== typeof val2) return false;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((v, i) => this.isEqual(v, val2[i]));
    }

    if (typeof val1 === 'object' && typeof val2 === 'object') {
      const keys1 = Object.keys(val1);
      const keys2 = Object.keys(val2);
      if (keys1.length !== keys2.length) return false;
      return keys1.every(key => this.isEqual(val1[key], val2[key]));
    }

    return false;
  }

  /**
   * Get change type for display
   */
  getChangeType(val1, val2) {
    if (val1 == null && val2 != null) return 'added';
    if (val1 != null && val2 == null) return 'removed';
    return 'modified';
  }

  /**
   * Format value for display
   */
  formatValue(value) {
    if (value == null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Extract key properties for summary display
   */
  extractKeyProperties(policy) {
    return {
      id: policy.id,
      displayName: policy.displayName || policy.name,
      description: policy.description,
      createdDateTime: policy.createdDateTime,
      lastModifiedDateTime: policy.lastModifiedDateTime,
      '@odata.type': policy['@odata.type']
    };
  }

  /**
   * Fetch current policies from tenant
   */
  async fetchCurrentPolicies(policyType) {
    try {
      const endpoint = this.getEndpointForType(policyType);
      const response = await msalGraphService.makeRequest(endpoint);
      return response.value || [];
    } catch (error) {
      console.warn(`Failed to fetch ${policyType}:`, error);
      return [];
    }
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
   * Generate comparison report
   */
  generateReport(comparisonResults, format = 'text') {
    if (format === 'text') {
      return this.generateTextReport(comparisonResults);
    } else if (format === 'html') {
      return this.generateHtmlReport(comparisonResults);
    }
    return '';
  }

  /**
   * Generate text report
   */
  generateTextReport(results) {
    let report = '=== INTUNE POLICY COMPARISON REPORT ===\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    report += `SUMMARY:\n`;
    report += `  Added: ${results.summary.added}\n`;
    report += `  Removed: ${results.summary.removed}\n`;
    report += `  Modified: ${results.summary.modified}\n`;
    report += `  Unchanged: ${results.summary.unchanged}\n\n`;

    for (const [policyType, details] of Object.entries(results.details)) {
      report += `\n=== ${policyType} ===\n`;

      if (details.added.length > 0) {
        report += `\nADDED (${details.added.length}):\n`;
        details.added.forEach(p => {
          report += `  + ${p.name}\n`;
        });
      }

      if (details.removed.length > 0) {
        report += `\nREMOVED (${details.removed.length}):\n`;
        details.removed.forEach(p => {
          report += `  - ${p.name}\n`;
        });
      }

      if (details.modified.length > 0) {
        report += `\nMODIFIED (${details.modified.length}):\n`;
        details.modified.forEach(p => {
          report += `  ~ ${p.name} (${p.changes.length} changes)\n`;
          p.changes.forEach(c => {
            report += `      ${c.property}: ${c.backupValue} → ${c.currentValue}\n`;
          });
        });
      }
    }

    return report;
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(results) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Intune Policy Comparison Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #0078d4; border-bottom: 3px solid #0078d4; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.added { background: #d4edda; color: #155724; }
    .summary-card.removed { background: #f8d7da; color: #721c24; }
    .summary-card.modified { background: #fff3cd; color: #856404; }
    .summary-card.unchanged { background: #d1ecf1; color: #0c5460; }
    .summary-card .count { font-size: 48px; font-weight: bold; }
    .summary-card .label { font-size: 14px; text-transform: uppercase; margin-top: 5px; }
    .policy-section { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .policy-item { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #ddd; }
    .policy-item.added { border-left-color: #28a745; }
    .policy-item.removed { border-left-color: #dc3545; }
    .policy-item.modified { border-left-color: #ffc107; }
    .policy-name { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
    .change-list { margin-left: 20px; margin-top: 10px; }
    .change-item { padding: 8px; background: #f8f9fa; margin: 5px 0; border-radius: 4px; font-size: 13px; }
    .change-property { font-weight: bold; color: #0078d4; }
    .change-value { color: #666; }
    .arrow { color: #999; margin: 0 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Intune Policy Comparison Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="summary-card added">
        <div class="count">${results.summary.added}</div>
        <div class="label">Added</div>
      </div>
      <div class="summary-card removed">
        <div class="count">${results.summary.removed}</div>
        <div class="label">Removed</div>
      </div>
      <div class="summary-card modified">
        <div class="count">${results.summary.modified}</div>
        <div class="label">Modified</div>
      </div>
      <div class="summary-card unchanged">
        <div class="count">${results.summary.unchanged}</div>
        <div class="label">Unchanged</div>
      </div>
    </div>

    ${Object.entries(results.details).map(([policyType, details]) => `
      <div class="policy-section">
        <h2>${policyType}</h2>
        
        ${details.added.length > 0 ? `
          <h3 style="color: #28a745;">✓ Added (${details.added.length})</h3>
          ${details.added.map(p => `
            <div class="policy-item added">
              <div class="policy-name">+ ${p.name}</div>
            </div>
          `).join('')}
        ` : ''}

        ${details.removed.length > 0 ? `
          <h3 style="color: #dc3545;">✗ Removed (${details.removed.length})</h3>
          ${details.removed.map(p => `
            <div class="policy-item removed">
              <div class="policy-name">- ${p.name}</div>
            </div>
          `).join('')}
        ` : ''}

        ${details.modified.length > 0 ? `
          <h3 style="color: #ffc107;">~ Modified (${details.modified.length})</h3>
          ${details.modified.map(p => `
            <div class="policy-item modified">
              <div class="policy-name">~ ${p.name}</div>
              <div class="change-list">
                ${p.changes.map(c => `
                  <div class="change-item">
                    <span class="change-property">${c.property}:</span>
                    <span class="change-value">${c.backupValue}</span>
                    <span class="arrow">→</span>
                    <span class="change-value">${c.currentValue}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const intuneComparisonService = new IntuneComparisonService();

export default intuneComparisonService;
