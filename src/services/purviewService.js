/**
 * Microsoft Purview Information Protection Service
 * Provides sensitivity label management, DLP policy viewing, and compliance features
 * Based on Microsoft Graph API documentation for Microsoft Purview
 * 
 * API Endpoints:
 * - /security/informationProtection/sensitivityLabels (beta) - List sensitivity labels
 * - /users/{userId}/security/informationProtection/sensitivityLabels (beta) - User-specific labels
 * 
 * References:
 * - https://learn.microsoft.com/en-us/graph/api/resources/security-sensitivitylabel
 * - https://learn.microsoft.com/en-us/graph/security-information-protection-overview
 */

import { graphService } from './graphService';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

class PurviewService {
  /**
   * Get all sensitivity labels for the organization
   * Returns labels available to classify and protect data
   */
  async getSensitivityLabels() {
    if (isDemoMode) {
      return this.getMockSensitivityLabels();
    }

    try {
      // Use /security/informationProtection/sensitivityLabels from beta API
      const response = await graphService.makeRequest(
        '/v1.0/security/informationProtection/sensitivityLabels'
      );
      
      return response.value || [];
    } catch (error) {
      // Fallback to user-specific endpoint if organization endpoint fails
      console.warn('Organization sensitivity labels not available, falling back to user context:', error);
      
      try {
        const response = await graphService.makeRequest(
          '/v1.0/me/security/informationProtection/sensitivityLabels'
        );
        return response.value || [];
      } catch (fallbackError) {
        console.error('Error fetching sensitivity labels:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Get a specific sensitivity label by ID
   * @param {string} labelId - The label ID (GUID)
   */
  async getSensitivityLabel(labelId) {
    if (isDemoMode) {
      const labels = this.getMockSensitivityLabels();
      return labels.find(l => l.id === labelId) || null;
    }

    try {
      const response = await graphService.makeRequest(
        `/v1.0/security/informationProtection/sensitivityLabels/${labelId}`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching sensitivity label ${labelId}:`, error);
      throw error;
    }
  }

  /**
   * Get user-specific sensitivity labels (respects user's permissions)
   * @param {string} userId - User ID or 'me' for current user
   */
  async getUserSensitivityLabels(userId = 'me') {
    if (isDemoMode) {
      return this.getMockSensitivityLabels();
    }

    try {
      const response = await graphService.makeRequest(
        `/v1.0/users/${userId}/security/informationProtection/sensitivityLabels`
      );
      return response.value || [];
    } catch (error) {
      console.error(`Error fetching sensitivity labels for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get information protection policy settings
   * Returns default label, mandatory labeling, downgrade justification requirements
   */
  async getInformationProtectionPolicy() {
    if (isDemoMode) {
      return this.getMockPolicySettings();
    }

    try {
      const response = await graphService.makeRequest(
        '/v1.0/security/informationProtection/labelPolicySettings'
      );
      return response;
    } catch (error) {
      console.error('Error fetching information protection policy:', error);
      throw error;
    }
  }

  /**
   * Get DLP alerts from Microsoft Purview
   * Note: DLP alerts are typically accessed through the Purview compliance portal
   * Graph API access may require specific licensing and permissions
   */
  async getDLPAlerts() {
    if (isDemoMode) {
      return this.getMockDLPAlerts();
    }

    try {
      // Note: DLP alerts may require Microsoft 365 Defender or Purview portal access
      // This endpoint may not be available in all tenants
      const response = await graphService.makeRequest(
        '/v1.0/security/alerts_v2?$filter=category eq \'DataLossPrevention\''
      );
      return response.value || [];
    } catch (error) {
      console.warn('DLP alerts not available through Graph API:', error);
      // Return empty array instead of throwing - DLP alerts may require portal access
      return [];
    }
  }

  /**
   * Format sensitivity label for UI display
   * @param {object} label - Raw label object from Graph API
   */
  formatSensitivityLabel(label) {
    return {
      id: label.id,
      name: label.name || label.displayName,
      description: label.description || '',
      color: label.color || '#0078D4',
      sensitivity: label.sensitivity || 0,
      isActive: label.isActive !== false,
      isAppliable: label.isAppliable !== false,
      hasProtection: label.hasProtection || false,
      tooltip: label.tooltip || label.description || '',
      contentFormats: label.contentFormats || [],
      parent: label.parent ? {
        id: label.parent.id,
        name: label.parent.name
      } : null
    };
  }

  // ==================== MOCK DATA FOR DEMO MODE ====================

  getMockSensitivityLabels() {
    return [
      {
        id: '1',
        name: 'Public',
        description: 'Data that can be shared publicly without restrictions',
        color: '#008272',
        sensitivity: 0,
        isActive: true,
        isAppliable: true,
        hasProtection: false,
        tooltip: 'Use for information that can be freely shared',
        contentFormats: ['file', 'email', 'site']
      },
      {
        id: '2',
        name: 'General',
        description: 'Business data for internal use that is not intended for public consumption',
        color: '#486991',
        sensitivity: 1,
        isActive: true,
        isAppliable: true,
        hasProtection: false,
        tooltip: 'Default label for most business documents',
        contentFormats: ['file', 'email', 'site', 'meeting']
      },
      {
        id: '3',
        name: 'Confidential',
        description: 'Sensitive business data that requires protection and controlled access',
        color: '#C50F1F',
        sensitivity: 2,
        isActive: true,
        isAppliable: false,
        hasProtection: false,
        tooltip: 'Restricted access - select sub-label',
        contentFormats: ['file', 'email', 'site']
      },
      {
        id: '3-1',
        name: 'Confidential - All Employees',
        description: 'Confidential data accessible to all employees',
        color: '#C50F1F',
        sensitivity: 2,
        isActive: true,
        isAppliable: true,
        hasProtection: true,
        tooltip: 'Access restricted to employees only',
        contentFormats: ['file', 'email'],
        parent: {
          id: '3',
          name: 'Confidential'
        }
      },
      {
        id: '3-2',
        name: 'Confidential - Anyone (unrestricted)',
        description: 'Confidential data that can be shared outside with encryption',
        color: '#C50F1F',
        sensitivity: 2,
        isActive: true,
        isAppliable: true,
        hasProtection: true,
        tooltip: 'Encrypted content, shareable externally',
        contentFormats: ['file', 'email'],
        parent: {
          id: '3',
          name: 'Confidential'
        }
      },
      {
        id: '4',
        name: 'Highly Confidential',
        description: 'Very sensitive business data that requires the highest level of protection',
        color: '#A4262C',
        sensitivity: 3,
        isActive: true,
        isAppliable: false,
        hasProtection: false,
        tooltip: 'Highest protection - select sub-label',
        contentFormats: ['file', 'email']
      },
      {
        id: '4-1',
        name: 'Highly Confidential - Specific People',
        description: 'Restricted to specific named individuals only',
        color: '#A4262C',
        sensitivity: 3,
        isActive: true,
        isAppliable: true,
        hasProtection: true,
        tooltip: 'Restricted access - specific users only',
        contentFormats: ['file', 'email'],
        parent: {
          id: '4',
          name: 'Highly Confidential'
        }
      }
    ];
  }

  getMockPolicySettings() {
    return {
      id: 'policy-1',
      defaultLabelId: '2',
      isMandatory: true,
      isDowngradeJustificationRequired: true,
      moreInfoUrl: 'https://docs.microsoft.com/purview/sensitivity-labels'
    };
  }

  getMockDLPAlerts() {
    return [
      {
        id: 'alert-1',
        title: 'Credit card numbers detected in email',
        severity: 'high',
        status: 'new',
        category: 'DataLossPrevention',
        createdDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        description: 'Email containing 3 credit card numbers was sent to external recipient',
        policyName: 'Financial Data Protection',
        userPrincipalName: 'john.smith@company.com',
        affectedItems: 1
      },
      {
        id: 'alert-2',
        title: 'Sensitive document shared externally',
        severity: 'medium',
        status: 'resolved',
        category: 'DataLossPrevention',
        createdDateTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        description: 'Document with "Confidential" label was shared with external domain',
        policyName: 'External Sharing Prevention',
        userPrincipalName: 'jane.doe@company.com',
        affectedItems: 1
      },
      {
        id: 'alert-3',
        title: 'Multiple PII items detected',
        severity: 'medium',
        status: 'inProgress',
        category: 'DataLossPrevention',
        createdDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        description: 'SharePoint file contains 15 social security numbers',
        policyName: 'PII Protection Policy',
        userPrincipalName: 'admin@company.com',
        affectedItems: 1
      },
      {
        id: 'alert-4',
        title: 'Endpoint DLP violation - USB transfer',
        severity: 'high',
        status: 'new',
        category: 'DataLossPrevention',
        createdDateTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        description: 'User attempted to copy confidential file to removable media',
        policyName: 'Endpoint Data Loss Prevention',
        userPrincipalName: 'bob.wilson@company.com',
        affectedItems: 1
      }
    ];
  }
}

// Export singleton instance
export const purviewService = new PurviewService();
export default purviewService;
