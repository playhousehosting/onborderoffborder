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
  
  if (mode === 'msal') {
    if (msalAuth && msalAuth.getAccessToken) {
      msalGraphService.setGetTokenFunction(msalAuth.getAccessToken);
    }
    _activeService = msalGraphService;
  } else {
    _activeService = graphService;
  }
}

/**
 * Get the currently active graph service
 * @returns {object} The active graph service
 */
export function getActiveService() {
  if (!_activeService) {
    console.warn('No active service set, defaulting to graphService');
    return graphService;
  }
  return _activeService;
}

/**
 * Get the current auth mode
 * @returns {string} 'msal' or 'convex'
 */
export function getAuthMode() {
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
