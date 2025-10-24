/**
 * Settings Catalog & Templates Service
 * Manages Intune settings catalog and policy templates for easy configuration deployment
 * Provides template-based policy creation and settings discovery
 */

import intuneService from './intuneService';

// ========== SETTINGS CATALOG CATEGORIES ==========

/**
 * Get settings catalog categories by platform
 * @param {string} platform - Platform: 'windows10', 'iOS', 'macOS', 'android'
 * @returns {Array<Object>} List of setting categories
 */
export const getSettingCategories = (platform = 'windows10') => {
  const categories = {
    windows10: [
      {
        id: 'authentication',
        name: '🔐 Authentication',
        description: 'Windows Hello, biometrics, and authentication methods',
        settingsCount: 45
      },
      {
        id: 'bitlocker',
        name: '🔒 BitLocker',
        description: 'Drive encryption and BitLocker policies',
        settingsCount: 78
      },
      {
        id: 'defender',
        name: '🛡️ Microsoft Defender',
        description: 'Antivirus, threat protection, and security settings',
        settingsCount: 156
      },
      {
        id: 'firewall',
        name: '🔥 Windows Firewall',
        description: 'Firewall rules and domain/private/public profiles',
        settingsCount: 92
      },
      {
        id: 'edge',
        name: '🌐 Microsoft Edge',
        description: 'Browser policies, extensions, and security',
        settingsCount: 234
      },
      {
        id: 'onedrive',
        name: '☁️ OneDrive',
        description: 'OneDrive sync, known folder move, and policies',
        settingsCount: 67
      },
      {
        id: 'updates',
        name: '🔄 Windows Update',
        description: 'Update rings, feature updates, and quality updates',
        settingsCount: 89
      },
      {
        id: 'startmenu',
        name: '🎯 Start Menu & Taskbar',
        description: 'Start menu layout, taskbar, and user experience',
        settingsCount: 43
      },
      {
        id: 'applocker',
        name: '🚫 AppLocker',
        description: 'Application control and execution policies',
        settingsCount: 34
      },
      {
        id: 'devicelock',
        name: '🔐 Device Lock',
        description: 'Password policies, lock screen, and biometric settings',
        settingsCount: 56
      }
    ],
    iOS: [
      {
        id: 'restrictions',
        name: '🚫 Device Restrictions',
        description: 'Control device features and capabilities',
        settingsCount: 124
      },
      {
        id: 'security',
        name: '🔒 Security',
        description: 'Passcode, Touch ID, Face ID policies',
        settingsCount: 45
      },
      {
        id: 'apps',
        name: '📱 App Configuration',
        description: 'Managed app settings and restrictions',
        settingsCount: 67
      }
    ],
    macOS: [
      {
        id: 'security',
        name: '🔒 Security & Privacy',
        description: 'FileVault, Gatekeeper, and privacy settings',
        settingsCount: 78
      },
      {
        id: 'restrictions',
        name: '🚫 Device Restrictions',
        description: 'Control macOS features and capabilities',
        settingsCount: 89
      }
    ],
    android: [
      {
        id: 'workprofile',
        name: '💼 Work Profile',
        description: 'Android Enterprise work profile settings',
        settingsCount: 56
      },
      {
        id: 'security',
        name: '🔒 Security',
        description: 'Password, encryption, and security policies',
        settingsCount: 43
      }
    ]
  };
  
  return categories[platform] || [];
};

/**
 * Search settings across all categories
 * @param {string} platform - Platform
 * @param {string} query - Search query
 * @returns {Array<Object>} Matching settings
 */
export const searchSettings = (platform, query) => {
  // In production, this would query the actual settings catalog API
  // For now, return mock search results
  
  const mockSettings = [
    {
      id: 'bitlocker_require_device_encryption',
      name: 'Require Device Encryption',
      category: 'bitlocker',
      description: 'Enforce BitLocker encryption on all fixed drives',
      dataType: 'boolean',
      defaultValue: false
    },
    {
      id: 'defender_realtime_protection',
      name: 'Enable Real-time Protection',
      category: 'defender',
      description: 'Turn on real-time malware protection',
      dataType: 'boolean',
      defaultValue: true
    },
    {
      id: 'firewall_domain_profile_enabled',
      name: 'Enable Domain Profile',
      category: 'firewall',
      description: 'Enable Windows Firewall for domain networks',
      dataType: 'boolean',
      defaultValue: true
    }
  ];
  
  return mockSettings.filter(setting =>
    setting.name.toLowerCase().includes(query.toLowerCase()) ||
    setting.description.toLowerCase().includes(query.toLowerCase())
  );
};

