const axios = require('axios');

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_API_BETA = 'https://graph.microsoft.com/beta';

/**
 * DEPRECATED: Make a request to Microsoft Graph API
 * All Graph API calls now go through Convex backend
 * This backend is no longer used for authentication
 */
async function makeGraphRequest(session, endpoint, method = 'GET', data = null, useBeta = false) {
  throw new Error('Backend Graph API service deprecated. Use Convex backend actions for Graph API calls.');
}

/**
 * Get user information
 * @param {Object} session - User session
 * @param {string} userId - User ID (or 'me' for current user)
 * @returns {Promise<Object>} - User information
 */
async function getUser(session, userId = 'me') {
  return makeGraphRequest(session, `/users/${userId}`, 'GET');
}

/**
 * List users
 * @param {Object} session - User session
 * @param {Object} options - Query options (top, filter, select, etc.)
 * @returns {Promise<Object>} - List of users
 */
async function listUsers(session, options = {}) {
  const params = new URLSearchParams();
  
  if (options.top) params.append('$top', options.top);
  if (options.filter) params.append('$filter', options.filter);
  if (options.select) params.append('$select', options.select);
  if (options.search) params.append('$search', options.search);
  if (options.orderby) params.append('$orderby', options.orderby);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/users?${queryString}` : '/users';
  
  return makeGraphRequest(session, endpoint, 'GET');
}

/**
 * Create user
 * @param {Object} session - User session
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
async function createUser(session, userData) {
  return makeGraphRequest(session, '/users', 'POST', userData);
}

/**
 * Update user
 * @param {Object} session - User session
 * @param {string} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} - Update response
 */
async function updateUser(session, userId, userData) {
  return makeGraphRequest(session, `/users/${userId}`, 'PATCH', userData);
}

/**
 * Delete user
 * @param {Object} session - User session
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Disable response (user account disabled)
 */
async function deleteUser(session, userId) {
  // For offboarding we no longer permanently delete users. Instead, disable sign-in
  // by setting accountEnabled to false. This preserves the user object for auditing.
  return makeGraphRequest(session, `/users/${userId}`, 'PATCH', { accountEnabled: false });
}

/**
 * List groups
 * @param {Object} session - User session
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - List of groups
 */
async function listGroups(session, options = {}) {
  const params = new URLSearchParams();
  
  if (options.top) params.append('$top', options.top);
  if (options.filter) params.append('$filter', options.filter);
  if (options.select) params.append('$select', options.select);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/groups?${queryString}` : '/groups';
  
  return makeGraphRequest(session, endpoint, 'GET');
}

/**
 * Get managed devices (Intune)
 * @param {Object} session - User session
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - List of devices
 */
async function listManagedDevices(session, options = {}) {
  const params = new URLSearchParams();
  
  if (options.top) params.append('$top', options.top);
  if (options.filter) params.append('$filter', options.filter);
  
  const queryString = params.toString();
  const endpoint = queryString ? `/deviceManagement/managedDevices?${queryString}` : '/deviceManagement/managedDevices';
  
  return makeGraphRequest(session, endpoint, 'GET', null, true); // Use beta for device management
}

module.exports = {
  makeGraphRequest,
  getUser,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listGroups,
  listManagedDevices
};
