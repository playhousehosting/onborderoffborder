import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  TagIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { purviewService } from '../../services/purviewService';

const PurviewManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('labels');
  const [loading, setLoading] = useState(false);
  
  // Sensitivity Labels State
  const [sensitivityLabels, setSensitivityLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [labelSearch, setLabelSearch] = useState('');
  const [showInactiveLabels, setShowInactiveLabels] = useState(false);
  
  // DLP Alerts State
  const [dlpAlerts, setDlpAlerts] = useState([]);
  const [alertSearch, setAlertSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Policy Settings State
  const [policySettings, setPolicySettings] = useState(null);

  useEffect(() => {
    if (activeTab === 'labels') {
      loadSensitivityLabels();
    } else if (activeTab === 'alerts') {
      loadDLPAlerts();
    } else if (activeTab === 'policy') {
      loadPolicySettings();
    }
  }, [activeTab]);

  const loadSensitivityLabels = async () => {
    setLoading(true);
    try {
      const labels = await purviewService.getSensitivityLabels();
      setSensitivityLabels(labels);
      
      // Show info if no labels found
      if (labels.length === 0) {
        toast('No sensitivity labels found. This may indicate Purview is not configured.', {
          icon: 'ℹ️',
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error('Failed to load sensitivity labels');
      logger.error('Error loading sensitivity labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDLPAlerts = async () => {
    setLoading(true);
    try {
      const alerts = await purviewService.getDLPAlerts();
      setDlpAlerts(alerts);
    } catch (error) {
      toast.error('Failed to load DLP alerts');
      logger.error('Error loading DLP alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPolicySettings = async () => {
    setLoading(true);
    try {
      const settings = await purviewService.getInformationProtectionPolicy();
      setPolicySettings(settings);
    } catch (error) {
      toast.error('Failed to load policy settings');
      logger.error('Error loading policy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter sensitivity labels
  const filteredLabels = sensitivityLabels.filter(label => {
    const matchesSearch = label.name?.toLowerCase().includes(labelSearch.toLowerCase()) ||
                         label.description?.toLowerCase().includes(labelSearch.toLowerCase());
    const matchesActive = showInactiveLabels || label.isActive;
    return matchesSearch && matchesActive;
  });

  // Filter DLP alerts
  const filteredAlerts = dlpAlerts.filter(alert => {
    const matchesSearch = alert.title?.toLowerCase().includes(alertSearch.toLowerCase()) ||
                         alert.description?.toLowerCase().includes(alertSearch.toLowerCase()) ||
                         alert.userPrincipalName?.toLowerCase().includes(alertSearch.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'inProgress': return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'resolved': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'dismissed': return <XCircleIcon className="w-5 h-5 text-gray-500" />;
      default: return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Microsoft Purview Compliance</h1>
        </div>
        <p className="text-gray-600">
          Manage sensitivity labels, monitor DLP policies, and ensure data protection compliance
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('labels')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'labels'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              <span>Sensitivity Labels</span>
              {sensitivityLabels.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {sensitivityLabels.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'alerts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>DLP Alerts</span>
              {dlpAlerts.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {dlpAlerts.filter(a => a.status === 'new').length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'policy'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5" />
              <span>Policy Settings</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'labels' && (
        <div>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search labels by name or description..."
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showInactiveLabels}
                onChange={(e) => setShowInactiveLabels(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show inactive labels</span>
            </label>
          </div>

          {/* Labels Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading sensitivity labels...</p>
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No sensitivity labels found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLabels.map((label) => (
                <div
                  key={label.id}
                  onClick={() => setSelectedLabel(label)}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                  style={{ borderLeftWidth: '4px', borderLeftColor: label.color }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{label.name}</h3>
                      {label.parent && (
                        <p className="text-xs text-gray-500 mt-1">Parent: {label.parent.name}</p>
                      )}
                    </div>
                    {!label.isActive && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{label.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {label.hasProtection && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        <ShieldCheckIcon className="w-3 h-3" />
                        Protected
                      </span>
                    )}
                    {label.isAppliable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        <CheckCircleIcon className="w-3 h-3" />
                        Applicable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">
                        Parent Label
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      Sensitivity: {label.sensitivity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div>
          {/* Alert Filters */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="inProgress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading DLP alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">No DLP alerts found</p>
              <p className="text-sm text-gray-500 mt-1">All policies are in compliance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(alert.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>Policy: {alert.policyName}</span>
                          <span>User: {alert.userPrincipalName}</span>
                          <span>Items: {alert.affectedItems}</span>
                          <span>{formatDate(alert.createdDateTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'policy' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading policy settings...</p>
            </div>
          ) : policySettings ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Information Protection Policy</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Mandatory Labeling</p>
                    <p className="text-sm text-gray-600">Require users to label documents and emails</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    policySettings.isMandatory 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policySettings.isMandatory ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Downgrade Justification</p>
                    <p className="text-sm text-gray-600">Require justification when lowering label sensitivity</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    policySettings.isDowngradeJustificationRequired 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {policySettings.isDowngradeJustificationRequired ? 'Required' : 'Optional'}
                  </span>
                </div>

                {policySettings.defaultLabelId && (
                  <div className="py-3 border-b border-gray-200">
                    <p className="font-medium text-gray-900 mb-1">Default Label</p>
                    <p className="text-sm text-gray-600">
                      Label ID: {policySettings.defaultLabelId}
                    </p>
                  </div>
                )}

                {policySettings.moreInfoUrl && (
                  <div className="py-3">
                    <p className="font-medium text-gray-900 mb-1">More Information</p>
                    <a 
                      href={policySettings.moreInfoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      {policySettings.moreInfoUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No policy settings available</p>
            </div>
          )}
        </div>
      )}

      {/* Label Detail Modal */}
      {selectedLabel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedLabel.color }}
                  ></div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedLabel.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedLabel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-gray-600">{selectedLabel.description}</p>
                </div>

                {selectedLabel.tooltip && selectedLabel.tooltip !== selectedLabel.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Tooltip</p>
                    <p className="text-gray-600">{selectedLabel.tooltip}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Sensitivity Level</p>
                    <p className="text-gray-600">{selectedLabel.sensitivity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                    <p className="text-gray-600">{selectedLabel.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Properties</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLabel.isAppliable && (
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                        Applicable to content
                      </span>
                    )}
                    {selectedLabel.hasProtection && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                        Has protection
                      </span>
                    )}
                  </div>
                </div>

                {selectedLabel.contentFormats && selectedLabel.contentFormats.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Supported Formats</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLabel.contentFormats.map((format, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLabel.parent && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Parent Label</p>
                    <p className="text-gray-600">{selectedLabel.parent.name}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLabel(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurviewManagement;