// ========== POLICY TEMPLATES ==========

/**
 * Get all available templates for a platform
 * @param {string} platform - Platform
 * @returns {Array<Object>} List of templates
 */
export const getAvailableTemplates = (platform = 'windows10') => {
  const templates = {
    windows10: [
      // Security Templates
      {
        id: 'bitlocker-full',
        name: '🔒 BitLocker Full Disk Encryption',
        description: 'Enable BitLocker on all fixed and removable drives with TPM protection',
        category: 'Security',
        platform: 'windows10',
        icon: '🔒',
        complexity: 'intermediate',
        settings: [
          {
            definitionId: 'device_vendor_msft_bitlocker_requiredeviceencryption',
            value: true
          },
          {
            definitionId: 'device_vendor_msft_bitlocker_encryptionmethodbydrivetype',
            value: 'aesCbc256'
          },
          {
            definitionId: 'device_vendor_msft_bitlocker_allowstandarduserencryption',
            value: false
          }
        ]
      },
      {
        id: 'firewall-enterprise',
        name: '🛡️ Enterprise Firewall Configuration',
        description: 'Secure firewall settings for domain, private, and public networks',
        category: 'Security',
        platform: 'windows10',
        icon: '🛡️',
        complexity: 'advanced',
        settings: [
          {
            definitionId: 'vendor_msft_firewall_mdmstore_domainprofile_enablefirewall',
            value: true
          },
          {
            definitionId: 'vendor_msft_firewall_mdmstore_privateprofile_enablefirewall',
            value: true
          },
          {
            definitionId: 'vendor_msft_firewall_mdmstore_publicprofile_enablefirewall',
            value: true
          }
        ]
      },
      {
        id: 'defender-advanced',
        name: '🦠 Microsoft Defender Advanced Protection',
        description: 'Comprehensive antivirus and threat protection settings',
        category: 'Security',
        platform: 'windows10',
        icon: '🦠',
        complexity: 'advanced',
        settings: [
          {
            definitionId: 'device_vendor_msft_policy_config_defender_allowrealtimemonitoring',
            value: true
          },
          {
            definitionId: 'device_vendor_msft_policy_config_defender_allowcloudprotection',
            value: true
          },
          {
            definitionId: 'device_vendor_msft_policy_config_defender_submitsamplesconsent',
            value: 1
          }
        ]
      },
      
      // Network Templates
      {
        id: 'wifi-enterprise-wpa2',
        name: '📶 Enterprise Wi-Fi (WPA2-Enterprise)',
        description: 'Deploy secure WPA2-Enterprise Wi-Fi profile with certificate authentication',
        category: 'Network',
        platform: 'windows10',
        icon: '📶',
        complexity: 'advanced',
        requiresInput: ['ssid', 'certificateId']
      },
      {
        id: 'vpn-ikev2',
        name: '🔐 VPN Profile (IKEv2)',
        description: 'Configure IKEv2 VPN connection with machine certificate authentication',
        category: 'Network',
        platform: 'windows10',
        icon: '🔐',
        complexity: 'advanced',
        requiresInput: ['serverAddress', 'certificateId']
      },
      
      // Application Templates
      {
        id: 'edge-enterprise',
        name: '🌐 Microsoft Edge Enterprise Configuration',
        description: 'Secure browser settings for enterprise environments',
        category: 'Applications',
        platform: 'windows10',
        icon: '🌐',
        complexity: 'intermediate',
        settings: [
          {
            definitionId: 'edge_policy_homepageisnewtabpage',
            value: true
          },
          {
            definitionId: 'edge_policy_smartscreenenabled',
            value: true
          },
          {
            definitionId: 'edge_policy_passwordmanagerenabled',
            value: false
          }
        ]
      },
      {
        id: 'onedrive-silent-move',
        name: '☁️ OneDrive Known Folder Move',
        description: 'Silently redirect Desktop, Documents, and Pictures to OneDrive',
        category: 'Applications',
        platform: 'windows10',
        icon: '☁️',
        complexity: 'intermediate',
        requiresInput: ['tenantId']
      },
      
      // Device Management Templates
      {
        id: 'windows-update-ring',
        name: '🔄 Windows Update Ring',
        description: 'Configure Windows Update for Business with deferral periods',
        category: 'Updates',
        platform: 'windows10',
        icon: '🔄',
        complexity: 'intermediate',
        settings: [
          {
            definitionId: 'update_deferfeatureupdatesperiodindays',
            value: 7
          },
          {
            definitionId: 'update_deferqualityupdatesperiodindays',
            value: 3
          },
          {
            definitionId: 'update_allowautowindowsupdatedownloadovermeterednetwork',
            value: false
          }
        ]
      },
      {
        id: 'kiosk-single-app',
        name: '📱 Kiosk Mode (Single App)',
        description: 'Lock device to a single application',
        category: 'Device Configuration',
        platform: 'windows10',
        icon: '📱',
        complexity: 'advanced',
        requiresInput: ['aumid']
      },
      {
        id: 'password-policy-strong',
        name: '🔐 Strong Password Policy',
        description: 'Enforce strong passwords with complexity requirements',
        category: 'Security',
        platform: 'windows10',
        icon: '🔐',
        complexity: 'basic',
        settings: [
          {
            definitionId: 'device_vendor_msft_policy_config_devicelock_mindevicepasswordlength',
            value: 12
          },
          {
            definitionId: 'device_vendor_msft_policy_config_devicelock_mindevicepasswordcomplexcharacters',
            value: 3
          },
          {
            definitionId: 'device_vendor_msft_policy_config_devicelock_maxinactivitytimedevicelock',
            value: 5
          }
        ]
      }
    ],
    iOS: [
      {
        id: 'restrictions-ios-basic',
        name: '🚫 iOS Device Restrictions',
        description: 'Common iOS device restrictions for enterprise',
        category: 'Security',
        platform: 'iOS',
        icon: '🚫',
        complexity: 'basic'
      },
      {
        id: 'wifi-ios-wpa2',
        name: '📶 Wi-Fi Profile (iOS)',
        description: 'Deploy Wi-Fi profile to iOS devices',
        category: 'Network',
        platform: 'iOS',
        icon: '📶',
        complexity: 'intermediate',
        requiresInput: ['ssid', 'password']
      }
    ],
    macOS: [
      {
        id: 'filevault-macos',
        name: '🔒 FileVault Encryption',
        description: 'Enable FileVault full disk encryption on macOS',
        category: 'Security',
        platform: 'macOS',
        icon: '🔒',
        complexity: 'intermediate'
      }
    ],
    android: [
      {
        id: 'work-profile-android',
        name: '💼 Android Work Profile Configuration',
        description: 'Configure Android Enterprise work profile settings',
        category: 'Device Configuration',
        platform: 'android',
        icon: '💼',
        complexity: 'intermediate'
      }
    ]
  };
  
  return templates[platform] || [];
};

