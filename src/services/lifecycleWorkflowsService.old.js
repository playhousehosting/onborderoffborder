import { graphService } from './graphService';

/**
 * Lifecycle Workflows Service
 * Provides enterprise automation for Joiner-Mover-Leaver employee scenarios
 * Uses Microsoft Graph Identity Governance APIs
 */

// Task Definition IDs from Microsoft Graph
export const TASK_DEFINITIONS = {
  // Leaver (Offboarding) Tasks
  REMOVE_FROM_ALL_GROUPS: 'b3a31406-2a15-4c9a-b25b-a658fa5f07fc',
  REMOVE_FROM_ALL_TEAMS: '81f7b200-2816-4b3b-8c5d-dc556f07b024',
  DELETE_USER_ACCOUNT: '8d18588d-9ad3-4c0f-99d0-ec215f0e3dff',
  REMOVE_ALL_LICENSES: '8fa97d28-3e52-4985-b3a9-a1126f9b8b4e',
  
  // Joiner (Onboarding) Tasks
  GENERATE_TAP_SEND_EMAIL: '1b555e50-7f65-41d5-b514-5894a026d10d',
  REQUEST_ACCESS_PACKAGE: 'c1ec1e76-f374-4375-aaa6-0bb6bd4c60be',
  
  // Mover (Transfer) Tasks
  SEND_EMAIL_TO_MANAGER: 'aab41899-9972-422a-9d97-f626014578b7',
};

// Workflow Categories
export const WORKFLOW_CATEGORIES = {
  JOINER: 'joiner',
  MOVER: 'mover',
  LEAVER: 'leaver',
};

// Workflow Trigger Types
export const TRIGGER_TYPES = {
  TIME_BASED: 'timeBasedAttributeTrigger',
  ON_DEMAND: 'onDemand',
};

/**
 * List all lifecycle workflows
 */
export const listWorkflows = async () => {
  try {
    const response = await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      'GET'
    );
    return response.value || [];
  } catch (error) {
    console.error('Error listing workflows:', error);
    throw new Error(`Failed to list workflows: ${error.message}`);
  }
};

/**
 * Get a specific workflow by ID
 */
