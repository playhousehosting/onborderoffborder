import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { getSessionId } from '../services/convexService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const token = useAuthToken();
  const { signOut: convexSignOut } = useAuthActions();
  const currentUser = useQuery(api.ssoAuth.getCurrentUser);
  
  // Track session ID in state so it re-renders when changed
  const [sessionId, setSessionIdState] = useState(getSessionId());
  
  // Check app-only auth session
  const sessionStatus = useQuery(api.authMutations.getStatus, sessionId ? { sessionId } : "skip");
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Listen for storage changes (session ID updates)
  useEffect(() => {
    const handleStorageChange = () => {
      const newSessionId = getSessionId();
      console.log('🔄 Session ID changed:', newSessionId);
      setSessionIdState(newSessionId);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case same-window changes aren't caught
    const interval = setInterval(handleStorageChange, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  const [permissions, setPermissions] = useState({
    userManagement: true,
    deviceManagement: true,
    mailManagement: true,
    sharePointManagement: true,
    teamsManagement: true,
    complianceManagement: true,
    defenderManagement: true,
  });

  // Sync both SSO and App-only auth states
  useEffect(() => {
    const hasSSOToken = token !== undefined && token !== null;
    const isSSOLoading = currentUser === undefined;
    const hasAppSession = sessionStatus?.authenticated === true;
    const isAppLoading = sessionId && sessionStatus === undefined;
    
    console.log('🔄 Auth state:', { 
      ssoToken: !!token, 
      ssoUser: currentUser, 
      appSession: hasAppSession,
      sessionId 
    });
    
    // If either auth method is still loading
    if (isSSOLoading || isAppLoading) {
      setLoading(true);
      return;
    }
    
    // Check SSO authentication first
    if (hasSSOToken && currentUser) {
      console.log('✅ SSO authenticated:', currentUser);
      setIsAuthenticated(true);
      setUser({
        displayName: currentUser.name || currentUser.email,
        email: currentUser.email,
        id: currentUser._id,
        ...currentUser
      });
      setLoading(false);
    } 
    // Check app-only authentication
    else if (hasAppSession && sessionStatus.user) {
      console.log('✅ App-only authenticated:', sessionStatus.user);
      setIsAuthenticated(true);
      setUser({
        displayName: sessionStatus.user.displayName || sessionStatus.user.email,
        email: sessionStatus.user.email,
        id: sessionStatus.user.id,
        ...sessionStatus.user
      });
      setLoading(false);
    } 
    // Not authenticated by either method
    else {
      console.log('❌ Not authenticated');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  }, [token, currentUser, sessionId, sessionStatus]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      console.log('🔓 Logging out...');
      
      // Try SSO logout (may fail if not using SSO)
      try {
        await convexSignOut();
      } catch (ssoErr) {
        console.log('⚠️ SSO logout not applicable:', ssoErr.message);
      }
      
      // Clear app-only session
      const { clearSessionId } = await import('../services/convexService');
      clearSessionId();
      localStorage.clear();
      
      setSessionIdState(null); // Update state
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  }, [convexSignOut]);

  // Placeholder functions for compatibility
  const login = useCallback(async () => {
    console.log('⚠️ Direct login() is deprecated - use SSO button instead');
  }, []);

  const requestPermissions = useCallback(async (scopes) => {
    console.log('⚠️ requestPermissions() not needed with Convex Auth');
  }, []);

  const getAccessToken = useCallback(async (scopes) => {
    console.log('⚠️ getAccessToken() not needed - Convex Auth handles tokens');
    return null;
  }, []);

  const refreshUserInfo = useCallback(async () => {
    console.log('⚠️ refreshUserInfo() not needed - Convex Auth auto-syncs');
  }, []);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    return permissions[permission] || false;
  }, [permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissionList) => {
    return permissionList.some(permission => permissions[permission]);
  }, [permissions]);

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback((permissionList) => {
    return permissionList.every(permission => permissions[permission]);
  }, [permissions]);

  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    permissions,
    login,
    logout,
    requestPermissions,
    getAccessToken,
    refreshUserInfo,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;