import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlayIcon, 
  PauseIcon, 
  TrashIcon, 
  PlusIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import lifecycleWorkflowsService, { WORKFLOW_CATEGORIES } from '../../services/lifecycleWorkflowsService';
import graphService from '../../services/graphService';
import { 
  getDepartmentMappings, 
  saveDepartmentMappings 
} from '../../utils/departmentMappings';

const WorkflowManagement = () => {
  const { t } = useTranslation();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' or 'mappings'
  
  // Workflow states
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  
  // Department Mappings states
  const [departmentMappings, setDepartmentMappings] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
    if (activeTab === 'mappings') {
      loadDepartmentMappings();
      loadGroups();
    }
  }, [activeTab]);
  
  // Load department mappings from localStorage
  const loadDepartmentMappings = () => {
    const mappings = getDepartmentMappings();
    setDepartmentMappings(mappings);
  };
  
  // Load Azure AD groups
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const groups = await graphService.getGroups();
      setAvailableGroups(Array.isArray(groups) ? groups : []);
    } catch (error) {
      console.error('Error loading groups:', error);
      setAvailableGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lifecycleWorkflowsService.listWorkflows();
      setWorkflows(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await lifecycleWorkflowsService.deleteWorkflow(workflowId);
      await loadWorkflows();
    } catch (err) {
      setError(`Failed to delete workflow: ${err.message}`);
    }
  };

  const handleToggleWorkflow = async (workflowId, currentStatus) => {
    try {
      await lifecycleWorkflowsService.updateWorkflow(workflowId, {
        isEnabled: !currentStatus
      });
      await loadWorkflows();
    } catch (err) {
      setError(`Failed to toggle workflow: ${err.message}`);
    }
  };
  
  // Department Mapping Functions
  const addDepartmentMapping = () => {
    setDepartmentMappings([...departmentMappings, { department: '', groupIds: [] }]);
  };
  
  const updateDepartmentMapping = (index, field, value) => {
    const updated = [...departmentMappings];
    updated[index] = { ...updated[index], [field]: value };
    setDepartmentMappings(updated);
  };
  
  const removeDepartmentMapping = (index) => {
    const updated = departmentMappings.filter((_, i) => i !== index);
    setDepartmentMappings(updated);
    saveDepartmentMappings(updated);
  };
  
  const saveMappings = () => {
    saveDepartmentMappings(departmentMappings);
    alert('Department mappings saved successfully!');
  };

  const handleViewExecutionHistory = async (workflow) => {
    try {
      setSelectedWorkflow(workflow);
      const history = await lifecycleWorkflowsService.getWorkflowExecutions(workflow.id);
      setExecutionHistory(history);
      setShowExecutionHistory(true);
    } catch (err) {
      setError(`Failed to load execution history: ${err.message}`);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    if (selectedCategory === 'all') return true;
    return workflow.category === selectedCategory;
  });

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case WORKFLOW_CATEGORIES.JOINER:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case WORKFLOW_CATEGORIES.MOVER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case WORKFLOW_CATEGORIES.LEAVER:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Workflow Automation
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage lifecycle workflows and department mappings
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              {activeTab === 'workflows' ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Workflow
                </button>
              ) : (
                <button
                  onClick={addDepartmentMapping}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Mapping
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`${
                activeTab === 'workflows'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <Cog6ToothIcon className="h-5 w-5" />
              Lifecycle Workflows
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`${
                activeTab === 'mappings'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
            >
              <BuildingOfficeIcon className="h-5 w-5" />
              Department Mappings
            </button>
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400 dark:text-red-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Tab Content */}
      {activeTab === 'workflows' && (
        <>
          {/* Category Filters */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setSelectedCategory(WORKFLOW_CATEGORIES.JOINER)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === WORKFLOW_CATEGORIES.JOINER
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Onboarding ({workflows.filter(w => w.category === WORKFLOW_CATEGORIES.JOINER).length})
          </button>
          <button
            onClick={() => setSelectedCategory(WORKFLOW_CATEGORIES.MOVER)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === WORKFLOW_CATEGORIES.MOVER
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Transfers ({workflows.filter(w => w.category === WORKFLOW_CATEGORIES.MOVER).length})
          </button>
          <button
            onClick={() => setSelectedCategory(WORKFLOW_CATEGORIES.LEAVER)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === WORKFLOW_CATEGORIES.LEAVER
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Offboarding ({workflows.filter(w => w.category === WORKFLOW_CATEGORIES.LEAVER).length})
          </button>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No workflows</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new workflow.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredWorkflows.map((workflow) => (
              <div key={workflow.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {workflow.displayName}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(workflow.category)}`}>
                        {workflow.category}
                      </span>
                      {workflow.isEnabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <PlayIcon className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                          <PauseIcon className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {workflow.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {workflow.tasks?.length || 0} tasks
                      </span>
                      {workflow.isSchedulingEnabled && (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Automated
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleViewExecutionHistory(workflow)}
                      className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="View execution history"
                    >
                      <ChartBarIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleToggleWorkflow(workflow.id, workflow.isEnabled)}
                      className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title={workflow.isEnabled ? 'Pause workflow' : 'Activate workflow'}
                    >
                      {workflow.isEnabled ? (
                        <PauseIcon className="h-5 w-5" />
                      ) : (
                        <PlayIcon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete workflow"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Tasks List */}
                {workflow.tasks && workflow.tasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workflow Tasks:</h4>
                    <div className="space-y-2">
                      {workflow.tasks.map((task, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-medium">
                            {task.executionSequence || index + 1}
                          </span>
                          <span className="ml-3 text-gray-600 dark:text-gray-400">{task.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* Department Mappings Tab Content */}
      {activeTab === 'mappings' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
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
                {Array.isArray(departmentMappings) && departmentMappings.map((mapping, index) => (
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
                            {Array.isArray(availableGroups) && availableGroups.map(group => (
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
                        {mapping.groupIds && Array.isArray(mapping.groupIds) && mapping.groupIds.length > 0 && (
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
                  onClick={saveMappings}
                  className="btn-primary"
                >
                  Save Mappings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Workflow Modal - Placeholder */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadWorkflows();
          }}
        />
      )}

      {/* Execution History Modal - Placeholder */}
      {showExecutionHistory && selectedWorkflow && (
        <ExecutionHistoryModal
          workflow={selectedWorkflow}
          history={executionHistory}
          onClose={() => {
            setShowExecutionHistory(false);
            setSelectedWorkflow(null);
            setExecutionHistory([]);
          }}
        />
      )}
    </div>
  );
};

// Create Workflow Modal Component
const CreateWorkflowModal = ({ onClose, onSuccess }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [offsetDays, setOffsetDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const templates = lifecycleWorkflowsService.getWorkflowTemplates();

  const handleCreate = async () => {
    if (!selectedTemplate || !workflowName) {
      setError('Please select a template and enter a workflow name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config = {
        displayName: workflowName,
        description: workflowDescription,
        department: department || null,
        offsetInDays: offsetDays
      };

      switch (selectedTemplate.category) {
        case WORKFLOW_CATEGORIES.JOINER:
          await lifecycleWorkflowsService.createJoinerWorkflow(config);
          break;
        case WORKFLOW_CATEGORIES.MOVER:
          await lifecycleWorkflowsService.createMoverWorkflow(config);
          break;
        case WORKFLOW_CATEGORIES.LEAVER:
          await lifecycleWorkflowsService.createLeaverWorkflow(config);
          break;
        default:
          throw new Error('Invalid workflow category');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Create New Workflow</h2>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Template Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:bg-gray-700/50'
                  }`}
                >
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., Marketing Team Onboarding"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Describe the purpose of this workflow..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department (Optional)
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Leave empty for all departments"
              />
            </div>

            {selectedTemplate?.category !== WORKFLOW_CATEGORIES.MOVER && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Offset Days
                </label>
                <input
                  type="number"
                  value={offsetDays}
                  onChange={(e) => setOffsetDays(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate?.category === WORKFLOW_CATEGORIES.JOINER
                    ? 'Negative values run before hire date'
                    : 'Positive values run after leave date'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !selectedTemplate || !workflowName}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Execution History Modal Component
const ExecutionHistoryModal = ({ workflow, history, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Execution History: {workflow.displayName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No execution history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Run ID: {run.id}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Started: {new Date(run.startedDateTime).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        run.processingStatus === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : run.processingStatus === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {run.processingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowManagement;
