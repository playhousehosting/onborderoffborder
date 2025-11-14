/**
 * Convex Service - Manages session ID and provides convenience methods
 */

const SESSION_ID_KEY = 'convex_session_id';

/**
 * Get the current session ID from localStorage
 */
export function getSessionId() {
  return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * Set the session ID in localStorage
 */
export function setSessionId(sessionId) {
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } else {
    localStorage.removeItem(SESSION_ID_KEY);
  }
}

/**
 * Clear the session ID
 */
export function clearSessionId() {
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Check if a session ID exists
 */
export function hasSessionId() {
  return !!getSessionId();
}

/**
 * Get session ID or throw error
 */
export function requireSessionId() {
  const sessionId = getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found. Please login first.');
  }
  return sessionId;
}

/**
 * Get app-only access token from Convex
 * This token can be used for Microsoft Graph API calls
 */
export async function getAppOnlyToken() {
  const sessionId = getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found. Not authenticated with app credentials.');
  }

  // Dynamically import convex client to avoid circular dependencies
  const { ConvexReactClient } = await import('convex/react');
  const { api } = await import('../convex/_generated/api');
  
  const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);
  
  try {
    const result = await convex.action(api.authActions.getAppOnlyToken, { sessionId });
    return result.accessToken;
  } catch (error) {
    throw new Error(`Failed to get app-only token: ${error.message}`);
  }
}
