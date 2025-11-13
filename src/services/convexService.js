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
