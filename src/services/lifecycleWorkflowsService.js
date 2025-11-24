import { getActiveService } from './serviceFactory';

/**
 * Helper to get the current graph service based on auth mode
 */
const graphService = { 
  makeRequest: (...args) => getActiveService().makeRequest(...args),
  makeBetaRequest: (...args) => getActiveService().makeBetaRequest?.(...args)
};

/**
 * Comprehensive Lifecycle Workflows Service
 * Provides enterprise automation for Joiner-Mover-Leaver employee scenarios
 * Uses Microsoft Graph Identity Governance APIs
 * 
 * Complete implementation matching Microsoft's official documentation
 */

// ========== TASK DEFINITIONS (ALL 26 OFFICIAL TASKS) ==========
export const TASK_DEFINITIONS = {
  // === JOINER (ONBOARDING) TASKS ===
  SEND_WELCOME_EMAIL: '70b29d51-b59a-4773-9280-8841dfd3f2ea',
  SEND_ONBOARDING_REMINDER_EMAIL: '3C860712-2D37-42A4-928F-5C93935D26A1',
  GENERATE_TAP_SEND_EMAIL: '1b555e50-7f65-41d5-b514-5894a026d10d',
  REQUEST_ACCESS_PACKAGE: 'c1ec1e76-f374-4375-aaa6-0bb6bd4c60be',
  ASSIGN_LICENSES: '683c87a4-2ad4-420b-97d4-220d90afcd24',
  ADD_TO_GROUPS: '22085229-5809-45e8-97fd-270d28d66910',
  ADD_TO_TEAMS: 'e440ed8d-25a1-4618-84ce-091ed5be5594',
  ENABLE_ACCOUNT: '6fc52c9d-398b-4305-9763-15f42c1676fc',
  
  // === MOVER (TRANSFER) TASKS ===
  SEND_EMAIL_MANAGER_USER_MOVE: 'aab41899-9972-422a-9d97-f626014578b7',
  REMOVE_ACCESS_PACKAGE: '4a0b64f2-c7ec-46ba-b117-18f262946c50',
  REMOVE_SELECTED_LICENSES: '5fc402a8-daaf-4b7b-9203-da868b05fc5f',
  REVOKE_REFRESH_TOKENS: '509589a4-0466-4471-829e-49c5e502bdee',
  
  // === LEAVER (OFFBOARDING) TASKS ===
  DISABLE_ACCOUNT: '1dfdfcc7-52fa-4c2e-bf3a-e3919cc12950',
  REMOVE_FROM_SELECTED_GROUPS: '1953a66c-751c-45e5-8bfe-01462c70da3c',
  REMOVE_FROM_ALL_GROUPS: 'b3a31406-2a15-4c9a-b25b-a658fa5f07fc',
  REMOVE_FROM_SELECTED_TEAMS: '06aa7acb-01af-4824-8899-b14e5ed788d6',
  REMOVE_FROM_ALL_TEAMS: '81f7b200-2816-4b3b-8c5d-dc556f07b024',
  REMOVE_ALL_ACCESS_PACKAGES: '42ae2956-193d-4f39-be06-691b8ac4fa1d',
  CANCEL_PENDING_ACCESS_REQUESTS: '498770d9-bab7-4e4c-b73d-5ded82a1d0b3',
  REMOVE_ALL_LICENSES: '8fa97d28-3e52-4985-b3a9-a1126f9b8b4e',
  DELETE_USER_ACCOUNT: '8d18588d-9ad3-4c0f-99d0-ec215f0e3dff',
  SEND_EMAIL_BEFORE_LAST_DAY: '52853a3e-f4e5-4eb8-bb24-1ac09a1da935',
  SEND_EMAIL_ON_LAST_DAY: '9c0a1eaf-5bda-4392-9d9e-6e155bb57411',
  SEND_EMAIL_AFTER_LAST_DAY: '6f22ddd4-b3a5-47a4-a846-0d7c201a49ce',
  SEND_EMAIL_USER_INACTIVITY: '92f74cb4-f1b6-4ec0-b766-96210f56edc2',
  
  // === UNIVERSAL TASKS (ALL CATEGORIES) ===
  RUN_CUSTOM_EXTENSION: '4262b724-8dba-4fad-afc3-43fcbb497a0e',
};