export const getWorkflow = async (workflowId) => {
  try {
    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}`,
      'GET'
    );
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw new Error(`Failed to get workflow: ${error.message}`);
  }
};

/**
 * Create a Joiner (Onboarding) workflow
 * Automates new employee onboarding with TAP generation and group assignments
 */
export const createJoinerWorkflow = async ({
  displayName,
  description,
  department = null,
  isEnabled = true,
  isSchedulingEnabled = true,
  offsetInDays = -7, // Run 7 days before hire date
  tasks = []
}) => {
  try {
    // Default joiner tasks if none provided
    const defaultTasks = [
      {
        taskDefinitionId: TASK_DEFINITIONS.GENERATE_TAP_SEND_EMAIL,
        displayName: 'Generate Temporary Access Pass and send email to manager',
        description: 'Generate TAP for new employee and notify their manager',
        executionSequence: 1,
        isEnabled: true,
        arguments: []
      },
      {
        taskDefinitionId: TASK_DEFINITIONS.REQUEST_ACCESS_PACKAGE,
        displayName: 'Request user access package assignment',
        description: 'Automatically request standard access packages for new employee',
        executionSequence: 2,
        isEnabled: true,
        arguments: []
      }
    ];

    const workflowTasks = tasks.length > 0 ? tasks : defaultTasks;

    const workflow = {
      category: WORKFLOW_CATEGORIES.JOINER,
      displayName: displayName || 'Pre-hire Employee Onboarding',
      description: description || 'Automate onboarding tasks before employee hire date',
      isEnabled,
      isSchedulingEnabled,
      executionConditions: {
        '@odata.type': '#microsoft.graph.identityGovernance.triggerAndScopeBasedConditions',
        scope: {
          '@odata.type': '#microsoft.graph.identityGovernance.ruleBasedSubjectSet',
          rule: department ? `department eq '${department}'` : 'employeeHireDate ne null'
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.timeBasedAttributeTrigger',
          timeBasedAttribute: 'employeeHireDate',
          offsetInDays
        }
      },
      tasks: workflowTasks
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      'POST',
      workflow
    );
  } catch (error) {
    console.error('Error creating joiner workflow:', error);
    throw new Error(`Failed to create joiner workflow: ${error.message}`);
  }
};

/**
 * Create a Mover (Transfer) workflow
 * Automates employee transfers between departments
 */
export const createMoverWorkflow = async ({
  displayName,
  description,
  targetDepartment = null,
  isEnabled = true,
  isSchedulingEnabled = false,
  tasks = []
}) => {
  try {
    // Default mover tasks if none provided
    const defaultTasks = [
      {
        taskDefinitionId: TASK_DEFINITIONS.SEND_EMAIL_TO_MANAGER,
        displayName: 'Send email to notify manager of the move',
        description: 'Automatically notify manager about employee transfer',
        executionSequence: 1,
        isEnabled: true,
        arguments: []
      }
    ];

    const workflowTasks = tasks.length > 0 ? tasks : defaultTasks;

    const workflow = {
      category: WORKFLOW_CATEGORIES.MOVER,
      displayName: displayName || 'Employee Department Transfer',
      description: description || 'Automate tasks when employee changes departments',
      isEnabled,
      isSchedulingEnabled,
      executionConditions: {
        '@odata.type': '#microsoft.graph.identityGovernance.triggerAndScopeBasedConditions',
        scope: {
          '@odata.type': '#microsoft.graph.identityGovernance.ruleBasedSubjectSet',
          rule: targetDepartment 
            ? `department eq '${targetDepartment}'` 
            : 'department ne null'
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.attributeChangeTrigger',
          triggerAttributes: [
            {
              name: 'department'
            }
          ]
        }
      },
      tasks: workflowTasks
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      'POST',
      workflow
    );
  } catch (error) {
    console.error('Error creating mover workflow:', error);
    throw new Error(`Failed to create mover workflow: ${error.message}`);
  }
};

/**
 * Create a Leaver (Offboarding) workflow
 * Automates employee offboarding with group removal, license removal, and account deletion
 */
export const createLeaverWorkflow = async ({
  displayName,
  description,
  department = null,
  isEnabled = true,
  isSchedulingEnabled = true,
  offsetInDays = 7, // Run 7 days after leave date
  includeAccountDeletion = false,
  tasks = []
}) => {
  try {
    // Default leaver tasks if none provided
    const defaultTasks = [
      {
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        displayName: 'Remove all licenses for user',
        description: 'Remove all Microsoft 365 licenses from departing employee',
        executionSequence: 1,
        isEnabled: true,
        arguments: []
      },
      {
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        displayName: 'Remove user from all Teams',
        description: 'Remove employee from all Microsoft Teams',
        executionSequence: 2,
        isEnabled: true,
        arguments: []
      },
      {
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        displayName: 'Remove user from all Azure AD groups',
        description: 'Remove all group memberships for departing employee',
        executionSequence: 3,
        isEnabled: true,
        arguments: []
      }
    ];

    // Optionally add account deletion task
    if (includeAccountDeletion) {
      defaultTasks.push({
        taskDefinitionId: TASK_DEFINITIONS.DELETE_USER_ACCOUNT,
        displayName: 'Delete user account',
        description: 'Permanently delete the user account',
        executionSequence: 4,
        isEnabled: true,
        arguments: []
      });
    }

    const workflowTasks = tasks.length > 0 ? tasks : defaultTasks;

    const workflow = {
      category: WORKFLOW_CATEGORIES.LEAVER,
      displayName: displayName || 'Post-Offboarding of an employee',
      description: description || 'Configure offboarding tasks for employees after their last day',
      isEnabled,
      isSchedulingEnabled,
      executionConditions: {
        '@odata.type': '#microsoft.graph.identityGovernance.triggerAndScopeBasedConditions',
        scope: {
          '@odata.type': '#microsoft.graph.identityGovernance.ruleBasedSubjectSet',
          rule: department 
            ? `department eq '${department}'` 
            : 'employeeLeaveDateTime ne null'
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.timeBasedAttributeTrigger',
          timeBasedAttribute: 'employeeLeaveDateTime',
          offsetInDays
        }
      },
      tasks: workflowTasks
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      'POST',
      workflow
    );
  } catch (error) {
    console.error('Error creating leaver workflow:', error);
    throw new Error(`Failed to create leaver workflow: ${error.message}`);
  }
};

/**
 * Update an existing workflow
 */
export const updateWorkflow = async (workflowId, updates) => {
  try {
    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}`,
      'PATCH',
      updates
    );
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw new Error(`Failed to update workflow: ${error.message}`);
  }
};

