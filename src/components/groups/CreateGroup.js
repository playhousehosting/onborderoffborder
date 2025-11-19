import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import msalGraphService from '../../services/msalGraphService';
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
  const { getAccessToken } = useAuth();

  useEffect(() => {
    if (getAccessToken) {
      msalGraphService.setGetTokenFunction(getAccessToken);
    }
  }, [getAccessToken]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    mailNickname: '',
    groupType: 'distribution', // distribution, security, microsoft365
    mailEnabled: true,
    securityEnabled: false,
  });

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

    if (!formData.displayName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!formData.mailNickname.trim()) {
      toast.error('Please enter an email alias');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedType = groupTypes.find(t => t.value === formData.groupType);
      
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

      const newGroup = await msalGraphService.createGroup(groupData);
      toast.success('Group created successfully');
      navigate(`/groups/${newGroup.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/groups')}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Groups
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold text-gray-900">Create New Group</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a distribution list, security group, or Microsoft 365 group
            </p>
          </div>

          <div className="card-body space-y-6">
            {/* Group Type Selection */}
            <div>
              <label className="form-label">Group Type *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {groupTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleGroupTypeChange(type.value)}
                      className={`
                        p-4 border-2 rounded-lg text-left transition-all
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

            {/* Mail Nickname / Alias */}
            <div>
              <label className="form-label">
                Email Alias *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g., marketing-team"
                  value={formData.mailNickname}
                  onChange={(e) => handleInputChange('mailNickname', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
                <span className="text-gray-600">@yourdomain.com</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Only lowercase letters, numbers, and hyphens allowed. No spaces or special characters.
              </p>
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
              onClick={() => navigate('/groups')}
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
                  Creating...
                </>
              ) : (
                <>
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Create Group
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
