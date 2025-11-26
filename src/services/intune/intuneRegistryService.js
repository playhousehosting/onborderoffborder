/**
 * Intune Registry Settings Service
 * Create and manage Windows Registry-based configuration policies
 * Uses service factory to support both MSAL and Convex authentication modes
 */

import { getActiveService } from '../serviceFactory';

class IntuneRegistryService {
  /**
   * Registry value types
   */
  static VALUE_TYPES = {
    STRING: 'String',
    INTEGER: 'Integer',
    BINARY: 'Binary',
    MULTI_STRING: 'MultiString',
    EXPANDABLE_STRING: 'ExpandableString',
    QWORD: 'Qword',
    DWORD: 'Dword'
  };

  /**
   * Registry hives
   */
  static HIVES = {
    HKLM: 'HKEY_LOCAL_MACHINE',
    HKCU: 'HKEY_CURRENT_USER',
    HKCR: 'HKEY_CLASSES_ROOT',
    HKU: 'HKEY_USERS',
    HKCC: 'HKEY_CURRENT_CONFIG'
  };

  /**
   * Create a custom OMA-URI configuration policy with registry settings
   * @param {string} name - Policy name
   * @param {string} description - Policy description
   * @param {Array} registrySettings - Array of registry settings
   * @returns {Promise<Object>} Created policy
   */
  async createRegistryPolicy(name, description, registrySettings) {
    const omaSettings = registrySettings.map((setting, index) => {
      const omaUri = this._buildOmaUri(setting);
      
      return {
        '@odata.type': '#microsoft.graph.omaSettingString',
        displayName: setting.displayName || `Registry Setting ${index + 1}`,
        description: setting.description || '',
        omaUri: omaUri,
        value: this._encodeRegistryValue(setting)
      };
    });

    const policy = {
      '@odata.type': '#microsoft.graph.windows10CustomConfiguration',
      displayName: name,
      description: description || 'Custom registry configuration policy',
      omaSettings: omaSettings
    };

    const response = await getActiveService().makeRequest(
      '/deviceManagement/deviceConfigurations',
      'POST',
      policy
    );

    return response;
  }

  /**
   * Build OMA-URI for registry setting
   * @private
   */
  _buildOmaUri(setting) {
    const { hive, keyPath, valueName } = setting;
    
    // Convert hive to OMA-URI format
    const hiveMap = {
      'HKEY_LOCAL_MACHINE': 'HKLM',
      'HKEY_CURRENT_USER': 'HKCU',
      'HKEY_CLASSES_ROOT': 'HKCR',
      'HKEY_USERS': 'HKU',
      'HKEY_CURRENT_CONFIG': 'HKCC'
    };

    const shortHive = hiveMap[hive] || hive.replace('HKEY_', 'HK');
    
    // Build OMA-URI
    const cleanPath = keyPath.replace(/\\/g, '/');
    return `./Vendor/MSFT/Registry/${shortHive}/${cleanPath}/${valueName}`;
  }

  /**
   * Encode registry value based on type
   * @private
   */
  _encodeRegistryValue(setting) {
    const { valueType, value } = setting;

    switch (valueType) {
      case 'String':
      case 'ExpandableString':
        return String(value);
      
      case 'Integer':
      case 'Dword':
      case 'Qword':
        return String(value);
      
      case 'Binary':
        // Binary should be hex string
        return value;
      
      case 'MultiString':
        // Multi-string separated by \0
        if (Array.isArray(value)) {
          return value.join('\0');
        }
        return value;
      
      default:
        return String(value);
    }
  }