/**
 * Get template details
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template details
 */
export const getTemplateDetails = (templateId) => {
  const allTemplates = [
    ...getAvailableTemplates('windows10'),
    ...getAvailableTemplates('iOS'),
    ...getAvailableTemplates('macOS'),
    ...getAvailableTemplates('android')
  ];
  
  return allTemplates.find(t => t.id === templateId) || null;
};

/**
 * Get templates by category
 * @param {string} category - Category: 'Security', 'Network', 'Applications', etc.
 * @returns {Array<Object>} Matching templates
 */
export const getTemplatesByCategory = (category) => {
  const allTemplates = [
    ...getAvailableTemplates('windows10'),
    ...getAvailableTemplates('iOS'),
    ...getAvailableTemplates('macOS'),
    ...getAvailableTemplates('android')
  ];
  
  return allTemplates.filter(t => t.category === category);
};

// ========== POLICY CREATION HELPERS ==========

/**
 * Create a policy from a template
 * @param {string} templateId - Template ID
 * @param {Object} customization - Custom values for template
 * @returns {Promise<Object>} Created policy
 */
export const createPolicyFromTemplate = async (templateId, customization = {}) => {
  try {
    const template = getTemplateDetails(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Check if all required inputs are provided
    if (template.requiresInput) {
      const missingInputs = template.requiresInput.filter(
        input => !customization[input]
      );
      
      if (missingInputs.length > 0) {
        throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
      }
    }
    
    // Build policy data
    const policyData = {
      name: customization.name || template.name,
      description: customization.description || template.description,
      platforms: template.platform,
      technologies: 'mdm',
      settings: template.settings || []
    };
    
    // Apply customizations
    if (customization.settings) {
      policyData.settings = policyData.settings.map(setting => {
        const custom = customization.settings.find(
          s => s.definitionId === setting.definitionId
        );
        return custom || setting;
      });
    }
    
    // Create the policy
    return await intuneService.createConfigurationPolicy(policyData);
    
  } catch (error) {
    console.error('Error creating policy from template:', error);
    throw error;
  }
};

/**
 * Create a custom policy using settings catalog
 * @param {Object} policyData - Policy configuration
 * @returns {Promise<Object>} Created policy
 */
export const createCustomPolicy = async (policyData) => {
  try {
    return await intuneService.createConfigurationPolicy(policyData);
  } catch (error) {
    console.error('Error creating custom policy:', error);
    throw error;
  }
};

/**
 * Validate policy settings before creation
 * @param {Object} policyData - Policy configuration
 * @returns {Object} Validation result
 */
export const validatePolicySettings = (policyData) => {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!policyData.name || policyData.name.trim() === '') {
    errors.push('Policy name is required');
  }
  
  if (!policyData.platforms) {
    errors.push('Platform is required');
  }
  
  if (!policyData.settings || policyData.settings.length === 0) {
    warnings.push('No settings configured - policy will have no effect');
  }
  
  // Check for duplicate setting IDs
  if (policyData.settings) {
    const settingIds = policyData.settings.map(s => s.definitionId);
    const duplicates = settingIds.filter((id, index) => settingIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate settings found: ${duplicates.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Generate policy preview
 * @param {string} templateId - Template ID
 * @param {Object} customization - Customization options
 * @returns {Object} Policy preview
 */
export const generatePolicyPreview = (templateId, customization = {}) => {
  const template = getTemplateDetails(templateId);
  
  if (!template) {
    return null;
  }
  
  return {
    name: customization.name || template.name,
    description: customization.description || template.description,
    platform: template.platform,
    category: template.category,
    complexity: template.complexity,
    settingsCount: template.settings ? template.settings.length : 0,
    settings: template.settings || [],
    requiresInput: template.requiresInput || [],
    estimatedDeploymentTime: calculateDeploymentTime(template)
  };
};

/**
 * Calculate estimated deployment time
 * @param {Object} template - Template object
 * @returns {string} Estimated time
 */
const calculateDeploymentTime = (template) => {
  const settingsCount = template.settings ? template.settings.length : 0;
  
  if (settingsCount <= 5) return '5-10 minutes';
  if (settingsCount <= 15) return '10-20 minutes';
  if (settingsCount <= 30) return '20-30 minutes';
  return '30-60 minutes';
};

// ========== TEMPLATE CATEGORIES ==========

/**
 * Get all template categories
 * @returns {Array<Object>} List of categories
 */
export const getTemplateCategories = () => [
  {
    id: 'security',
    name: '🔒 Security',
    description: 'BitLocker, Firewall, Defender, passwords',
    icon: '🔒',
    count: 4
  },
  {
    id: 'network',
    name: '📡 Network',
    description: 'Wi-Fi, VPN, proxy configuration',
    icon: '📡',
    count: 2
  },
  {
    id: 'applications',
    name: '📱 Applications',
    description: 'Browser, OneDrive, Office settings',
    icon: '📱',
    count: 2
  },
  {
    id: 'updates',
    name: '🔄 Updates',
    description: 'Windows Update, feature updates',
    icon: '🔄',
    count: 1
  },
  {
    id: 'device-config',
    name: '🖥️ Device Configuration',
    description: 'Kiosk, restrictions, device features',
    icon: '🖥️',
    count: 1
  }
];

/**
 * Get recommended templates for common scenarios
 * @param {string} scenario - Scenario: 'new-deployment', 'security-hardening', 'remote-work'
 * @returns {Array<string>} Template IDs
 */
export const getRecommendedTemplates = (scenario) => {
  const recommendations = {
    'new-deployment': [
      'bitlocker-full',
      'defender-advanced',
      'password-policy-strong',
      'windows-update-ring',
      'edge-enterprise'
    ],
    'security-hardening': [
      'bitlocker-full',
      'firewall-enterprise',
      'defender-advanced',
      'password-policy-strong'
    ],
    'remote-work': [
      'vpn-ikev2',
      'onedrive-silent-move',
      'edge-enterprise',
      'windows-update-ring'
    ],
    'kiosk-deployment': [
      'kiosk-single-app',
      'password-policy-strong',
      'windows-update-ring'
    ]
  };
  
  return recommendations[scenario] || [];
};

export default {
  // Settings Catalog
  getSettingCategories,
  searchSettings,
  
  // Templates
  getAvailableTemplates,
  getTemplateDetails,
  getTemplatesByCategory,
  getTemplateCategories,
  getRecommendedTemplates,
  
  // Policy Creation
  createPolicyFromTemplate,
  createCustomPolicy,
  validatePolicySettings,
  generatePolicyPreview,
};
