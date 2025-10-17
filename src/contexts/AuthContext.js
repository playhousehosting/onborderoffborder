import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { authService } from '../services/authService';
import { graphService } from '../services/graphService';
import { isDemoMode } from '../config/authConfig';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { instance: msalInstance } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({
    userManagement: false,
    deviceManagement: false,
    mailManagement: false,
    sharePointManagement: false,
    teamsManagement: false,
  });

  // Initialize authService with MSAL instance
  useEffect(() => {
    if (msalInstance) {
      authService.setMsalInstance(msalInstance);
    }
  }, [msalInstance]);

  // Handle demo mode login event (from Login component)
  // This uses a callback approach to handle async state updates
  useEffect(() => {
    const handleDemoModeLogin = async () => {
      console.log('📡 AuthContext received demoModeLogin event');
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        try {
          const parsedUser = JSON.parse(demoUser);
          console.log('✅ AuthContext: Setting authenticated user:', parsedUser.displayName);
          
          // Use functional setState to ensure updates complete
          setIsAuthenticated(true);
          setUser(parsedUser);
          setLoading(false);
          setPermissions({
            userManagement: true,
            deviceManagement: true,
            mailManagement: true,
            sharePointManagement: true,
            teamsManagement: true,
          });
          
          // Dispatch a completion event that includes the updated state
          window.dispatchEvent(new CustomEvent('authStateUpdated', { 
            detail: { isAuthenticated: true, user: parsedUser }
          }));
        } catch (e) {
          console.error('Error parsing demo user:', e);
        }
      }
    };

    window.addEventListener('demoModeLogin', handleDemoModeLogin);
    return () => window.removeEventListener('demoModeLogin', handleDemoModeLogin);
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // Check if we're in demo mode and have a demo user stored
        if (isDemoMode()) {
          const demoUser = localStorage.getItem('demoUser');
          if (demoUser) {
            try {
              const parsedUser = JSON.parse(demoUser);
              console.log('✅ AuthContext: Restored demo user from localStorage:', parsedUser.displayName);
              setIsAuthenticated(true);
              setUser(parsedUser);
              
              // Set all permissions to true for demo mode
              setPermissions({
                userManagement: true,
                deviceManagement: true,
                mailManagement: true,
                sharePointManagement: true,
                teamsManagement: true,
              });
              setLoading(false);
              return;
            } catch (e) {
              console.error('Error parsing demo user:', e);
            }
          }
        }
        
        // Wait for authService to be initialized
        if (!authService.msalInstance) {
          setLoading(false);
          return;
        }
        
        const account = authService.getCurrentAccount();
        
        if (account) {
          setIsAuthenticated(true);
          setUser(account);
          
          // Get detailed user info from Graph API
          try {
            const userInfo = await graphService.getUserById(account.homeAccountId);
            setUser({ ...account, ...userInfo });
          } catch (userInfoError) {
            console.warn('Could not fetch detailed user info:', userInfoError);
          }
          
          // Check permissions
          await checkPermissions();
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth status check error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
    
    // Listen for custom demo mode login event
    const handleDemoLogin = () => {
      checkAuthStatus();
    };
    
    window.addEventListener('demoModeLogin', handleDemoLogin);
    
    return () => {
      window.removeEventListener('demoModeLogin', handleDemoLogin);
    };
  }, [msalInstance]);

  // Check user permissions for different operations
  const checkPermissions = useCallback(async () => {
    try {
      const [
        userMgmt,
        deviceMgmt,
        mailMgmt,
        sharePointMgmt,
        teamsMgmt,
      ] = await Promise.all([
        authService.hasPermissions(['User.ReadWrite.All']),
        authService.hasPermissions(['DeviceManagementManagedDevices.ReadWrite.All']),
        authService.hasPermissions(['MailboxSettings.ReadWrite']),
        authService.hasPermissions(['Sites.ReadWrite.All']),
        authService.hasPermissions(['Team.ReadWrite.All']),
      ]);

      setPermissions({
        userManagement: userMgmt,
        deviceManagement: deviceMgmt,
        mailManagement: mailMgmt,
        sharePointManagement: sharePointMgmt,
        teamsManagement: teamsMgmt,
      });
    } catch (error) {
      console.error('Permission check error:', error);
    }
  }, []);

  // Login function
  const login = useCallback(async (usePopup = true) => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (usePopup) {
        response = await authService.loginPopup();
      } else {
        authService.loginRedirect();
        return;
      }
      
      if (response && response.account) {
        setIsAuthenticated(true);
        setUser(response.account);
        
        // Get detailed user info
        try {
          const userInfo = await graphService.getUserById(response.account.homeAccountId);
          setUser({ ...response.account, ...userInfo });
        } catch (userInfoError) {
          console.warn('Could not fetch detailed user info:', userInfoError);
        }
        
        await checkPermissions();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkPermissions]);

  // Logout function
  const logout = useCallback(() => {
    try {
      // Clear demo user if in demo mode
      if (isDemoMode()) {
        localStorage.removeItem('demoUser');
      } else {
        authService.logout();
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setPermissions({
        userManagement: false,
        deviceManagement: false,
        mailManagement: false,
        sharePointManagement: false,
        teamsManagement: false,
      });
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  }, []);

  // Request additional permissions
  const requestPermissions = useCallback(async (scopes) => {
    try {
      await authService.requestAdditionalPermissions(scopes);
      await checkPermissions();
    } catch (err) {
      console.error('Permission request error:', err);
      setError(err.message);
      throw err;
    }
  }, [checkPermissions]);

  // Get access token for specific operations
  const getAccessToken = useCallback(async (scopes) => {
    try {
      return await authService.getAccessToken(scopes);
    } catch (err) {
      console.error('Token acquisition error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Refresh user information
  const refreshUserInfo = useCallback(async () => {
    try {
      if (!isAuthenticated || !user) return;
      
      const userInfo = await graphService.getUserById(user.homeAccountId);
      setUser({ ...user, ...userInfo });
    } catch (err) {
      console.error('User info refresh error:', err);
      setError(err.message);
    }
  }, [isAuthenticated, user]);

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