  /**
   * Parse registry (.reg) file content
   * @param {string} regFileContent - Content of .reg file
   * @returns {Array} Array of registry settings
   */
  parseRegFile(regFileContent) {
    const settings = [];
    const lines = regFileContent.split('\n');
    
    let currentKey = null;
    let currentHive = null;

    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (!line || line.startsWith(';') || line.startsWith('Windows Registry Editor')) {
        continue;
      }

      // Registry key line [HKEY_...]
      if (line.startsWith('[') && line.endsWith(']')) {
        const keyPath = line.slice(1, -1);
        
        // Extract hive and path
        const hiveMatch = keyPath.match(/^(HKEY_[A-Z_]+)/);
        if (hiveMatch) {
          currentHive = hiveMatch[1];
          currentKey = keyPath.substring(currentHive.length + 1);
        }
        continue;
      }

      // Value line "ValueName"=value
      if (line.includes('=') && currentKey) {
        const equalIndex = line.indexOf('=');
        let valueName = line.substring(0, equalIndex).trim();
        let valueData = line.substring(equalIndex + 1).trim();

        // Remove quotes from value name
        if (valueName.startsWith('"') && valueName.endsWith('"')) {
          valueName = valueName.slice(1, -1);
        }

        // Default value
        if (valueName === '@') {
          valueName = '(Default)';
        }

        // Parse value type and data
        let valueType = 'String';
        let value = valueData;

        if (valueData.startsWith('dword:')) {
          valueType = 'Dword';
          value = parseInt(valueData.substring(6), 16);
        } else if (valueData.startsWith('hex:')) {
          valueType = 'Binary';
          value = valueData.substring(4).replace(/,/g, '');
        } else if (valueData.startsWith('hex(7):')) {
          valueType = 'MultiString';
          value = valueData.substring(7).replace(/,/g, '');
        } else if (valueData.startsWith('hex(2):')) {
          valueType = 'ExpandableString';
          value = valueData.substring(7).replace(/,/g, '');
        } else if (valueData.startsWith('hex(b):')) {
          valueType = 'Qword';
          value = valueData.substring(7).replace(/,/g, '');
        } else if (valueData.startsWith('"') && valueData.endsWith('"')) {
          valueType = 'String';
          value = valueData.slice(1, -1);
        }

        settings.push({
          hive: currentHive,
          keyPath: currentKey,
          valueName: valueName,
          valueType: valueType,
          value: value,
          displayName: `${valueName} in ${currentKey}`,
          description: `Registry setting: ${currentHive}\\${currentKey}\\${valueName}`
        });
      }
    }