/**
 * Delete a workflow
 */
export const deleteWorkflow = async (workflowId) => {
  try {
    await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}`,
      'DELETE'
    );
    return { success: true, message: 'Workflow deleted successfully' };
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw new Error(`Failed to delete workflow: ${error.message}`);
  }
};

/**
 * Activate a workflow for a specific user (manual execution)
 */
export const activateWorkflowForUser = async (workflowId, userId) => {
  try {
    const payload = {
      subjects: [
        {
          id: userId
        }
      ]
    };

    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/activate`,
      'POST',
      payload
    );
  } catch (error) {
    console.error('Error activating workflow for user:', error);
    throw new Error(`Failed to activate workflow: ${error.message}`);
  }
};

/**
 * Get workflow execution history
 */
export const getWorkflowExecutions = async (workflowId) => {
  try {
    const response = await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs`,
      'GET'
    );
    return response.value || [];
  } catch (error) {
    console.error('Error getting workflow executions:', error);
    throw new Error(`Failed to get workflow executions: ${error.message}`);
  }
};

/**
 * Get detailed execution status for a specific run
 */
export const getWorkflowRunDetails = async (workflowId, runId) => {
  try {
    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs/${runId}`,
      'GET'
    );
  } catch (error) {
    console.error('Error getting workflow run details:', error);
    throw new Error(`Failed to get run details: ${error.message}`);
  }
};

/**
 * Get task processing results for a workflow run
 */
export const getWorkflowRunTaskResults = async (workflowId, runId) => {
  try {
    const response = await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs/${runId}/taskProcessingResults`,
      'GET'
    );
    return response.value || [];
  } catch (error) {
    console.error('Error getting task results:', error);
    throw new Error(`Failed to get task results: ${error.message}`);
  }
};

/**
 * List all available task definitions
 */
export const listTaskDefinitions = async () => {
  try {
    const response = await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/taskDefinitions',
      'GET'
    );
    return response.value || [];
  } catch (error) {
    console.error('Error listing task definitions:', error);
    throw new Error(`Failed to list task definitions: ${error.message}`);
  }
};

/**
 * Get workflow templates (predefined workflow configurations)
 */
export const getWorkflowTemplates = () => {
  return [
    {
      id: 'joiner-basic',
      name: 'Basic Onboarding',
      category: WORKFLOW_CATEGORIES.JOINER,
      description: 'Generate TAP and request access packages for new employees',
      tasks: [
        TASK_DEFINITIONS.GENERATE_TAP_SEND_EMAIL,
        TASK_DEFINITIONS.REQUEST_ACCESS_PACKAGE
      ]
    },
    {
      id: 'leaver-standard',
      name: 'Standard Offboarding',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Remove licenses, Teams memberships, and group memberships',
      tasks: [
        TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS
      ]
    },
    {
      id: 'leaver-complete',
      name: 'Complete Offboarding with Account Deletion',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Full offboarding including account deletion',
      tasks: [
        TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        TASK_DEFINITIONS.DELETE_USER_ACCOUNT
      ]
    },
    {
      id: 'mover-basic',
      name: 'Department Transfer',
      category: WORKFLOW_CATEGORIES.MOVER,
      description: 'Notify manager when employee changes departments',
      tasks: [
        TASK_DEFINITIONS.SEND_EMAIL_TO_MANAGER
      ]
    }
  ];
};

export default {
  // Core workflow operations
  listWorkflows,
  getWorkflow,
  createJoinerWorkflow,
  createMoverWorkflow,
  createLeaverWorkflow,
  updateWorkflow,
  deleteWorkflow,
  
  // Execution operations
  activateWorkflowForUser,
  getWorkflowExecutions,
  getWorkflowRunDetails,
  getWorkflowRunTaskResults,
  
  // Helper operations
  listTaskDefinitions,
  getWorkflowTemplates,
  
  // Constants
  TASK_DEFINITIONS,
  WORKFLOW_CATEGORIES,
  TRIGGER_TYPES
};
