/**
 * ADMX Import Service
 * Parse ADMX/ADML files and convert to Intune configuration policies
 * Uses MSAL authentication via Convex proxy
 */

import msalGraphService from '../msalGraphService';

class ADMXImportService {
  constructor() {
    this.parser = new DOMParser();
  }

  /**
   * Parse ADMX file (XML format)
   * @param {string} admxContent - ADMX XML content
   * @returns {Object} Parsed ADMX structure
   */
  parseADMX(admxContent) {
    try {
      const xmlDoc = this.parser.parseFromString(admxContent, 'text/xml');
      
      // Check for parse errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid ADMX XML format');
      }

      const policies = [];
      const policyDefinitions = xmlDoc.querySelectorAll('policy');

      policyDefinitions.forEach(policy => {
        const policyData = {
          name: policy.getAttribute('name'),
          displayName: policy.getAttribute('displayName'),
          explainText: policy.getAttribute('explainText'),
          key: policy.getAttribute('key'),
          class: policy.getAttribute('class'), // User or Machine
          valueName: policy.getAttribute('valueName'),
          presentation: policy.getAttribute('presentation'),
          enabledValue: null,
          disabledValue: null,
          elements: []
        };

        // Parse enabled/disabled values
        const enabledValue = policy.querySelector('enabledValue');
        if (enabledValue) {
          policyData.enabledValue = this.parseValue(enabledValue);
        }

        const disabledValue = policy.querySelector('disabledValue');
        if (disabledValue) {
          policyData.disabledValue = this.parseValue(disabledValue);
        }

        // Parse elements (text boxes, dropdowns, etc.)
        const elements = policy.querySelectorAll('elements > *');
        elements.forEach(element => {
          policyData.elements.push(this.parseElement(element));
        });

        policies.push(policyData);
      });

      return {
        policies,
        categories: this.parseCategories(xmlDoc),
        supportedOn: this.parseSupportedOn(xmlDoc)
      };
    } catch (error) {
      console.error('ADMX parse error:', error);
      throw new Error(`Failed to parse ADMX file: ${error.message}`);
    }
  }

  /**
   * Parse ADML file (language strings)
   * @param {string} admlContent - ADML XML content
   * @returns {Object} Display strings for policies
   */
  parseADML(admlContent) {
    try {
      const xmlDoc = this.parser.parseFromString(admlContent, 'text/xml');
      
      const strings = {};
      const stringElements = xmlDoc.querySelectorAll('string');
      
      stringElements.forEach(str => {
        const id = str.getAttribute('id');
        const value = str.textContent;
        strings[id] = value;
      });

      return strings;
    } catch (error) {
      console.error('ADML parse error:', error);
      throw new Error(`Failed to parse ADML file: ${error.message}`);
    }
  }

  /**
   * Parse categories from ADMX
   */
  parseCategories(xmlDoc) {
    const categories = [];
    const categoryElements = xmlDoc.querySelectorAll('categories > category');
    
    categoryElements.forEach(cat => {
      categories.push({
        name: cat.getAttribute('name'),
        displayName: cat.getAttribute('displayName'),
        parent: cat.querySelector('parentCategory')?.getAttribute('ref')
      });
    });

    return categories;
  }

  /**
   * Parse supportedOn definitions
   */
  parseSupportedOn(xmlDoc) {
    const supported = [];
    const supportedElements = xmlDoc.querySelectorAll('supportedOn > definitions > definition');
    
    supportedElements.forEach(def => {
      supported.push({
        name: def.getAttribute('name'),
        displayName: def.getAttribute('displayName')
      });
    });

    return supported;
  }

  /**
   * Parse policy element (text, decimal, dropdown, etc.)
   */
  parseElement(element) {
    const elementData = {
      type: element.tagName,
      id: element.getAttribute('id'),
      valueName: element.getAttribute('valueName'),
      key: element.getAttribute('key')
    };

    // Type-specific parsing
    switch (element.tagName.toLowerCase()) {
      case 'decimal':
        elementData.minValue = parseInt(element.getAttribute('minValue') || '0');
        elementData.maxValue = parseInt(element.getAttribute('maxValue') || '9999');
        elementData.required = element.getAttribute('required') === 'true';
        break;
      
      case 'text':
        elementData.maxLength = parseInt(element.getAttribute('maxLength') || '1024');
        elementData.required = element.getAttribute('required') === 'true';
        break;
      
      case 'enum':
        elementData.items = [];
        const items = element.querySelectorAll('item');
        items.forEach(item => {
          elementData.items.push({
            displayName: item.getAttribute('displayName'),
            value: this.parseValue(item.querySelector('value'))
          });
        });
        break;
      
      case 'boolean':
        elementData.trueValue = this.parseValue(element.querySelector('trueValue'));
        elementData.falseValue = this.parseValue(element.querySelector('falseValue'));
        break;
    }

    return elementData;
  }

  /**
   * Parse value element
   */
  parseValue(valueElement) {
    if (!valueElement) return null;

    const decimalValue = valueElement.querySelector('decimal');
    if (decimalValue) {
      return {
        type: 'decimal',
        value: parseInt(decimalValue.getAttribute('value'))
      };
    }

    const stringValue = valueElement.querySelector('string');
    if (stringValue) {
      return {
        type: 'string',
        value: stringValue.textContent
      };
    }

    const deleteValue = valueElement.querySelector('delete');
    if (deleteValue) {
      return {
        type: 'delete',
        value: null
      };
    }

    return null;
  }

  /**
   * Convert ADMX policies to Intune configuration policy
   * @param {Object} admxData - Parsed ADMX data
   * @param {Object} admlStrings - Display strings from ADML
   * @param {Array} selectedPolicies - Policy names to import
   * @returns {Object} Intune policy object
   */
  convertToIntunePolicy(admxData, admlStrings, selectedPolicies) {
    const policies = admxData.policies.filter(p => 
      selectedPolicies.includes(p.name)
    );

    // Group by category for organization
    const settingsByCategory = {};
    
    policies.forEach(policy => {
      const category = this.getCategoryPath(policy, admxData.categories);
      
      if (!settingsByCategory[category]) {
        settingsByCategory[category] = [];
      }

      // Create setting instance
      const setting = this.createSettingInstance(policy, admlStrings);
      settingsByCategory[category].push(setting);
    });

    return {
      name: 'Imported from ADMX',
      description: 'Policy imported from ADMX template',
      platforms: 'windows10',
      technologies: 'mdm',
      settings: this.flattenSettings(settingsByCategory)
    };
  }

  /**
   * Get full category path for policy
   */
  getCategoryPath(policy, categories) {
    // Simplified - would need full category tree traversal
    return 'Administrative Templates';
  }

  /**
   * Create Intune setting instance from ADMX policy
   */
  createSettingInstance(policy, admlStrings) {
    const displayName = admlStrings[policy.displayName] || policy.displayName;
    const description = admlStrings[policy.explainText] || policy.explainText;

    const setting = {
      '@odata.type': '#microsoft.graph.deviceManagementConfigurationSetting',
      settingInstance: {
        '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
        settingDefinitionId: this.generateSettingDefinitionId(policy),
        choiceSettingValue: {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingValue',
          value: 'enabled', // Default to enabled
          children: []
        }
      }
    };

    // Add child settings for elements
    policy.elements.forEach(element => {
      const childSetting = this.createChildSetting(element, admlStrings);
      if (childSetting) {
        setting.settingInstance.choiceSettingValue.children.push(childSetting);
      }
    });

    return setting;
  }

  /**
   * Create child setting from element
   */
  createChildSetting(element, admlStrings) {
    const displayName = admlStrings[element.id] || element.id;

    switch (element.type.toLowerCase()) {
      case 'text':
        return {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingInstance',
          settingDefinitionId: element.id,
          simpleSettingValue: {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
            value: ''
          }
        };

      case 'decimal':
        return {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingInstance',
          settingDefinitionId: element.id,
          simpleSettingValue: {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationIntegerSettingValue',
            value: element.minValue || 0
          }
        };

      case 'enum':
        return {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
          settingDefinitionId: element.id,
          choiceSettingValue: {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingValue',
            value: element.items[0]?.value?.value || ''
          }
        };

      default:
        return null;
    }
  }

  /**
   * Generate setting definition ID
   */
  generateSettingDefinitionId(policy) {
    // Intune format: vendor_product_category_setting
    return `device_vendor_msft_policy_config_${policy.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Flatten settings tree
   */
  flattenSettings(settingsByCategory) {
    const flattened = [];
    
    Object.entries(settingsByCategory).forEach(([category, settings]) => {
      flattened.push(...settings);
    });

    return flattened;
  }

  /**
   * Import ADMX as Intune configuration policy
   */
  async importToIntune(admxData, admlStrings, selectedPolicies, policyName, options = {}) {
    try {
      // Convert to Intune format
      const intunePolicy = this.convertToIntunePolicy(admxData, admlStrings, selectedPolicies);
      intunePolicy.name = policyName;
      
      if (options.description) {
        intunePolicy.description = options.description;
      }

      // Create policy via Graph API
      const response = await msalGraphService.makeRequest(
        '/deviceManagement/configurationPolicies',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(intunePolicy)
        }
      );

      return response;
    } catch (error) {
      console.error('Import to Intune error:', error);
      throw new Error(`Failed to import to Intune: ${error.message}`);
    }
  }

  /**
   * Validate ADMX file structure
   */
  validateADMX(admxContent) {
    const errors = [];

    try {
      const xmlDoc = this.parser.parseFromString(admxContent, 'text/xml');
      
      // Check for parser errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        errors.push('Invalid XML format');
        return { valid: false, errors };
      }

      // Check for required elements
      if (!xmlDoc.querySelector('policyDefinitions')) {
        errors.push('Missing policyDefinitions root element');
      }

      if (!xmlDoc.querySelector('policies')) {
        errors.push('Missing policies element');
      }

    } catch (error) {
      errors.push(`Parse error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract policy summary from ADMX
   */
  extractSummary(admxData, admlStrings) {
    return {
      totalPolicies: admxData.policies.length,
      categories: [...new Set(admxData.policies.map(p => this.getCategoryPath(p, admxData.categories)))],
      userPolicies: admxData.policies.filter(p => p.class === 'User').length,
      machinePolicies: admxData.policies.filter(p => p.class === 'Machine').length,
      policiesWithElements: admxData.policies.filter(p => p.elements.length > 0).length
    };
  }
}

// Export singleton instance
export const admxImportService = new ADMXImportService();

export default admxImportService;
