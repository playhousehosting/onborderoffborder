import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { graphService } from '../../services/graphService';
import { isDemoMode } from '../../config/authConfig';
import toast from 'react-hot-toast';
import {
  CogIcon,
  KeyIcon,
  ShieldCheckIcon,
  BellIcon,
  UserGroupIcon,
  ArrowPathIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('azure');
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: '',
  });
  const [preferences, setPreferences] = useState({
    notifications: true,
    autoRefresh: true,
    compactView: false,
    darkMode: false,
  });
  const [isDemo, setIsDemo] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [departmentMappings, setDepartmentMappings] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  useEffect(() => {
    // Load current configuration
    const loadConfig = () => {
      setIsDemo(isDemoMode());
      
      try {
        const azureConfig = JSON.parse(localStorage.getItem('azureConfig') || '{}');
        setConfig({
          clientId: azureConfig.clientId || '',
          tenantId: azureConfig.tenantId || '',
          clientSecret: azureConfig.clientSecret || '',
        });
      } catch (e) {
        console.error('Error loading config:', e);
      }

      // Load preferences
      try {
        const savedPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch (e) {
        console.error('Error loading preferences:', e);
      }

      // Load department mappings
      try {
        const savedMappings = JSON.parse(localStorage.getItem('departmentMappings') || '[]');
        setDepartmentMappings(savedMappings);
      } catch (e) {
        console.error('Error loading department mappings:', e);
      }
    };

    loadConfig();
  }, []);

  // Load available groups when departments tab is active
  useEffect(() => {
    if (activeTab === 'departments' && availableGroups.length === 0) {
      loadGroups();
    }
  }, [activeTab]);

  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const groups = await graphService.getAllGroups();
      setAvailableGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const addDepartmentMapping = () => {
    setDepartmentMappings([...departmentMappings, { department: '', groupIds: [] }]);
  };

  const removeDepartmentMapping = (index) => {
    const updated = departmentMappings.filter((_, i) => i !== index);
    setDepartmentMappings(updated);
    localStorage.setItem('departmentMappings', JSON.stringify(updated));
    toast.success('Mapping removed');
  };

  const updateDepartmentMapping = (index, field, value) => {
    const updated = [...departmentMappings];
    updated[index] = { ...updated[index], [field]: value };
    setDepartmentMappings(updated);
  };

  const saveDepartmentMappings = () => {
    try {
      // Validate mappings
      const invalid = departmentMappings.some(m => !m.department || m.groupIds.length === 0);
      if (invalid) {
        toast.error('Each department must have a name and at least one group');
        return;
      }

      localStorage.setItem('departmentMappings', JSON.stringify(departmentMappings));
      toast.success('Department mappings saved successfully');
    } catch (error) {
      console.error('Error saving department mappings:', error);
      toast.error('Failed to save department mappings');
    }
  };


  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (key) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: !prev[key] };
      localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
      return newPrefs;
    });
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      // Validate inputs
      if (!config.clientId || !config.tenantId) {
        toast.error('Client ID and Tenant ID are required');
        return;
      }

      // Save to localStorage
      localStorage.setItem('azureConfig', JSON.stringify(config));
      
      // Remove demo mode if setting real credentials
      if (config.clientId && config.tenantId) {
        localStorage.removeItem('demoMode');
        localStorage.removeItem('demoUser');
      }

      toast.success('Configuration saved! Please sign out and sign in again for changes to take effect.');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfig = () => {
    if (window.confirm('Are you sure you want to clear all Azure AD configuration? This will sign you out.')) {
      localStorage.removeItem('azureConfig');
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      toast.success('Configuration cleared');
      setTimeout(() => {
        logout();
        navigate('/configure');
      }, 1000);
    }
  };

  const handleToggleDemoMode = () => {
    if (isDemo) {
      // Disable demo mode
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      toast.success('Demo mode disabled. Please configure Azure AD or sign in.');
      setTimeout(() => {
        logout();
        navigate('/configure');
      }, 1000);
    } else {
      // Enable demo mode
      localStorage.setItem('demoMode', 'true');
      toast.success('Demo mode enabled. Please sign out and try demo to use it.');
      setIsDemo(true);
    }
  };

  const tabs = [
    { id: 'azure', name: 'Azure AD', icon: KeyIcon },
    { id: 'departments', name: 'Department Mappings', icon: UserGroupIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure application settings and preferences
        </p>
      </div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-l-4 border-purple-500 p-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Demo Mode Active</p>
                <p className="text-sm text-purple-700 dark:text-purple-400">You're using the app with mock data. Configure Azure AD for production use.</p>
              </div>
            </div>
            <button
              onClick={handleToggleDemoMode}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              Disable Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Azure AD Configuration Tab */}
        {activeTab === 'azure' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Azure AD Configuration</h3>
                    <p className="text-sm text-gray-600">Manage your Microsoft Azure Active Directory credentials</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.clientId && config.tenantId ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircleIcon className="h-5 w-5" />
                      Configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-yellow-600">
                      <XCircleIcon className="h-5 w-5" />
                      Not Configured
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body space-y-6">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID (Application ID)
                </label>
                <input
                  type="text"
                  id="clientId"
                  name="clientId"
                  value={config.clientId}
                  onChange={handleConfigChange}
                  className="input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Found in Azure Portal → App Registrations → Your App → Overview
                </p>
              </div>

              <div>
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant ID (Directory ID)
                </label>
                <input
                  type="text"
                  id="tenantId"
                  name="tenantId"
                  value={config.tenantId}
                  onChange={handleConfigChange}
                  className="input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Found in Azure Portal → Azure Active Directory → Overview
                </p>
              </div>

              <div>
                <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    id="clientSecret"
                    name="clientSecret"
                    value={config.clientSecret}
                    onChange={handleConfigChange}
                    className="input pr-20"
                    placeholder="Enter client secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    {showSecrets ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Required for certain admin operations. Create in Azure Portal → App Registrations → Certificates & secrets
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleClearConfig}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                  Clear Configuration
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <CogIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">User Preferences</h3>
                  <p className="text-sm text-gray-600">Customize your experience</p>
                </div>
              </div>
            </div>
            <div className="card-body space-y-4">
              {/* Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BellIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Notifications</p>
                    <p className="text-sm text-gray-600">Enable toast notifications for actions</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreferenceChange('notifications')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${preferences.notifications ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.notifications ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Auto Refresh */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowPathIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Auto Refresh</p>
                    <p className="text-sm text-gray-600">Automatically refresh data on dashboard</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreferenceChange('autoRefresh')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${preferences.autoRefresh ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.autoRefresh ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Compact View */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Compact View</p>
                    <p className="text-sm text-gray-600">Show more items in lists and tables</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreferenceChange('compactView')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${preferences.compactView ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${preferences.compactView ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Department Mappings Tab */}
        {activeTab === 'departments' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Department to Group Mappings</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Map departments to Azure AD groups for automatic assignment during onboarding
                    </p>
                  </div>
                </div>
                <button
                  onClick={addDepartmentMapping}
                  className="btn-secondary flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Mapping
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading groups...</p>
                  </div>
                </div>
              ) : departmentMappings.length === 0 ? (
                <div className="text-center py-12">
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No department mappings</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a department to group mapping
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={addDepartmentMapping}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add First Mapping
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentMappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Department Name Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Department Name
                            </label>
                            <input
                              type="text"
                              value={mapping.department}
                              onChange={(e) => updateDepartmentMapping(index, 'department', e.target.value)}
                              placeholder="e.g., Engineering, Marketing, Sales"
                              className="input"
                            />
                          </div>

                          {/* Group Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Assigned Groups ({mapping.groupIds.length} selected)
                            </label>
                            <select
                              multiple
                              value={mapping.groupIds}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                updateDepartmentMapping(index, 'groupIds', selected);
                              }}
                              className="input min-h-[150px]"
                            >
                              {availableGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                  {group.displayName}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Hold Ctrl/Cmd to select multiple groups
                            </p>
                          </div>

                          {/* Selected Groups Display */}
                          {mapping.groupIds.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Groups:</p>
                              <div className="flex flex-wrap gap-2">
                                {mapping.groupIds.map(groupId => {
                                  const group = availableGroups.find(g => g.id === groupId);
                                  return group ? (
                                    <span
                                      key={groupId}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    >
                                      <UserGroupIcon className="h-3 w-3" />
                                      {group.displayName}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeDepartmentMapping(index)}
                          className="flex-shrink-0 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove mapping"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Button */}
              {departmentMappings.length > 0 && !isLoadingGroups && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Users will be automatically added to these groups during onboarding based on their department
                  </p>
                  <button
                    onClick={saveDepartmentMappings}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    Save Mappings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  <p className="text-sm text-gray-600">Manage security and authentication options</p>
                </div>
              </div>
            </div>
            <div className="card-body space-y-6">
              {/* Current User Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Current User</p>
                <p className="text-sm text-blue-700">{user?.displayName || user?.name || 'Demo User'}</p>
                <p className="text-xs text-blue-600 mt-1">{user?.mail || user?.userPrincipalName || 'demo@example.com'}</p>
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Demo Mode</p>
                    <p className="text-sm text-gray-600">Use the app with mock data (no Azure AD required)</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleDemoMode}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isDemo ? 'bg-purple-600' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isDemo ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Sign Out */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;