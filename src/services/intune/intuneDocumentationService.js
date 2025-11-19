/**
 * Intune Documentation Service
 * Generate professional documentation from Intune policies
 * Supports HTML, Markdown, and structured JSON formats
 * Uses MSAL authentication via Convex proxy
 */

import msalGraphService from '../msalGraphService';

class IntuneDocumentationService {
  constructor() {
    this.templates = {
      html: this.generateHtmlTemplate.bind(this),
      markdown: this.generateMarkdownTemplate.bind(this),
      json: this.generateJsonTemplate.bind(this)
    };
  }

  /**
   * Generate documentation from policies
   * @param {Object} data - Policy data (from backup or live tenant)
   * @param {Object} options - Documentation options
   * @param {string} options.format - Output format (html, markdown, json)
   * @param {boolean} options.includeAssignments - Include assignment details
   * @param {boolean} options.includeSettings - Include detailed settings
   * @param {Array<string>} options.selectedTypes - Policy types to document
   * @returns {Object} Generated documentation
   */
  async generateDocumentation(data, options = {}) {
    const format = options.format || 'html';
    const includeAssignments = options.includeAssignments !== false;
    const includeSettings = options.includeSettings !== false;
    const selectedTypes = options.selectedTypes || Object.keys(data.policies || {});

    const docData = {
      title: `Intune Configuration Documentation`,
      generatedDate: new Date().toISOString(),
      organization: data.organization || { name: 'Unknown Organization' },
      policies: {},
      statistics: {
        totalPolicies: 0,
        byType: {}
      }
    };

    // Process each policy type
    for (const policyType of selectedTypes) {
      const policies = data.policies?.[policyType] || [];
      
      if (policies.length > 0) {
        docData.policies[policyType] = {
          name: this.getPolicyTypeName(policyType),
          count: policies.length,
          items: policies.map(p => this.formatPolicyForDoc(p, {
            includeAssignments,
            includeSettings
          }))
        };

        docData.statistics.totalPolicies += policies.length;
        docData.statistics.byType[policyType] = policies.length;
      }
    }

    // Generate document in requested format
    const template = this.templates[format];
    if (!template) {
      throw new Error(`Unsupported format: ${format}`);
    }

    return {
      content: template(docData),
      format,
      filename: this.generateFilename(data.organization?.name, format)
    };
  }

  /**
   * Format policy for documentation
   */
  formatPolicyForDoc(policy, options) {
    const formatted = {
      name: policy.displayName || policy.name || 'Unnamed Policy',
      description: policy.description || 'No description provided',
      id: policy.id,
      type: policy['@odata.type'],
      createdDateTime: policy.createdDateTime,
      lastModifiedDateTime: policy.lastModifiedDateTime,
      settings: {}
    };

    if (options.includeSettings) {
      // Extract all non-metadata properties as settings
      const ignoreKeys = [
        'id', '@odata.type', '@odata.context', 'createdDateTime', 
        'lastModifiedDateTime', 'displayName', 'name', 'description',
        'version', 'roleScopeTagIds', '_metadata', '_assignments', '_scriptContent'
      ];

      Object.keys(policy).forEach(key => {
        if (!ignoreKeys.includes(key)) {
          formatted.settings[key] = policy[key];
        }
      });
    }

    if (options.includeAssignments && policy._assignments) {
      formatted.assignments = policy._assignments.map(a => ({
        target: this.formatAssignmentTarget(a.target),
        intent: a.intent || 'N/A'
      }));
    }

    return formatted;
  }

  /**
   * Format assignment target for display
   */
  formatAssignmentTarget(target) {
    if (!target) return 'Unknown';

    const type = target['@odata.type'];
    
    if (type?.includes('allLicensedUsersAssignmentTarget')) {
      return 'All Users';
    }
    if (type?.includes('allDevicesAssignmentTarget')) {
      return 'All Devices';
    }
    if (type?.includes('groupAssignmentTarget')) {
      return `Group: ${target.groupId || 'Unknown'}`;
    }
    if (type?.includes('exclusionGroupAssignmentTarget')) {
      return `Excluded Group: ${target.groupId || 'Unknown'}`;
    }

    return 'Custom Target';
  }

