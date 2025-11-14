import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

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
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({
    userManagement: true,
    deviceManagement: true,
    mailManagement: true,
    sharePointManagement: true,
    teamsManagement: true,
    complianceManagement: true,
    defenderManagement: true,
  });

  // Sync Convex Auth state with local state
  useEffect(() => {
    const isAuthenticated = token !== undefined && token !== null;
    const isLoading = currentUser === undefined;
    
    console.log('🔄 Convex Auth state:', { token: !!token, currentUser, isLoading });
    
    if (isLoading) {
      setLoading(true);
      return;
    }
    
    if (isAuthenticated && currentUser) {
      console.log('✅ Convex Auth user authenticated:', currentUser);
      setIsAuthenticated(true);
      setUser({
        displayName: currentUser.name || currentUser.email,
        email: currentUser.email,
        id: currentUser._id,
        ...currentUser
      });
      setLoading(false);
    } else {
      console.log('❌ Not authenticated via Convex Auth');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  }, [token, currentUser]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      console.log('🔓 Logging out from Convex Auth');
      await convexSignOut();
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