// ========== WORKFLOW CATEGORIES ==========
export const WORKFLOW_CATEGORIES = {
  JOINER: 'joiner',
  MOVER: 'mover',
  LEAVER: 'leaver',
};

// ========== TRIGGER TYPES ==========
export const TRIGGER_TYPES = {
  TIME_BASED: 'timeBasedAttributeTrigger',
  ATTRIBUTE_CHANGE: 'attributeChangeTrigger',
  ON_DEMAND_ONLY: 'onDemandExecutionOnly',
};

// ========== TASK TEMPLATES WITH METADATA ==========
export const TASK_METADATA = {
  [TASK_DEFINITIONS.SEND_WELCOME_EMAIL]: {
    displayName: 'Send Welcome Email',
    description: 'Send welcome email to new hire',
    category: ['joiner'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.SEND_ONBOARDING_REMINDER_EMAIL]: {
    displayName: 'Send Onboarding Reminder Email',
    description: "Send onboarding reminder email to user's manager",
    category: ['joiner'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.GENERATE_TAP_SEND_EMAIL]: {
    displayName: 'Generate TAP and Send Email',
    description: "Generate Temporary Access Pass and send via email to user's manager",
    category: ['joiner'],
    requiresArguments: true,
    supportedArguments: ['tapLifetimeMinutes', 'tapIsUsableOnce', 'cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.REQUEST_ACCESS_PACKAGE]: {
    displayName: 'Request Access Package Assignment',
    description: 'Request user assignment to selected access package',
    category: ['joiner', 'mover'],
    requiresArguments: true,
    supportedArguments: ['accessPackageId', 'assignmentPolicyId'],
  },
  [TASK_DEFINITIONS.ASSIGN_LICENSES]: {
    displayName: 'Assign Licenses',
    description: 'Assign selected licenses to the user',
    category: ['joiner', 'mover'],
    requiresArguments: true,
    supportedArguments: ['licenses'],
  },
  [TASK_DEFINITIONS.ADD_TO_GROUPS]: {
    displayName: 'Add User to Groups',
    description: 'Add user to selected Microsoft Entra groups',
    category: ['joiner', 'leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['groupID'],
  },
  [TASK_DEFINITIONS.ADD_TO_TEAMS]: {
    displayName: 'Add User to Teams',
    description: 'Add user to selected Microsoft Teams',
    category: ['joiner', 'leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['teamID'],
  },
  [TASK_DEFINITIONS.ENABLE_ACCOUNT]: {
    displayName: 'Enable User Account',
    description: 'Enable user account in the directory',
    category: ['joiner', 'leaver'],
    requiresArguments: false,
    supportedArguments: ['enableOnPremisesAccount'],
  },
  [TASK_DEFINITIONS.SEND_EMAIL_MANAGER_USER_MOVE]: {
    displayName: 'Notify Manager of User Move',
    description: "Send email to notify user's manager of user move",
    category: ['mover'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.DISABLE_ACCOUNT]: {
    displayName: 'Disable User Account',
    description: 'Disable user account in the directory',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['disableOnPremisesAccount'],
  },
  [TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS]: {
    displayName: 'Remove User from All Groups',
    description: 'Remove user from all Microsoft Entra group memberships',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: [],
  },
  [TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS]: {
    displayName: 'Remove User from All Teams',
    description: 'Remove user from all Teams memberships',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: [],
  },
  [TASK_DEFINITIONS.REMOVE_ALL_LICENSES]: {
    displayName: 'Remove All Licenses',
    description: 'Remove all licenses assigned to the user',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: [],
  },
  [TASK_DEFINITIONS.DELETE_USER_ACCOUNT]: {
    displayName: 'Delete User Account',
    description: 'Delete user account in Microsoft Entra ID',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['deleteOnPremisesAccount'],
  },
  [TASK_DEFINITIONS.REMOVE_FROM_SELECTED_GROUPS]: {
    displayName: 'Remove from Selected Groups',
    description: 'Remove user from selected Microsoft Entra groups',
    category: ['joiner', 'leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['groupID'],
  },
  [TASK_DEFINITIONS.REMOVE_FROM_SELECTED_TEAMS]: {
    displayName: 'Remove from Selected Teams',
    description: 'Remove user from selected Teams',
    category: ['joiner', 'leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['teamID'],
  },
  [TASK_DEFINITIONS.REMOVE_ACCESS_PACKAGE]: {
    displayName: 'Remove Access Package Assignment',
    description: 'Remove user assignment from selected access package',
    category: ['leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['accessPackageId'],
  },
  [TASK_DEFINITIONS.REMOVE_ALL_ACCESS_PACKAGES]: {
    displayName: 'Remove All Access Packages',
    description: 'Remove all access packages assigned to the user',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['daysUntilExpiration'],
  },
  [TASK_DEFINITIONS.CANCEL_PENDING_ACCESS_REQUESTS]: {
    displayName: 'Cancel Pending Access Requests',
    description: 'Cancel all pending access package assignment requests for the user',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: [],
  },
  [TASK_DEFINITIONS.REMOVE_SELECTED_LICENSES]: {
    displayName: 'Remove Selected Licenses',
    description: 'Remove selected licenses from the user',
    category: ['leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['licenses'],
  },
  [TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS]: {
    displayName: 'Revoke Refresh Tokens',
    description: 'Revoke all refresh tokens for the user',
    category: ['leaver', 'mover'],
    requiresArguments: false,
    supportedArguments: [],
  },
  [TASK_DEFINITIONS.SEND_EMAIL_BEFORE_LAST_DAY]: {
    displayName: "Send Email Before User's Last Day",
    description: "Send offboarding email to user's manager before the last day of work",
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.SEND_EMAIL_ON_LAST_DAY]: {
    displayName: "Send Email on User's Last Day",
    description: "Send offboarding email to user's manager on the last day of work",
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.SEND_EMAIL_AFTER_LAST_DAY]: {
    displayName: "Send Email After User's Last Day",
    description: "Send offboarding email to user's manager after the last day of work",
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.SEND_EMAIL_USER_INACTIVITY]: {
    displayName: 'Send Email About User Inactivity',
    description: 'Notify manager that user has been inactive',
    category: ['leaver'],
    requiresArguments: false,
    supportedArguments: ['cc', 'customSubject', 'customBody', 'locale'],
  },
  [TASK_DEFINITIONS.RUN_CUSTOM_EXTENSION]: {
    displayName: 'Run Custom Task Extension',
    description: 'Run a Custom Task Extension to call-out to an external system',
    category: ['joiner', 'leaver', 'mover'],
    requiresArguments: true,
    supportedArguments: ['customTaskExtensionID'],
  },
};

// ========== CORE WORKFLOW OPERATIONS ==========

/**
 * List all lifecycle workflows
 */
export const listWorkflows = async () => {
  try {
    const response = await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows'
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
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}`
    );
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw new Error(`Failed to get workflow: ${error.message}`);
  }
};

/**
 * Create a Joiner (Onboarding) workflow
 * @param {Object} options - Workflow configuration options
 * @param {string} options.displayName - Display name for the workflow
 * @param {string} options.description - Description of the workflow
 * @param {string} options.department - Filter by specific department (optional)
 * @param {boolean} options.isEnabled - Whether workflow is enabled
 * @param {boolean} options.isSchedulingEnabled - Whether automatic scheduling is enabled
 * @param {number} options.offsetInDays - Days before/after hire date to run (-7 = 7 days before)
 * @param {Array} options.tasks - Custom tasks array (uses defaults if not provided)
 * @param {Object} options.emailCustomization - Custom email settings for tasks
 */
export const createJoinerWorkflow = async ({
  displayName,
  description,
  department = null,
  isEnabled = true,
  isSchedulingEnabled = true,
  offsetInDays = -7,
  tasks = [],
  emailCustomization = {},
}) => {
  try {
    // Default comprehensive joiner tasks
    const defaultTasks = [
      {
        category: 'joiner',
        taskDefinitionId: TASK_DEFINITIONS.SEND_WELCOME_EMAIL,
        displayName: 'Send Welcome Email',
        description: 'Send welcome email to new hire',
        executionSequence: 1,
        isEnabled: true,
        continueOnError: false,
        arguments: emailCustomization.welcomeEmail || [],
      },
      {
        category: 'joiner',
        taskDefinitionId: TASK_DEFINITIONS.GENERATE_TAP_SEND_EMAIL,
        displayName: 'Generate TAP and Send to Manager',
        description: "Generate Temporary Access Pass and send to new hire's manager",
        executionSequence: 2,
        isEnabled: true,
        continueOnError: false,
        arguments: [
          {name: 'tapLifetimeMinutes', value: '480'}, // 8 hours
          {name: 'tapIsUsableOnce', value: 'false'},
        ],
      },
      {
        category: 'joiner',
        taskDefinitionId: TASK_DEFINITIONS.ENABLE_ACCOUNT,
        displayName: 'Enable User Account',
        description: 'Enable the user account in Microsoft Entra ID',
        executionSequence: 3,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
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
          rule: department 
            ? `(department eq '${department}')` 
            : '(employeeHireDate ne null)',
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.timeBasedAttributeTrigger',
          timeBasedAttribute: 'employeeHireDate',
          offsetInDays,
        },
      },
      tasks: workflowTasks,
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      {method: 'POST', body: JSON.stringify(workflow)}
    );
  } catch (error) {
    console.error('Error creating joiner workflow:', error);
    throw new Error(`Failed to create joiner workflow: ${error.message}`);
  }
};

/**
 * Create a Mover (Transfer) workflow
 * Automates employee transfers between departments with comprehensive access updates
 */
export const createMoverWorkflow = async ({
  displayName,
  description,
  targetDepartment = null,
  isEnabled = true,
  isSchedulingEnabled = true,
  tasks = [],
  emailCustomization = {},
}) => {
  try {
    const defaultTasks = [
      {
        category: 'mover',
        taskDefinitionId: TASK_DEFINITIONS.SEND_EMAIL_MANAGER_USER_MOVE,
        displayName: 'Notify Manager of Transfer',
        description: "Automatically notify manager about employee's department change",
        executionSequence: 1,
        isEnabled: true,
        continueOnError: false,
        arguments: emailCustomization.moveNotification || [],
      },
      {
        category: 'mover',
        taskDefinitionId: TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS,
        displayName: 'Revoke Refresh Tokens',
        description: 'Force re-authentication to apply new permissions',
        executionSequence: 2,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
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
            ? `(department eq '${targetDepartment}')` 
            : '(department ne null)',
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.attributeChangeTrigger',
          triggerAttributes: [
            {name: 'department'},
          ],
        },
      },
      tasks: workflowTasks,
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      {method: 'POST', body: JSON.stringify(workflow)}
    );
  } catch (error) {
    console.error('Error creating mover workflow:', error);
    throw new Error(`Failed to create mover workflow: ${error.message}`);
  }
};

/**
 * Create a Leaver (Offboarding) workflow
 * Comprehensive offboarding with all security and access removal tasks
 */
export const createLeaverWorkflow = async ({
  displayName,
  description,
  department = null,
  isEnabled = true,
  isSchedulingEnabled = true,
  offsetInDays = 7,
  includeAccountDeletion = false,
  tasks = [],
  emailCustomization = {},
}) => {
  try {
    const defaultTasks = [
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.DISABLE_ACCOUNT,
        displayName: 'Disable User Account',
        description: 'Immediately disable user account to prevent access',
        executionSequence: 1,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS,
        displayName: 'Revoke All Refresh Tokens',
        description: 'Sign out user from all active sessions',
        executionSequence: 2,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        displayName: 'Remove All Licenses',
        description: 'Remove all Microsoft 365 licenses from departing employee',
        executionSequence: 3,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        displayName: 'Remove from All Teams',
        description: 'Remove employee from all Microsoft Teams memberships',
        executionSequence: 4,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        displayName: 'Remove from All Groups',
        description: 'Remove all Azure AD group memberships',
        executionSequence: 5,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
      {
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.REMOVE_ALL_ACCESS_PACKAGES,
        displayName: 'Remove All Access Packages',
        description: 'Remove all access package assignments',
        executionSequence: 6,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      },
    ];

    // Optional account deletion
    if (includeAccountDeletion) {
      defaultTasks.push({
        category: 'leaver',
        taskDefinitionId: TASK_DEFINITIONS.DELETE_USER_ACCOUNT,
        displayName: 'Delete User Account',
        description: 'Permanently delete the user account',
        executionSequence: 7,
        isEnabled: true,
        continueOnError: false,
        arguments: [],
      });
    }

    const workflowTasks = tasks.length > 0 ? tasks : defaultTasks;

    const workflow = {
      category: WORKFLOW_CATEGORIES.LEAVER,
      displayName: displayName || 'Post-Offboarding of an Employee',
      description: description || 'Configure offboarding tasks for employees after their last day',
      isEnabled,
      isSchedulingEnabled,
      executionConditions: {
        '@odata.type': '#microsoft.graph.identityGovernance.triggerAndScopeBasedConditions',
        scope: {
          '@odata.type': '#microsoft.graph.identityGovernance.ruleBasedSubjectSet',
          rule: department 
            ? `(department eq '${department}')` 
            : '(employeeLeaveDateTime ne null)',
        },
        trigger: {
          '@odata.type': '#microsoft.graph.identityGovernance.timeBasedAttributeTrigger',
          timeBasedAttribute: 'employeeLeaveDateTime',
          offsetInDays,
        },
      },
      tasks: workflowTasks,
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      {method: 'POST', body: JSON.stringify(workflow)}
    );
  } catch (error) {
    console.error('Error creating leaver workflow:', error);
    throw new Error(`Failed to create leaver workflow: ${error.message}`);
  }
};

/**
 * Create an on-demand workflow (no automatic trigger)
 * Perfect for real-time terminations or immediate actions
 */
export const createOnDemandWorkflow = async ({
  displayName,
  description,
  category,
  tasks,
}) => {
  try {
    const workflow = {
      category,
      displayName,
      description,
      isEnabled: true,
      isSchedulingEnabled: false,
      executionConditions: {
        '@odata.type': '#microsoft.graph.identityGovernance.onDemandExecutionOnly',
      },
      tasks,
    };

    return await graphService.makeRequest(
      '/identityGovernance/lifecycleWorkflows/workflows',
      {method: 'POST', body: JSON.stringify(workflow)}
    );
  } catch (error) {
    console.error('Error creating on-demand workflow:', error);
    throw new Error(`Failed to create on-demand workflow: ${error.message}`);
  }
};

/**
 * Update an existing workflow
 */
export const updateWorkflow = async (workflowId, updates) => {
  try {
    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}`,
      {method: 'PATCH', body: JSON.stringify(updates)}
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
      {method: 'DELETE'}
    );
    return {success: true, message: 'Workflow deleted successfully'};
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw new Error(`Failed to delete workflow: ${error.message}`);
  }
};

/**
 * Activate a workflow for specific users (manual execution)
 */
export const activateWorkflowForUser = async (workflowId, userId) => {
  try {
    const payload = {
      subjects: [{id: userId}],
    };

    return await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/activate`,
      {method: 'POST', body: JSON.stringify(payload)}
    );
  } catch (error) {
    console.error('Error activating workflow:', error);
    throw new Error(`Failed to activate workflow: ${error.message}`);
  }
};

/**
 * Get workflow execution history
 */
export const getWorkflowExecutions = async (workflowId) => {
  try {
    const response = await graphService.makeRequest(
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs`
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
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs/${runId}`
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
      `/identityGovernance/lifecycleWorkflows/workflows/${workflowId}/runs/${runId}/taskProcessingResults`
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
      '/identityGovernance/lifecycleWorkflows/taskDefinitions'
    );
    return response.value || [];
  } catch (error) {
    console.error('Error listing task definitions:', error);
    throw new Error(`Failed to list task definitions: ${error.message}`);
  }
};

/**
 * Get comprehensive workflow templates
 * Returns pre-configured templates matching Microsoft's official templates
 */
export const getWorkflowTemplates = () => {
  return [
    {
      id: 'pre-hire-onboarding',
      name: 'Onboard Pre-Hire Employee',
      category: WORKFLOW_CATEGORIES.JOINER,
      description: 'Configure pre-hire tasks for onboarding employees before their first day',
      icon: '🎯',
      offsetInDays: -7,
      tasks: [
        TASK_DEFINITIONS.SEND_WELCOME_EMAIL,
        TASK_DEFINITIONS.GENERATE_TAP_SEND_EMAIL,
        TASK_DEFINITIONS.ENABLE_ACCOUNT,
      ],
    },
    {
      id: 'new-hire-onboarding',
      name: 'Onboard New Hire Employee',
      category: WORKFLOW_CATEGORIES.JOINER,
      description: 'Configure new hire tasks for employees on their first day',
      icon: '👋',
      offsetInDays: 0,
      tasks: [
        TASK_DEFINITIONS.SEND_WELCOME_EMAIL,
        TASK_DEFINITIONS.ADD_TO_GROUPS,
        TASK_DEFINITIONS.ADD_TO_TEAMS,
        TASK_DEFINITIONS.ASSIGN_LICENSES,
      ],
    },
    {
      id: 'post-onboarding',
      name: 'Post-Onboarding New Hire',
      category: WORKFLOW_CATEGORIES.JOINER,
      description: 'Follow-up tasks after employee starts',
      icon: '✅',
      offsetInDays: 7,
      tasks: [
        TASK_DEFINITIONS.SEND_ONBOARDING_REMINDER_EMAIL,
        TASK_DEFINITIONS.REQUEST_ACCESS_PACKAGE,
      ],
    },
    {
      id: 'employee-move',
      name: 'Employee Department Transfer',
      category: WORKFLOW_CATEGORIES.MOVER,
      description: 'Automate tasks when an employee changes departments',
      icon: '🔄',
      tasks: [
        TASK_DEFINITIONS.SEND_EMAIL_MANAGER_USER_MOVE,
        TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS,
      ],
    },
    {
      id: 'real-time-termination',
      name: 'Real-Time Employee Termination',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Immediate offboarding for security-critical terminations',
      icon: '🚨',
      onDemand: true,
      tasks: [
        TASK_DEFINITIONS.DISABLE_ACCOUNT,
        TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
      ],
    },
    {
      id: 'pre-offboarding',
      name: 'Pre-Offboarding of an Employee',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Prepare for employee departure before last day',
      icon: '📋',
      offsetInDays: -7,
      tasks: [
        TASK_DEFINITIONS.SEND_EMAIL_BEFORE_LAST_DAY,
        TASK_DEFINITIONS.CANCEL_PENDING_ACCESS_REQUESTS,
      ],
    },
    {
      id: 'standard-offboarding',
      name: 'Offboard an Employee',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Standard offboarding on employees last day',
      icon: '👋',
      offsetInDays: 0,
      tasks: [
        TASK_DEFINITIONS.DISABLE_ACCOUNT,
        TASK_DEFINITIONS.REVOKE_REFRESH_TOKENS,
        TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        TASK_DEFINITIONS.SEND_EMAIL_ON_LAST_DAY,
      ],
    },
    {
      id: 'post-offboarding',
      name: 'Post-Offboarding of an Employee',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Complete cleanup after employee has left',
      icon: '🧹',
      offsetInDays: 7,
      tasks: [
        TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        TASK_DEFINITIONS.REMOVE_ALL_ACCESS_PACKAGES,
        TASK_DEFINITIONS.SEND_EMAIL_AFTER_LAST_DAY,
      ],
    },
    {
      id: 'complete-offboarding-with-deletion',
      name: 'Complete Offboarding with Account Deletion',
      category: WORKFLOW_CATEGORIES.LEAVER,
      description: 'Full offboarding including permanent account deletion',
      icon: '⚠️',
      offsetInDays: 30,
      tasks: [
        TASK_DEFINITIONS.REMOVE_ALL_LICENSES,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_TEAMS,
        TASK_DEFINITIONS.REMOVE_FROM_ALL_GROUPS,
        TASK_DEFINITIONS.DELETE_USER_ACCOUNT,
      ],
    },
  ];
};

export default {
  // Core workflow operations
  listWorkflows,
  getWorkflow,
  createJoinerWorkflow,
  createMoverWorkflow,
  createLeaverWorkflow,
  createOnDemandWorkflow,
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
  
  // Constants and metadata
  TASK_DEFINITIONS,
  TASK_METADATA,
  WORKFLOW_CATEGORIES,
  TRIGGER_TYPES,
};