  /**
   * Generate HTML documentation
   */
  generateHtmlTemplate(docData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container { 
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { 
      font-size: 36px;
      margin-bottom: 10px;
      font-weight: 300;
    }
    .header .subtitle {
      font-size: 18px;
      opacity: 0.9;
    }
    .meta-info {
      background: #f8f9fa;
      padding: 30px 40px;
      border-bottom: 1px solid #dee2e6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .meta-item {
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #0078d4;
    }
    .meta-item .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 5px;
      font-weight: 600;
    }
    .meta-item .value {
      font-size: 18px;
      color: #333;
      font-weight: 500;
    }
    .summary {
      padding: 30px 40px;
      background: white;
    }
    .summary h2 {
      color: #0078d4;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .summary-card {
      padding: 20px;
      border-radius: 8px;
      background: #f8f9fa;
      text-align: center;
      border: 1px solid #dee2e6;
    }
    .summary-card .count {
      font-size: 32px;
      font-weight: bold;
      color: #0078d4;
    }
    .summary-card .label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .content {
      padding: 40px;
    }
    .policy-section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }
    .policy-section h2 {
      color: #0078d4;
      font-size: 28px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 3px solid #0078d4;
    }
    .policy-section .section-count {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .policy-item {
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      page-break-inside: avoid;
    }
    .policy-item h3 {
      color: #333;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .policy-item .description {
      color: #666;
      font-size: 14px;
      margin-bottom: 15px;
      font-style: italic;
    }
    .policy-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 15px;
      font-size: 13px;
    }
    .policy-meta .meta-label {
      color: #666;
      font-weight: 600;
    }
    .policy-meta .meta-value {
      color: #333;
    }
    .settings-section {
      margin-top: 20px;
    }
    .settings-section h4 {
      color: #555;
      font-size: 16px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #dee2e6;
    }
    .settings-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13px;
    }
    .settings-table th {
      background: #f8f9fa;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
    }
    .settings-table td {
      padding: 10px;
      border-bottom: 1px solid #dee2e6;
      vertical-align: top;
    }
    .settings-table td:first-child {
      font-weight: 500;
      color: #0078d4;
      width: 30%;
    }
    .settings-table tr:last-child td {
      border-bottom: none;
    }
    .assignments {
      margin-top: 15px;
      padding: 15px;
      background: #e7f3ff;
      border-radius: 6px;
      border-left: 4px solid #0078d4;
    }
    .assignments h4 {
      color: #0078d4;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .assignments ul {
      list-style: none;
      padding: 0;
    }
    .assignments li {
      padding: 5px 0;
      color: #333;
      font-size: 13px;
    }
    .assignments li:before {
      content: "→ ";
      color: #0078d4;
      font-weight: bold;
      margin-right: 5px;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 40px;
      text-align: center;
      border-top: 1px solid #dee2e6;
      color: #666;
      font-size: 13px;
    }
    .toc {
      background: #f8f9fa;
      padding: 30px 40px;
      margin-bottom: 40px;
      border-radius: 8px;
    }
    .toc h2 {
      color: #0078d4;
      margin-bottom: 15px;
    }
    .toc ul {
      list-style: none;
      padding: 0;
    }
    .toc li {
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .toc li:last-child {
      border-bottom: none;
    }
    .toc a {
      color: #0078d4;
      text-decoration: none;
      display: flex;
      justify-content: space-between;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      .policy-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📋 ${docData.title}</h1>
      <div class="subtitle">${docData.organization.name}</div>
    </div>

    <!-- Meta Information -->
    <div class="meta-info">
      <div class="meta-grid">
        <div class="meta-item">
          <div class="label">Generated Date</div>
          <div class="value">${new Date(docData.generatedDate).toLocaleString()}</div>
        </div>
        <div class="meta-item">
          <div class="label">Total Policies</div>
          <div class="value">${docData.statistics.totalPolicies}</div>
        </div>
        <div class="meta-item">
          <div class="label">Policy Categories</div>
          <div class="value">${Object.keys(docData.policies).length}</div>
        </div>
        <div class="meta-item">
          <div class="label">Organization</div>
          <div class="value">${docData.organization.name}</div>
        </div>
      </div>
    </div>

    <!-- Table of Contents -->
    <div class="content">
      <div class="toc">
        <h2>📑 Table of Contents</h2>
        <ul>
          ${Object.entries(docData.policies).map(([key, section]) => `
            <li>
              <a href="#${key}">
                <span>${section.name}</span>
                <span><strong>${section.count}</strong> ${section.count === 1 ? 'policy' : 'policies'}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Policy Sections -->
      ${Object.entries(docData.policies).map(([key, section]) => `
        <div class="policy-section" id="${key}">
          <h2>${section.name}</h2>
          <p class="section-count">${section.count} ${section.count === 1 ? 'policy' : 'policies'} configured</p>
          
          ${section.items.map(policy => `
            <div class="policy-item">
              <h3>${policy.name}</h3>
              ${policy.description ? `<div class="description">${policy.description}</div>` : ''}
              
              <div class="policy-meta">
                <div>
                  <span class="meta-label">Policy ID:</span>
                  <span class="meta-value">${policy.id || 'N/A'}</span>
                </div>
                <div>
                  <span class="meta-label">Created:</span>
                  <span class="meta-value">${policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div>
                  <span class="meta-label">Last Modified:</span>
                  <span class="meta-value">${policy.lastModifiedDateTime ? new Date(policy.lastModifiedDateTime).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              ${policy.settings && Object.keys(policy.settings).length > 0 ? `
                <div class="settings-section">
                  <h4>⚙️ Configuration Settings</h4>
                  <table class="settings-table">
                    <thead>
                      <tr>
                        <th>Setting</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries(policy.settings).map(([key, value]) => `
                        <tr>
                          <td>${key}</td>
                          <td>${this.formatSettingValue(value)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              ${policy.assignments && policy.assignments.length > 0 ? `
                <div class="assignments">
                  <h4>👥 Assignments</h4>
                  <ul>
                    ${policy.assignments.map(a => `
                      <li>${a.target}${a.intent !== 'N/A' ? ` (${a.intent})` : ''}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by Employee Lifecycle Portal - Intune Management System</p>
      <p>${new Date(docData.generatedDate).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdownTemplate(docData) {
    let md = `# ${docData.title}\n\n`;
    md += `**Organization:** ${docData.organization.name}\n`;
    md += `**Generated:** ${new Date(docData.generatedDate).toLocaleString()}\n`;
    md += `**Total Policies:** ${docData.statistics.totalPolicies}\n\n`;

    md += `---\n\n## Table of Contents\n\n`;
    Object.entries(docData.policies).forEach(([key, section]) => {
      md += `- [${section.name}](#${key.toLowerCase().replace(/\s+/g, '-')}) (${section.count})\n`;
    });
    md += `\n---\n\n`;

    Object.entries(docData.policies).forEach(([key, section]) => {
      md += `## ${section.name}\n\n`;
      md += `*${section.count} ${section.count === 1 ? 'policy' : 'policies'} configured*\n\n`;

      section.items.forEach(policy => {
        md += `### ${policy.name}\n\n`;
        if (policy.description) {
          md += `> ${policy.description}\n\n`;
        }

        md += `**Policy Details:**\n`;
        md += `- **ID:** ${policy.id || 'N/A'}\n`;
        md += `- **Created:** ${policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'N/A'}\n`;
        md += `- **Last Modified:** ${policy.lastModifiedDateTime ? new Date(policy.lastModifiedDateTime).toLocaleDateString() : 'N/A'}\n\n`;

        if (policy.settings && Object.keys(policy.settings).length > 0) {
          md += `**Configuration Settings:**\n\n`;
          md += `| Setting | Value |\n`;
          md += `|---------|-------|\n`;
          Object.entries(policy.settings).forEach(([key, value]) => {
            md += `| ${key} | ${this.formatSettingValue(value)} |\n`;
          });
          md += `\n`;
        }

        if (policy.assignments && policy.assignments.length > 0) {
          md += `**Assignments:**\n`;
          policy.assignments.forEach(a => {
            md += `- ${a.target}${a.intent !== 'N/A' ? ` (${a.intent})` : ''}\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      });
    });

    return md;
  }

  /**
   * Generate JSON documentation
   */
  generateJsonTemplate(docData) {
    return JSON.stringify(docData, null, 2);
  }

  /**
   * Format setting value for display
   */
  formatSettingValue(value) {
    if (value === null || value === undefined) {
      return '<em>Not configured</em>';
    }
    if (typeof value === 'boolean') {
      return value ? '<strong>Enabled</strong>' : 'Disabled';
    }
    if (typeof value === 'object') {
      return `<code>${JSON.stringify(value, null, 2)}</code>`;
    }
    return String(value);
  }

  /**
   * Get friendly name for policy type
   */
  getPolicyTypeName(type) {
    const names = {
      deviceConfigurations: 'Device Configurations',
      compliancePolicies: 'Compliance Policies',
      configurationPolicies: 'Settings Catalog',
      mobileApps: 'Applications',
      appProtectionPolicies: 'App Protection Policies',
      appConfigurationPolicies: 'App Configuration Policies',
      conditionalAccessPolicies: 'Conditional Access',
      endpointSecurityPolicies: 'Endpoint Security',
      enrollmentRestrictions: 'Enrollment Restrictions',
      autopilotProfiles: 'Autopilot Profiles',
      scripts: 'PowerShell Scripts',
      policySets: 'Policy Sets',
      scopeTags: 'Scope Tags',
      roleDefinitions: 'Role Definitions'
    };
    return names[type] || type;
  }

  /**
   * Generate filename
   */
  generateFilename(orgName, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeName = (orgName || 'intune').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const ext = format === 'markdown' ? 'md' : format;
    return `${safeName}-documentation-${timestamp}.${ext}`;
  }

  /**
   * Download documentation
   */
  downloadDocumentation(content, filename, format) {
    const mimeTypes = {
      html: 'text/html',
      markdown: 'text/markdown',
      json: 'application/json'
    };

    const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const intuneDocumentationService = new IntuneDocumentationService();

export default intuneDocumentationService;