    return settings;
  }

  /**
   * Import registry settings from .reg file
   * @param {File} file - .reg file
   * @param {string} policyName - Name for the policy
   * @param {string} policyDescription - Description for the policy
   * @returns {Promise<Object>} Created policy
   */
  async importRegFile(file, policyName, policyDescription) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const settings = this.parseRegFile(content);
          
          if (settings.length === 0) {
            reject(new Error('No registry settings found in file'));
            return;
          }

          const policy = await this.createRegistryPolicy(
            policyName,
            policyDescription,
            settings
          );

          resolve({
            policy,
            settingsCount: settings.length,
            settings
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Fetch existing custom configuration policies (OMA-URI)
   * @returns {Promise<Array>} Array of custom policies
   */
  async fetchCustomPolicies() {
    const response = await getActiveService().makeRequest(
      '/deviceManagement/deviceConfigurations?$filter=isof(%27microsoft.graph.windows10CustomConfiguration%27)',
      'GET'
    );

    return response.value || [];
  }

  /**
   * Fetch registry settings from a custom policy
   * @param {string} policyId - Policy ID
   * @returns {Promise<Array>} Array of OMA settings
   */
  async fetchPolicySettings(policyId) {
    const response = await getActiveService().makeRequest(
      `/deviceManagement/deviceConfigurations/${policyId}`,
      'GET'
    );

    return response.omaSettings || [];
  }

  /**
   * Update registry policy
   * @param {string} policyId - Policy ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated policy
   */
  async updateRegistryPolicy(policyId, updates) {
    const response = await getActiveService().makeRequest(
      `/deviceManagement/deviceConfigurations/${policyId}`,
      'PATCH',
      updates
    );

    return response;
  }

  /**
   * Add registry setting to existing policy
   * @param {string} policyId - Policy ID
   * @param {Object} registrySetting - Registry setting to add
   * @returns {Promise<Object>} Updated policy
   */
  async addSettingToPolicy(policyId, registrySetting) {
    // Fetch current settings
    const policy = await getActiveService().makeRequest(
      `/deviceManagement/deviceConfigurations/${policyId}`,
      'GET'
    );

    const currentSettings = policy.omaSettings || [];
    
    // Add new setting
    const newSetting = {
      '@odata.type': '#microsoft.graph.omaSettingString',
      displayName: registrySetting.displayName,
      description: registrySetting.description || '',
      omaUri: this._buildOmaUri(registrySetting),
      value: this._encodeRegistryValue(registrySetting)
    };

    currentSettings.push(newSetting);

    // Update policy
    return await this.updateRegistryPolicy(policyId, {
      omaSettings: currentSettings
    });
  }

  /**
   * Remove registry setting from policy
   * @param {string} policyId - Policy ID
   * @param {number} settingIndex - Index of setting to remove
   * @returns {Promise<Object>} Updated policy
   */
  async removeSettingFromPolicy(policyId, settingIndex) {
    // Fetch current settings
    const policy = await getActiveService().makeRequest(
      `/deviceManagement/deviceConfigurations/${policyId}`,
      'GET'
    );

    const currentSettings = policy.omaSettings || [];
    
    // Remove setting
    currentSettings.splice(settingIndex, 1);

    // Update policy
    return await this.updateRegistryPolicy(policyId, {
      omaSettings: currentSettings
    });
  }

  /**
   * Export registry settings to .reg file format
   * @param {Array} settings - Array of registry settings
   * @returns {string} .reg file content
   */
  exportToRegFile(settings) {
    let content = 'Windows Registry Editor Version 5.00\n\n';

    // Group settings by key
    const groupedSettings = {};
    
    settings.forEach(setting => {
      const fullKey = `[${setting.hive}\\${setting.keyPath}]`;
      if (!groupedSettings[fullKey]) {
        groupedSettings[fullKey] = [];
      }
      groupedSettings[fullKey].push(setting);
    });

    // Generate content
    Object.entries(groupedSettings).forEach(([key, keySettings]) => {
      content += `${key}\n`;
      
      keySettings.forEach(setting => {
        const valueName = setting.valueName === '(Default)' ? '@' : `"${setting.valueName}"`;
        let valueData;

        switch (setting.valueType) {
          case 'String':
            valueData = `"${setting.value}"`;
            break;
          case 'Dword':
            valueData = `dword:${parseInt(setting.value).toString(16).padStart(8, '0')}`;
            break;
          case 'Binary':
            valueData = `hex:${setting.value}`;
            break;
          case 'MultiString':
            valueData = `hex(7):${setting.value}`;
            break;
          case 'ExpandableString':
            valueData = `hex(2):${setting.value}`;
            break;
          case 'Qword':
            valueData = `hex(b):${setting.value}`;
            break;
          default:
            valueData = `"${setting.value}"`;
        }

        content += `${valueName}=${valueData}\n`;
      });

      content += '\n';
    });

    return content;
  }

  /**
   * Download registry settings as .reg file
   * @param {Array} settings - Array of registry settings
   * @param {string} filename - Output filename
   */
  downloadRegFile(settings, filename = 'registry-export.reg') {
    const content = this.exportToRegFile(settings);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Validate registry setting
   * @param {Object} setting - Registry setting to validate
   * @returns {Object} Validation result
   */
  validateSetting(setting) {
    const errors = [];

    if (!setting.hive) {
      errors.push('Registry hive is required');
    }

    if (!setting.keyPath) {
      errors.push('Registry key path is required');
    }

    if (!setting.valueName) {
      errors.push('Value name is required');
    }

    if (!setting.valueType) {
      errors.push('Value type is required');
    }

    if (setting.value === undefined || setting.value === null || setting.value === '') {
      errors.push('Value is required');
    }

    // Type-specific validation
    if (setting.valueType === 'Dword' || setting.valueType === 'Integer') {
      if (isNaN(setting.value)) {
        errors.push('Value must be a number for DWORD/Integer type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new IntuneRegistryService();
