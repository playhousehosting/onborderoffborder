/**
 * Microsoft Defender Service
 * 
 * Provides access to Microsoft Defender for Endpoint and Microsoft 365 Defender security data
 * via Microsoft Graph Security API endpoints.
 * 
 * Production-only implementation - NO MOCK DATA
 * All functions use real Microsoft Graph API endpoints
 * 
 * Available Graph API Endpoints:
 * - /security/alerts_v2 - Security alerts from all sources
 * - /security/incidents - Security incidents (correlated alerts)
 * - /security/secureScores - Secure Score and recommendations
 * - /security/secureScoreControlProfiles - Detailed control information
 * - /security/threatSubmission/emailThreats - Quarantined messages
 * - /security/tenantAllowBlockList/* - Domain and sender allow/block lists
 * 
 * Required Permissions:
 * - SecurityEvents.Read.All - Read security events
 * - SecurityAlert.Read.All - Read security alerts
 * - ThreatIndicators.Read.All - Read threat intelligence
 * - SecurityActions.ReadWrite.All - Manage security actions (quarantine release, block/allow lists)
 */

import { graphService } from './graphService';

/**
 * Get security alerts from Microsoft Defender
 * Uses /security/alerts_v2 endpoint
 */
export async function getSecurityAlerts(filters = {}) {
  let endpoint = '/security/alerts_v2';
  const queryParams = [];

  // Build filter query
  if (filters.severity) {
    queryParams.push(`severity eq '${filters.severity}'`);
  }
  if (filters.status) {
    queryParams.push(`status eq '${filters.status}'`);
  }
  if (filters.days) {
    const date = new Date();
    date.setDate(date.getDate() - filters.days);
    queryParams.push(`createdDateTime ge ${date.toISOString()}`);
  }

  if (queryParams.length > 0) {
    endpoint += `?$filter=${queryParams.join(' and ')}`;
  }

  endpoint += (queryParams.length > 0 ? '&' : '?') + '$top=50&$orderby=createdDateTime desc';

  return await graphService.makeRequest(endpoint, {});
}

/**
 * Get security incidents
 * Uses /security/incidents endpoint
 */
export async function getSecurityIncidents(filters = {}) {
  let endpoint = '/security/incidents';
  const queryParams = [];

  if (filters.status) {
    queryParams.push(`status eq '${filters.status}'`);
  }
  if (filters.severity) {
    queryParams.push(`severity eq '${filters.severity}'`);
  }

  if (queryParams.length > 0) {
    endpoint += `?$filter=${queryParams.join(' and ')}`;
  }

  endpoint += (queryParams.length > 0 ? '&' : '?') + '$top=50&$orderby=lastUpdateDateTime desc&$expand=alerts';

  return await graphService.makeRequest(endpoint, {});
}

/**
 * Get Microsoft Secure Score
 * Uses /security/secureScores endpoint
 */
export async function getSecureScore() {
  const response = await graphService.makeRequest(
    '/security/secureScores?$top=1&$orderby=createdDateTime desc',
    {}
  );

  if (response.value && response.value.length > 0) {
    return response.value[0];
  }

  throw new Error('No Secure Score data available');
}

/**
 * Get security recommendations
 * Uses /security/secureScoreControlProfiles endpoint
 */
export async function getSecurityRecommendations() {
  const response = await graphService.makeRequest(
    '/security/secureScoreControlProfiles?$top=20&$orderby=rank',
    {}
  );

  // Transform to simpler format
  if (response.value) {
    return response.value.map(control => ({
      id: control.id,
      displayName: control.title,
      productName: control.service,
      recommendationCategory: control.controlCategory,
      actionType: control.actionType,
      status: control.deprecated ? 'Deprecated' : 'Active',
      score: control.score,
      maxScore: control.maxScore,
      implementationCost: control.implementationCost,
      userImpact: control.userImpact,
      rank: control.rank,
      remediationImpact: control.remediationImpact,
      actionUrl: control.actionUrl
    }));
  }

  return [];
}

/**
 * Get vulnerability information
 * Note: Uses Microsoft Graph BETA API as v1.0 doesn't support this endpoint
 */
export async function getVulnerabilities() {
  // Note: This endpoint is only available in beta Microsoft Graph API
  // Vulnerability management data requires Microsoft Defender Vulnerability Management license
  
  try {
    const response = await graphService.makeBetaRequest(
      '/security/vulnerabilities?$top=100',
      {}
    );
    
    if (response.value) {
      const vulnerabilities = response.value;
      const critical = vulnerabilities.filter(v => v.severity === 'Critical').length;
      const high = vulnerabilities.filter(v => v.severity === 'High').length;
      const medium = vulnerabilities.filter(v => v.severity === 'Medium').length;
      const low = vulnerabilities.filter(v => v.severity === 'Low').length;

      return {
        critical,
        high,
        medium,
        low,
        total: vulnerabilities.length,
        topVulnerabilities: vulnerabilities.slice(0, 10).map(v => ({
          id: v.id,
          name: v.displayName || v.id,
          severity: v.severity,
          cvssScore: v.cvssScore,
          affectedDevices: v.machinesCount || 0,
          published: v.publishedDateTime
        }))
      };
    }
  } catch (error) {
    console.warn('Vulnerability endpoint not available (requires beta API and proper licensing):', error.message);
  }

  // If endpoint not available, return empty data structure
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
    topVulnerabilities: []
  };
}

/**
 * Get quarantined email messages
 * Uses /security/threatSubmission/emailThreats endpoint
 */
