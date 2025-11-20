/**
 * Intune App Protection Service
 * Manages App Protection Policies (MAM) for iOS, Android, and Windows
 */

import msalGraphService from '../msalGraphService.js';

class IntuneAppProtectionService {
  constructor() {
    this.graphService = msalGraphService;
  }

  /**
   * Fetch all iOS app protection policies
   */
  async getIOSAppProtectionPolicies() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceAppManagement/iosManagedAppProtections'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching iOS app protection policies:', error);
      throw error;
    }
  }

  /**
   * Fetch all Android app protection policies
   */
  async getAndroidAppProtectionPolicies() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceAppManagement/androidManagedAppProtections'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching Android app protection policies:', error);
      throw error;
    }
  }

  /**
   * Fetch all Windows app protection policies (WIP)
   */
  async getWindowsAppProtectionPolicies() {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceAppManagement/windowsInformationProtectionPolicies'
      );
      return response.value || [];
    } catch (error) {
      console.error('Error fetching Windows app protection policies:', error);
      throw error;
    }
  }

  /**
   * Fetch all app protection policies (all platforms)
   */
  async getAllAppProtectionPolicies() {
    try {
      const [iosPolicies, androidPolicies, windowsPolicies] = await Promise.all([
        this.getIOSAppProtectionPolicies(),
        this.getAndroidAppProtectionPolicies(),
        this.getWindowsAppProtectionPolicies()
      ]);

      return {
        ios: iosPolicies,
        android: androidPolicies,
        windows: windowsPolicies,
        total: iosPolicies.length + androidPolicies.length + windowsPolicies.length
      };
    } catch (error) {
      console.error('Error fetching all app protection policies:', error);
      throw error;
    }
  }

  /**
   * Get specific iOS app protection policy
   */
  async getIOSAppProtectionPolicy(policyId) {
    try {
      const response = await this.graphService.makeRequest(
        `/deviceAppManagement/iosManagedAppProtections/${policyId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching iOS policy:', error);
      throw error;
    }
  }

  /**
   * Get specific Android app protection policy
   */
  async getAndroidAppProtectionPolicy(policyId) {
    try {
      const response = await this.graphService.makeRequest(
        `/deviceAppManagement/androidManagedAppProtections/${policyId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching Android policy:', error);
      throw error;
    }
  }

  /**
   * Get policy assignments
   */
  async getPolicyAssignments(policyId, platform) {
    try {
      let endpoint;
      if (platform === 'ios') {
        endpoint = `/deviceAppManagement/iosManagedAppProtections/${policyId}/assignments`;
      } else if (platform === 'android') {
        endpoint = `/deviceAppManagement/androidManagedAppProtections/${policyId}/assignments`;
      } else {
        endpoint = `/deviceAppManagement/windowsInformationProtectionPolicies/${policyId}/assignments`;
      }

      const response = await this.graphService.makeRequest(endpoint);
      return response.value || [];
    } catch (error) {
      console.error('Error fetching policy assignments:', error);
      throw error;
    }
  }

  /**
   * Create iOS app protection policy
   */
  async createIOSAppProtectionPolicy(policy) {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceAppManagement/iosManagedAppProtections',
        'POST',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error creating iOS app protection policy:', error);
      throw error;
    }
  }

  /**
   * Create Android app protection policy
   */
  async createAndroidAppProtectionPolicy(policy) {
    try {
      const response = await this.graphService.makeRequest(
        '/deviceAppManagement/androidManagedAppProtections',
        'POST',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error creating Android app protection policy:', error);
      throw error;
    }
  }

  /**
   * Update iOS app protection policy
   */
  async updateIOSAppProtectionPolicy(policyId, policy) {
    try {
      const response = await this.graphService.makeRequest(
        `/deviceAppManagement/iosManagedAppProtections/${policyId}`,
        'PATCH',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error updating iOS app protection policy:', error);
      throw error;
    }
  }

  /**
   * Update Android app protection policy
   */
  async updateAndroidAppProtectionPolicy(policyId, policy) {
    try {
      const response = await this.graphService.makeRequest(
        `/deviceAppManagement/androidManagedAppProtections/${policyId}`,
        'PATCH',
        policy
      );
      return response;
    } catch (error) {
      console.error('Error updating Android app protection policy:', error);
      throw error;
    }
  }

  /**
   * Delete app protection policy
   */
  async deleteAppProtectionPolicy(policyId, platform) {
    try {
      let endpoint;
      if (platform === 'ios') {
        endpoint = `/deviceAppManagement/iosManagedAppProtections/${policyId}`;
      } else if (platform === 'android') {
        endpoint = `/deviceAppManagement/androidManagedAppProtections/${policyId}`;
      } else {
        endpoint = `/deviceAppManagement/windowsInformationProtectionPolicies/${policyId}`;
      }

      await this.graphService.makeRequest(endpoint, 'DELETE');
      return true;
    } catch (error) {
      console.error('Error deleting app protection policy:', error);
      throw error;
    }
  }

  /**
   * Get managed apps for policy
   */
  async getManagedApps(policyId, platform) {
    try {
      let endpoint;
      if (platform === 'ios') {
        endpoint = `/deviceAppManagement/iosManagedAppProtections/${policyId}/apps`;
      } else if (platform === 'android') {
        endpoint = `/deviceAppManagement/androidManagedAppProtections/${policyId}/apps`;
      } else {
        return [];
      }

      const response = await this.graphService.makeRequest(endpoint);
      return response.value || [];
    } catch (error) {
      console.error('Error fetching managed apps:', error);
      throw error;
    }
  }

  /**
   * Get policy status report
   */
  async getPolicyStatusReport(policyId, platform) {
    try {
      let endpoint;
      if (platform === 'ios') {
        endpoint = `/deviceAppManagement/iosManagedAppProtections/${policyId}/userStatusSummary`;
      } else if (platform === 'android') {
        endpoint = `/deviceAppManagement/androidManagedAppProtections/${policyId}/userStatusSummary`;
      } else {
        return null;
      }

      const response = await this.graphService.makeRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching policy status report:', error);
      return null;
    }
  }

  /**
   * Export policy configuration to JSON
   */
  exportPolicyToJSON(policy, platform) {
    const exportData = {
      platform,
      exportDate: new Date().toISOString(),
      policy: {
        displayName: policy.displayName,
        description: policy.description,
        settings: this.extractPolicySettings(policy, platform)
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Extract key policy settings based on platform
   */
  extractPolicySettings(policy, platform) {
    const settings = {};

    if (platform === 'ios' || platform === 'android') {
      // Data protection settings
      settings.dataProtection = {
        preventBackup: policy.dataBackupBlocked,
        encryptAppData: policy.encryptAppData,
        disableAppEncryptionIfDeviceEncrypted: policy.disableAppEncryptionIfDeviceEncryptionIsEnabled,
        minimumWarningOSVersion: policy.minimumWarningOsVersion,
        minimumRequiredOSVersion: policy.minimumRequiredOsVersion
      };

      // Access requirements
      settings.accessRequirements = {
        pinRequired: policy.pinRequired,
        pinType: policy.simplePinBlocked ? 'complex' : 'simple',
        maxPinRetries: policy.maximumPinRetries,
        minimumPinLength: policy.minimumPinLength,
        pinRequiredInsteadOfBiometric: policy.pinRequiredInsteadOfBiometricTimeout,
        offlineGracePeriod: policy.periodOfflineBeforeAccessCheck,
        offlineWipeGracePeriod: policy.periodOfflineBeforeWipeIsEnforced
      };

      // Conditional launch
      settings.conditionalLaunch = {
        maxAllowedDeviceThreatLevel: policy.maximumAllowedDeviceThreatLevel,
        disableAppIfJailbroken: policy.deviceComplianceRequired,
        wipeDataAfterMaxPinRetries: policy.maximumPinRetries
      };

      // Data transfer
      settings.dataTransfer = {
        allowedDataIngress: policy.allowedInboundDataTransferSources,
        allowedDataEgress: policy.allowedOutboundDataTransferDestinations,
        allowedClipboardSharing: policy.allowedOutboundClipboardSharingLevel,
        orgDataToOtherApps: policy.dataBackupBlocked,
        openDataIntoOrgDocs: policy.managedBrowser
      };
    }

    return settings;
  }

  /**
   * Download policy configuration as JSON file
   */
  downloadPolicyJSON(policy, platform, filename = null) {
    const json = this.exportPolicyToJSON(policy, platform);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');

    const defaultFilename = `app-protection-${platform}-${policy.displayName?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'policy'}-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.download = filename || defaultFilename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  /**
   * Compare two policies and generate diff report
   */
  comparePolicies(policy1, policy2, platform) {
    const differences = {
      displayName: policy1.displayName !== policy2.displayName,
      description: policy1.description !== policy2.description,
      settings: []
    };

    const settings1 = this.extractPolicySettings(policy1, platform);
    const settings2 = this.extractPolicySettings(policy2, platform);

    // Compare each setting category
    Object.keys(settings1).forEach(category => {
      const cat1 = settings1[category];
      const cat2 = settings2[category];

      Object.keys(cat1).forEach(setting => {
        if (JSON.stringify(cat1[setting]) !== JSON.stringify(cat2[setting])) {
          differences.settings.push({
            category,
            setting,
            policy1Value: cat1[setting],
            policy2Value: cat2[setting]
          });
        }
      });
    });

    return differences;
  }

  /**
   * Get policy templates for quick creation
   */
  getPolicyTemplates(platform) {
    if (platform === 'ios') {
      return {
        basic: {
          '@odata.type': '#microsoft.graph.iosManagedAppProtection',
          displayName: 'iOS App Protection - Basic',
          description: 'Basic protection for iOS apps',
          periodOfflineBeforeAccessCheck: 'PT12H',
          periodOnlineBeforeAccessCheck: 'PT30M',
          allowedInboundDataTransferSources: 'allApps',
          allowedOutboundDataTransferDestinations: 'allApps',
          organizationalCredentialsRequired: false,
          allowedOutboundClipboardSharingLevel: 'allApps',
          dataBackupBlocked: false,
          deviceComplianceRequired: false,
          managedBrowserToOpenLinksRequired: false,
          saveAsBlocked: false,
          periodOfflineBeforeWipeIsEnforced: 'P90D',
          pinRequired: false,
          maximumPinRetries: 5,
          simplePinBlocked: false,
          minimumPinLength: 4,
          pinCharacterSet: 'numeric',
          appDataEncryptionType: 'whenDeviceLocked',
          isAssigned: false
        },
        standard: {
          '@odata.type': '#microsoft.graph.iosManagedAppProtection',
          displayName: 'iOS App Protection - Standard',
          description: 'Standard protection with PIN and data encryption',
          periodOfflineBeforeAccessCheck: 'PT12H',
          periodOnlineBeforeAccessCheck: 'PT30M',
          allowedInboundDataTransferSources: 'managedApps',
          allowedOutboundDataTransferDestinations: 'managedApps',
          organizationalCredentialsRequired: true,
          allowedOutboundClipboardSharingLevel: 'managedAppsWithPasteIn',
          dataBackupBlocked: true,
          deviceComplianceRequired: true,
          managedBrowserToOpenLinksRequired: true,
          saveAsBlocked: true,
          periodOfflineBeforeWipeIsEnforced: 'P30D',
          pinRequired: true,
          maximumPinRetries: 5,
          simplePinBlocked: true,
          minimumPinLength: 6,
          pinCharacterSet: 'alphanumericAndSymbol',
          appDataEncryptionType: 'whenDeviceLockedExceptOpenFiles',
          isAssigned: false
        },
        strict: {
          '@odata.type': '#microsoft.graph.iosManagedAppProtection',
          displayName: 'iOS App Protection - Strict',
          description: 'Maximum security for sensitive data',
          periodOfflineBeforeAccessCheck: 'PT30M',
          periodOnlineBeforeAccessCheck: 'PT15M',
          allowedInboundDataTransferSources: 'managedApps',
          allowedOutboundDataTransferDestinations: 'managedApps',
          organizationalCredentialsRequired: true,
          allowedOutboundClipboardSharingLevel: 'blocked',
          dataBackupBlocked: true,
          deviceComplianceRequired: true,
          managedBrowserToOpenLinksRequired: true,
          saveAsBlocked: true,
          periodOfflineBeforeWipeIsEnforced: 'P14D',
          pinRequired: true,
          maximumPinRetries: 3,
          simplePinBlocked: true,
          minimumPinLength: 8,
          pinCharacterSet: 'alphanumericAndSymbol',
          appDataEncryptionType: 'whenDeviceLocked',
          isAssigned: false
        }
      };
    } else if (platform === 'android') {
      return {
        basic: {
          '@odata.type': '#microsoft.graph.androidManagedAppProtection',
          displayName: 'Android App Protection - Basic',
          description: 'Basic protection for Android apps',
          periodOfflineBeforeAccessCheck: 'PT12H',
          periodOnlineBeforeAccessCheck: 'PT30M',
          allowedInboundDataTransferSources: 'allApps',
          allowedOutboundDataTransferDestinations: 'allApps',
          organizationalCredentialsRequired: false,
          allowedOutboundClipboardSharingLevel: 'allApps',
          dataBackupBlocked: false,
          deviceComplianceRequired: false,
          managedBrowserToOpenLinksRequired: false,
          saveAsBlocked: false,
          periodOfflineBeforeWipeIsEnforced: 'P90D',
          pinRequired: false,
          disableAppPinIfDevicePinIsSet: false,
          maximumPinRetries: 5,
          simplePinBlocked: false,
          minimumPinLength: 4,
          pinCharacterSet: 'numeric',
          encryptAppData: true,
          screenCaptureBlocked: false,
          isAssigned: false
        },
        standard: {
          '@odata.type': '#microsoft.graph.androidManagedAppProtection',
          displayName: 'Android App Protection - Standard',
          description: 'Standard protection with PIN and encryption',
          periodOfflineBeforeAccessCheck: 'PT12H',
          periodOnlineBeforeAccessCheck: 'PT30M',
          allowedInboundDataTransferSources: 'managedApps',
          allowedOutboundDataTransferDestinations: 'managedApps',
          organizationalCredentialsRequired: true,
          allowedOutboundClipboardSharingLevel: 'managedAppsWithPasteIn',
          dataBackupBlocked: true,
          deviceComplianceRequired: true,
          managedBrowserToOpenLinksRequired: true,
          saveAsBlocked: true,
          periodOfflineBeforeWipeIsEnforced: 'P30D',
          pinRequired: true,
          disableAppPinIfDevicePinIsSet: false,
          maximumPinRetries: 5,
          simplePinBlocked: true,
          minimumPinLength: 6,
          pinCharacterSet: 'alphanumericAndSymbol',
          encryptAppData: true,
          screenCaptureBlocked: true,
          isAssigned: false
        },
        strict: {
          '@odata.type': '#microsoft.graph.androidManagedAppProtection',
          displayName: 'Android App Protection - Strict',
          description: 'Maximum security for sensitive data',
          periodOfflineBeforeAccessCheck: 'PT30M',
          periodOnlineBeforeAccessCheck: 'PT15M',
          allowedInboundDataTransferSources: 'managedApps',
          allowedOutboundDataTransferDestinations: 'managedApps',
          organizationalCredentialsRequired: true,
          allowedOutboundClipboardSharingLevel: 'blocked',
          dataBackupBlocked: true,
          deviceComplianceRequired: true,
          managedBrowserToOpenLinksRequired: true,
          saveAsBlocked: true,
          periodOfflineBeforeWipeIsEnforced: 'P14D',
          pinRequired: true,
          disableAppPinIfDevicePinIsSet: false,
          maximumPinRetries: 3,
          simplePinBlocked: true,
          minimumPinLength: 8,
          pinCharacterSet: 'alphanumericAndSymbol',
          encryptAppData: true,
          screenCaptureBlocked: true,
          isAssigned: false
        }
      };
    }

    return {};
  }
}

export default new IntuneAppProtectionService();
