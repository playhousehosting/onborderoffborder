/**
 * Intune Compliance Reporting Service
 * Generates comprehensive compliance reports and analytics
 * Uses service factory to support both MSAL and Convex authentication modes
 */

import { getActiveService } from '../serviceFactory';

class IntuneComplianceReportService {
  /**
   * Get the active graph service
   */
  get graphService() {
    return getActiveService();
  }

  /**
   * Fetch all compliance policies
   */
  async fetchCompliancePolicies() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceManagement/deviceCompliancePolicies'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching compliance policies:', error);
      throw error;
    }
  }

  /**
   * Fetch device compliance states for a specific policy
   */
  async fetchPolicyComplianceStates(policyId) {
    try {
      const response = await this.graphService.makeRequest(
        `/deviceManagement/deviceCompliancePolicies/${policyId}/deviceStatuses`
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching policy compliance states:', error);
      throw error;
    }
  }

  /**
   * Fetch all device compliance states
   */
  async fetchAllDeviceComplianceStates() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceManagement/deviceComplianceDeviceStatus'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching device compliance states:', error);
      throw error;
    }
  }

  /**
   * Fetch compliance summary
   */
  async fetchComplianceSummary() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceManagement/deviceCompliancePolicyDeviceStateSummary'
      );
      return response;
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(options = {}) {
    const {
      includePolicies = true,
      includeDevices = true,
      includeTrends = false,
      startDate = null,
      endDate = null
    } = options;

    const report = {
      generatedAt: new Date().toISOString(),
      summary: null,
      policies: [],
      deviceStates: [],
      trends: [],
      statistics: {}
    };

    try {
      // Fetch summary
      report.summary = await this.fetchComplianceSummary();

      // Fetch policies
      if (includePolicies) {
        const policies = await this.fetchCompliancePolicies();
        
        // Fetch compliance states for each policy
        for (const policy of policies) {
          const states = await this.fetchPolicyComplianceStates(policy.id);
          report.policies.push({
            ...policy,
            complianceStates: states,
            compliantCount: states.filter(s => s.status === 'compliant').length,
            nonCompliantCount: states.filter(s => s.status === 'nonCompliant').length,
            errorCount: states.filter(s => s.status === 'error').length,
            inGracePeriodCount: states.filter(s => s.status === 'inGracePeriod').length,
            totalDevices: states.length
          });
        }
      }

      // Fetch all device states
      if (includeDevices) {
        report.deviceStates = await this.fetchAllDeviceComplianceStates();
      }

      // Calculate statistics
      report.statistics = this.calculateStatistics(report);

      // Fetch trends if requested
      if (includeTrends && startDate && endDate) {
        report.trends = await this.fetchComplianceTrends(startDate, endDate);
      }

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Calculate compliance statistics
   */
  calculateStatistics(report) {
    const stats = {
      totalPolicies: report.policies.length,
      totalDevices: report.deviceStates.length,
      compliantDevices: 0,
      nonCompliantDevices: 0,
      errorDevices: 0,
      inGracePeriodDevices: 0,
      notApplicableDevices: 0,
      complianceRate: 0,
      policyBreakdown: []
    };

    // Count device states
    if (report.summary) {
      stats.compliantDevices = report.summary.compliantDeviceCount || 0;
      stats.nonCompliantDevices = report.summary.nonCompliantDeviceCount || 0;
      stats.errorDevices = report.summary.errorDeviceCount || 0;
      stats.inGracePeriodDevices = report.summary.inGracePeriodCount || 0;
      stats.notApplicableDevices = report.summary.notApplicableDeviceCount || 0;
    }

    // Calculate compliance rate
    const totalEvaluated = stats.compliantDevices + stats.nonCompliantDevices + stats.errorDevices;
    if (totalEvaluated > 0) {
      stats.complianceRate = ((stats.compliantDevices / totalEvaluated) * 100).toFixed(2);
    }

    // Policy breakdown
    stats.policyBreakdown = report.policies.map(policy => ({
      policyName: policy.displayName,
      platform: policy['@odata.type']?.split('.').pop() || 'unknown',
      compliantCount: policy.compliantCount,
      nonCompliantCount: policy.nonCompliantCount,
      errorCount: policy.errorCount,
      inGracePeriodCount: policy.inGracePeriodCount,
      totalDevices: policy.totalDevices,
      complianceRate: policy.totalDevices > 0 
        ? ((policy.compliantCount / policy.totalDevices) * 100).toFixed(2)
        : 0
    }));

    return stats;
  }

  /**
   * Fetch compliance trends over time (simulated - Graph API has limited historical data)
   */
  async fetchComplianceTrends(startDate, endDate) {
    // Note: Graph API doesn't provide historical compliance data directly
    // This would need to be tracked in your own database
    // For now, return current snapshot
    const trends = [];
    
    try {
      const summary = await this.fetchComplianceSummary();
      trends.push({
        date: new Date().toISOString(),
        compliant: summary.compliantDeviceCount || 0,
        nonCompliant: summary.nonCompliantDeviceCount || 0,
        error: summary.errorDeviceCount || 0,
        inGracePeriod: summary.inGracePeriodCount || 0
      });
    } catch (error) {
      console.error('Error fetching compliance trends:', error);
    }

    return trends;
  }

  /**
   * Export compliance report to CSV
   */
  exportToCSV(report) {
    const rows = [];
    
    // Header
    rows.push(['Device Compliance Report']);
    rows.push(['Generated:', new Date(report.generatedAt).toLocaleString()]);
    rows.push([]);
    
    // Summary
    rows.push(['Summary']);
    rows.push(['Total Policies', report.statistics.totalPolicies]);
    rows.push(['Total Devices', report.statistics.totalDevices]);
    rows.push(['Compliant', report.statistics.compliantDevices]);
    rows.push(['Non-Compliant', report.statistics.nonCompliantDevices]);
    rows.push(['Error', report.statistics.errorDevices]);
    rows.push(['In Grace Period', report.statistics.inGracePeriodDevices]);
    rows.push(['Compliance Rate', `${report.statistics.complianceRate}%`]);
    rows.push([]);
    
    // Policy breakdown
    rows.push(['Policy Breakdown']);
    rows.push(['Policy Name', 'Platform', 'Compliant', 'Non-Compliant', 'Error', 'Grace Period', 'Total', 'Rate']);
    
    report.statistics.policyBreakdown.forEach(policy => {
      rows.push([
        policy.policyName,
        policy.platform,
        policy.compliantCount,
        policy.nonCompliantCount,
        policy.errorCount,
        policy.inGracePeriodCount,
        policy.totalDevices,
        `${policy.complianceRate}%`
      ]);
    });
    
    rows.push([]);
    
    // Device details
    if (report.deviceStates.length > 0) {
      rows.push(['Device Details']);
      rows.push(['Device Name', 'User', 'Status', 'Last Update', 'Platform']);
      
      report.deviceStates.forEach(state => {
        rows.push([
          state.deviceDisplayName || 'Unknown',
          state.userPrincipalName || 'Unknown',
          state.status || 'Unknown',
          state.lastReportedDateTime ? new Date(state.lastReportedDateTime).toLocaleString() : 'N/A',
          state.platform || 'Unknown'
        ]);
      });
    }
    
    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        // Escape quotes and wrap in quotes if contains comma
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    return csvContent;
  }

  /**
   * Download CSV report
   */
  downloadCSVReport(report, filename = null) {
    const csv = this.exportToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const defaultFilename = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }

  /**
   * Export report to JSON
   */
  exportToJSON(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Download JSON report
   */
  downloadJSONReport(report, filename = null) {
    const json = this.exportToJSON(report);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    const defaultFilename = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }

  /**
   * Get non-compliant devices summary
   */
  async getNonCompliantDevicesSummary() {
    try {
      const deviceStates = await this.fetchAllDeviceComplianceStates();
      
      const nonCompliant = deviceStates.filter(
        state => state.status === 'nonCompliant' || state.status === 'error'
      );
      
      // Group by policy violation
      const violationSummary = {};
      
      nonCompliant.forEach(device => {
        const reason = device.complianceGracePeriodExpirationDateTime 
          ? 'Grace period expired'
          : 'Policy violation';
        
        if (!violationSummary[reason]) {
          violationSummary[reason] = [];
        }
        
        violationSummary[reason].push({
          deviceName: device.deviceDisplayName,
          user: device.userPrincipalName,
          lastUpdate: device.lastReportedDateTime,
          status: device.status
        });
      });
      
      return {
        totalNonCompliant: nonCompliant.length,
        violations: violationSummary,
        devices: nonCompliant
      };
    } catch (error) {
      console.error('Error getting non-compliant devices:', error);
      throw error;
    }
  }

  /**
   * Get compliance trends by platform
   */
  async getComplianceByPlatform() {
    try {
      const deviceStates = await this.fetchAllDeviceComplianceStates();
      
      const platformStats = {};
      
      deviceStates.forEach(state => {
        const platform = state.platform || 'Unknown';
        
        if (!platformStats[platform]) {
          platformStats[platform] = {
            total: 0,
            compliant: 0,
            nonCompliant: 0,
            error: 0,
            inGracePeriod: 0
          };
        }
        
        platformStats[platform].total++;
        
        if (state.status === 'compliant') {
          platformStats[platform].compliant++;
        } else if (state.status === 'nonCompliant') {
          platformStats[platform].nonCompliant++;
        } else if (state.status === 'error') {
          platformStats[platform].error++;
        } else if (state.status === 'inGracePeriod') {
          platformStats[platform].inGracePeriod++;
        }
      });
      
      return platformStats;
    } catch (error) {
      console.error('Error getting compliance by platform:', error);
      throw error;
    }
  }
}

export default new IntuneComplianceReportService();