export async function getQuarantinedMessages(filters = {}) {
  let endpoint = '/security/threatSubmission/emailThreats';
  const queryParams = [];

  if (filters.reason) {
    queryParams.push(`category eq '${filters.reason}'`);
  }

  if (queryParams.length > 0) {
    endpoint += `?$filter=${queryParams.join(' and ')}`;
  }

  endpoint += (queryParams.length > 0 ? '&' : '?') + '$top=100&$orderby=receivedDateTime desc';

  return await graphService.makeRequest(endpoint, {});
}

/**
 * Release quarantined message
 */
export async function releaseQuarantinedMessage(messageId, releaseToAll = false) {
  return await graphService.makeRequest(
    `/security/threatSubmission/emailThreats/${messageId}/release`,
    {
      method: 'POST',
      body: JSON.stringify({
        releaseToAll: releaseToAll
      })
    }
  );
}

/**
 * Delete quarantined message
 */
export async function deleteQuarantinedMessage(messageId) {
  return await graphService.makeRequest(
    `/security/threatSubmission/emailThreats/${messageId}`,
    {
      method: 'DELETE'
    }
  );
}

/**
 * Get tenant allow/block lists
 * Note: Uses Microsoft Graph BETA API as v1.0 doesn't support this endpoint
 */
export async function getTenantAllowBlockList() {
  // Note: This endpoint is only available in beta Microsoft Graph API
  // Exchange Online allow/block lists require proper Exchange permissions
  
  try {
    const [allowDomains, blockDomains, allowSenders, blockSenders] = await Promise.all([
      graphService.makeBetaRequest('/security/tenantAllowBlockList/allowedDomains?$top=100', {}),
      graphService.makeBetaRequest('/security/tenantAllowBlockList/blockedDomains?$top=100', {}),
      graphService.makeBetaRequest('/security/tenantAllowBlockList/allowedSenders?$top=100', {}),
      graphService.makeBetaRequest('/security/tenantAllowBlockList/blockedSenders?$top=100', {})
    ]);

    return {
      allowDomains: allowDomains.value || [],
      blockDomains: blockDomains.value || [],
      allowSenders: allowSenders.value || [],
      blockSenders: blockSenders.value || []
    };
  } catch (error) {
    console.warn('Tenant allow/block list endpoint not available (requires beta API and proper licensing):', error.message);
    
    // Return empty data structure
    return {
      allowDomains: [],
      blockDomains: [],
      allowSenders: [],
      blockSenders: []
    };
  }
}

/**
 * Add domain to allow list
 */
export async function addDomainToAllowList(domain, notes = '') {
  const response = await graphService.makeRequest(
    '/security/tenantAllowBlockList/allowedDomains',
    {
      method: 'POST',
      body: JSON.stringify({
        value: domain,
        notes: notes,
        action: 'Allow'
      })
    }
  );
  return { success: true, message: 'Domain added to allow list', entry: response };
}

/**
 * Add domain to block list
 */
export async function addDomainToBlockList(domain, notes = '') {
  const response = await graphService.makeRequest(
    '/security/tenantAllowBlockList/blockedDomains',
    {
      method: 'POST',
      body: JSON.stringify({
        value: domain,
        notes: notes,
        action: 'Block'
      })
    }
  );
  return { success: true, message: 'Domain added to block list', entry: response };
}

/**
 * Remove domain from allow list
 */
export async function removeDomainFromAllowList(entryId) {
  await graphService.makeRequest(
    `/security/tenantAllowBlockList/allowedDomains/${entryId}`,
    {
      method: 'DELETE'
    }
  );
  return { success: true, message: 'Domain removed from allow list' };
}

/**
 * Remove domain from block list
 */
export async function removeDomainFromBlockList(entryId) {
  await graphService.makeRequest(
    `/security/tenantAllowBlockList/blockedDomains/${entryId}`,
    {
      method: 'DELETE'
    }
  );
  return { success: true, message: 'Domain removed from block list' };
}

/**
 * Add sender to allow list
 */
export async function addSenderToAllowList(email, notes = '') {
  const response = await graphService.makeRequest(
    '/security/tenantAllowBlockList/allowedSenders',
    {
      method: 'POST',
      body: JSON.stringify({
        value: email,
        notes: notes,
        action: 'Allow'
      })
    }
  );
  return { success: true, message: 'Sender added to allow list', entry: response };
}

/**
 * Add sender to block list
 */
export async function addSenderToBlockList(email, notes = '') {
  const response = await graphService.makeRequest(
    '/security/tenantAllowBlockList/blockedSenders',
    {
      method: 'POST',
      body: JSON.stringify({
        value: email,
        notes: notes,
        action: 'Block'
      })
    }
  );
  return { success: true, message: 'Sender added to block list', entry: response };
}

/**
 * Update security alert
 */
export async function updateAlert(alertId, updates) {
  return await graphService.makeRequest(
    `/security/alerts_v2/${alertId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  );
}

/**
 * Update security incident
 */
export async function updateIncident(incidentId, updates) {
  return await graphService.makeRequest(
    `/security/incidents/${incidentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  );
}

export const defenderService = {
  getSecurityAlerts,
  getSecurityIncidents,
  getSecureScore,
  getSecurityRecommendations,
  getVulnerabilities,
  updateAlert,
  updateIncident,
  // Email Security
  getQuarantinedMessages,
  releaseQuarantinedMessage,
  deleteQuarantinedMessage,
  getTenantAllowBlockList,
  addDomainToAllowList,
  addDomainToBlockList,
  removeDomainFromAllowList,
  removeDomainFromBlockList,
  addSenderToAllowList,
  addSenderToBlockList
};

export default defenderService;
