import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import { getActiveService, getAuthMode } from '../../services/serviceFactory';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const CreateGroup = () => {
  const navigate = useNavigate();
  const { groupId } = useParams(); // Get groupId if editing
  const isEditMode = !!groupId;
  
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  // Use serviceFactory to get the correct service based on auth mode
  const authMode = getAuthMode();
  const service = getActiveService();
  
  // Determine which auth is active based on serviceFactory mode
  const isConvexAuth = authMode === 'convex';
  const isMSALAuth = authMode === 'msal';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [loadingGroup, setLoadingGroup] = useState(isEditMode);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    mailNickname: '',
    selectedDomain: '',
    groupType: 'distribution', // distribution, security, microsoft365
    mailEnabled: true,
    securityEnabled: false,
  });

  // Load existing group data when editing
  useEffect(() => {
    const loadGroupData = async () => {
      if (!isEditMode || !service) return;
      
      setLoadingGroup(true);
      try {
        const group = await service.getGroup(groupId);
        
        // Determine group type based on properties
        let groupType = 'security';
        if (group.groupTypes?.includes('Unified')) {
          groupType = 'microsoft365';
        } else if (group.mailEnabled && !group.securityEnabled) {
          groupType = 'distribution';
        }

        // Extract domain from mail address if available
        let selectedDomain = '';
        if (group.mail) {
          const parts = group.mail.split('@');
          if (parts.length === 2) {
            selectedDomain = parts[1];
          }
        }

        setFormData({
          displayName: group.displayName || '',
          description: group.description || '',
          mailNickname: group.mailNickname || '',
          selectedDomain: selectedDomain,
          groupType: groupType,
          mailEnabled: group.mailEnabled || false,
          securityEnabled: group.securityEnabled || false,
        });
      } catch (error) {
        console.error('Error loading group:', error);
        toast.error('Failed to load group details');
        navigate('/groups');
      } finally {
        setLoadingGroup(false);
      }
    };

    const isAuthReady = (isMSALAuth && msalAuth?.isAuthenticated) || (isConvexAuth && convexAuth?.isAuthenticated);
    if (isAuthReady && isEditMode) {
      loadGroupData();
    }
  }, [isEditMode, groupId, isMSALAuth, isConvexAuth, msalAuth?.isAuthenticated, convexAuth?.isAuthenticated, service, navigate]);

  // Load available domains on mount
  useEffect(() => {
    const loadDomains = async () => {
      try {
        const domains = await service.getOrganizationDomains();
        setAvailableDomains(domains);
        // Set default domain only if not in edit mode (edit mode sets it from group data)
        if (!isEditMode) {
          const defaultDomain = domains.find(d => d.isDefault) || domains[0];
          if (defaultDomain) {
            setFormData(prev => ({ ...prev, selectedDomain: defaultDomain.name }));
          }
        }
      } catch (error) {
        console.error('Error loading domains:', error);
        toast.error('Failed to load available domains');
      } finally {
        setLoadingDomains(false);
      }
    };

    // Check if auth is ready (either MSAL or Convex)
    const isAuthReady = (isMSALAuth && msalAuth?.isAuthenticated) || (isConvexAuth && convexAuth?.isAuthenticated);
    if (isAuthReady && service) {
      loadDomains();
    }
  }, [isMSALAuth, isConvexAuth, msalAuth?.isAuthenticated, convexAuth?.isAuthenticated, service, isEditMode]);

  const groupTypes = [
    {
      value: 'distribution',
      label: 'Distribution List',
      icon: EnvelopeIcon,
      description: 'Email distribution group for sending messages to multiple recipients',
      mailEnabled: true,
      securityEnabled: false,
      groupTypes: [],
    },
    {
      value: 'security',
      label: 'Security Group',
      icon: ShieldCheckIcon,
      description: 'Security group for managing access to resources',
      mailEnabled: false,
      securityEnabled: true,
      groupTypes: [],
    },
    {
      value: 'microsoft365',
      label: 'Microsoft 365 Group',
      icon: SparklesIcon,
      description: 'Collaborative group with shared resources (mailbox, calendar, files)',
      mailEnabled: true,
      securityEnabled: false,
      groupTypes: ['Unified'],
    },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGroupTypeChange = (typeValue) => {
    const selectedType = groupTypes.find(t => t.value === typeValue);
    if (selectedType) {
      setFormData(prev => ({
        ...prev,
        groupType: typeValue,
        mailEnabled: selectedType.mailEnabled,
        securityEnabled: selectedType.securityEnabled,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.displayName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!formData.mailNickname.trim()) {
      toast.error('Please enter an email alias');
      return;
    }

    // Validate email alias format
    const emailAliasRegex = /^[a-z0-9-]+$/;
    if (!emailAliasRegex.test(formData.mailNickname)) {
      toast.error('Email alias can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    if (!formData.selectedDomain) {
      toast.error('Please select a domain');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedType = groupTypes.find(t => t.value === formData.groupType);
      
      if (isEditMode) {
        // Update existing group - only update allowed fields
        const updateData = {
          displayName: formData.displayName,
          description: formData.description,
        };

        await service.updateGroup(groupId, updateData);
        toast.success('Group updated successfully');
        navigate(`/groups/${groupId}`);
      } else {
        // Create new group
        const groupData = {
          displayName: formData.displayName,
          description: formData.description,
          mailNickname: formData.mailNickname,
          mailEnabled: selectedType.mailEnabled,
          securityEnabled: selectedType.securityEnabled,
        };

        // Add groupTypes for Microsoft 365 groups
        if (selectedType.groupTypes.length > 0) {
          groupData.groupTypes = selectedType.groupTypes;
        }

        const newGroup = await service.createGroup(groupData);
        const fullEmail = `${formData.mailNickname}@${formData.selectedDomain}`;
        toast.success(`Group created successfully: ${fullEmail}`);
        navigate(`/groups/${newGroup.id}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} group:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} group: ` + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state when loading group data in edit mode
  if (loadingGroup) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/groups')}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Groups
          </button>
        </div>
        <div className="card">
          <div className="card-body flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading group details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(isEditMode ? `/groups/${groupId}` : '/groups')}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          {isEditMode ? 'Back to Group' : 'Back to Groups'}
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Group' : 'Create New Group'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isEditMode 
                ? 'Update the group display name and description'
                : 'Create a distribution list, security group, or Microsoft 365 group'
              }
            </p>
          </div>

          <div className="card-body space-y-6">
            {/* Group Type Selection - disabled in edit mode */}
            <div>
              <label className="form-label">Group Type {!isEditMode && '*'}</label>
              {isEditMode && (
                <p className="text-xs text-amber-600 mb-2">Group type cannot be changed after creation</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {groupTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => !isEditMode && handleGroupTypeChange(type.value)}
                      disabled={isEditMode}
                      className={`
                        p-4 border-2 rounded-lg text-left transition-all
                        ${isEditMode ? 'cursor-not-allowed opacity-60' : ''}
                        ${formData.groupType === type.value
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-8 w-8 ${
                          formData.groupType === type.value ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            formData.groupType === type.value ? 'text-primary-900' : 'text-gray-900'
                          }`}>
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="form-label">
                Group Name *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g., Marketing Team"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                The display name for the group as it appears in the global address list
              </p>
            </div>

            {/* Mail Nickname / Alias - disabled in edit mode */}
            <div>
              <label className="form-label">
                Email Address {!isEditMode && '*'}
              </label>
              {isEditMode && (
                <p className="text-xs text-amber-600 mb-2">Email address cannot be changed after creation</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    required={!isEditMode}
                    disabled={isEditMode}
                    className={`form-input ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="e.g., marketing-team"
                    value={formData.mailNickname}
                    onChange={(e) => handleInputChange('mailNickname', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email alias (lowercase, numbers, hyphens only)
                  </p>
                </div>
                <div>
                  <select
                    required={!isEditMode}
                    disabled={isEditMode || loadingDomains}
                    className={`form-input ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    value={formData.selectedDomain}
                    onChange={(e) => handleInputChange('selectedDomain', e.target.value)}
                  >
                    {loadingDomains ? (
                      <option>Loading domains...</option>
                    ) : availableDomains.length === 0 ? (
                      <option>No domains available</option>
                    ) : (
                      availableDomains.map((domain) => (
                        <option key={domain.id} value={domain.name}>
                          @{domain.name} {domain.isDefault ? '(Default)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Domain for email address
                  </p>
                </div>
              </div>
              {formData.mailNickname && formData.selectedDomain && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Full email address: <span className="font-mono">{formData.mailNickname}@{formData.selectedDomain}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label">
                Description
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Describe the purpose of this group..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional description to help users understand the group's purpose
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">Important Information:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Distribution lists are used for sending emails to multiple recipients</li>
                    <li>Security groups control access to resources and applications</li>
                    <li>Microsoft 365 groups include shared mailbox, calendar, files, and more</li>
                    <li>You can add members and owners after creating the group</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="card-footer flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(isEditMode ? `/groups/${groupId}` : '/groups')}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  {isEditMode ? 'Save Changes' : 'Create Group'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateGroup;