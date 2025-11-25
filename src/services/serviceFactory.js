/**
 * Service Factory
 * 
 * Provides the appropriate graph service based on the current authentication mode.
 * Components should use this to get the correct service instance.
 */

import { graphService } from './graphService';
import msalGraphService from './msalGraphService';

// Track the current active service
let _activeService = null;
let _authMode = null;

/**
 * Set the active graph service based on auth mode
 * @param {string} mode - 'msal' or 'convex'
 * @param {object} msalAuth - MSAL auth context (required for MSAL mode)
 */
export function setActiveService(mode, msalAuth = null) {
  _authMode = mode;
  // Persist to localStorage so it survives page refreshes
  localStorage.setItem('graphServiceAuthMode', mode);
  
  if (mode === 'msal') {
    if (msalAuth && msalAuth.getAccessToken) {
      msalGraphService.setGetTokenFunction(msalAuth.getAccessToken);
    }
    _activeService = msalGraphService;
  } else {
    _activeService = graphService;
  }
  
  console.log(`🔧 ServiceFactory: Active service set to ${mode}`);
}

/**
 * Get the currently active graph service
 * @returns {object} The active graph service
 */
export function getActiveService() {
  // If no active service, check localStorage for persisted auth mode
  if (!_activeService) {
    const persistedMode = localStorage.getItem('graphServiceAuthMode');
    if (persistedMode === 'msal') {
      _authMode = 'msal';
      _activeService = msalGraphService;
      console.log('🔧 ServiceFactory: Restored MSAL service from localStorage');
    } else if (persistedMode === 'convex') {
      _authMode = 'convex';
      _activeService = graphService;
      console.log('🔧 ServiceFactory: Restored Convex service from localStorage');
    } else {
      // Default to graphService but log warning
      console.warn('🔧 ServiceFactory: No auth mode set, defaulting to graphService');
      return graphService;
    }
  }
  return _activeService;
}

/**
 * Get the current auth mode
 * @returns {string} 'msal' or 'convex'
 */
export function getAuthMode() {
  // Check localStorage if not set in memory
  if (!_authMode) {
    _authMode = localStorage.getItem('graphServiceAuthMode');
  }
  return _authMode;
}

/**
 * Check if using MSAL authentication
 * @returns {boolean}
 */
export function isMSALAuth() {
  return _authMode === 'msal';
}

/**
 * Check if using Convex (app-only) authentication
 * @returns {boolean}
 */
export function isConvexAuth() {
  return _authMode === 'convex';
}

export default {
  setActiveService,
  getActiveService,
  getAuthMode,
  isMSALAuth,
  isConvexAuth,
};
