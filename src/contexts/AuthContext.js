import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { authService } from '../services/authService';
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
  // Convex Auth hooks
  const { isAuthenticated: convexAuthAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const convex = useConvex();
  
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
    complianceManagement: false,
    defenderManagement: false,
  });

  // Handle demo mode login event (from Login component)
  // Set a flag when demoModeLogin event fires
  const [demoModeLoginTriggered, setDemoModeLoginTriggered] = useState(false);
  
  useEffect(() => {
    const handleDemoModeLogin = () => {
      console.log('📡 AuthContext received demoModeLogin event');
      setDemoModeLoginTriggered(true);
    };

    window.addEventListener('demoModeLogin', handleDemoModeLogin);
    return () => window.removeEventListener('demoModeLogin', handleDemoModeLogin);
  }, []);

  // When demoModeLoginTriggered changes, update the auth state
  useEffect(() => {
    if (!demoModeLoginTriggered) return;

    const demoUser = localStorage.getItem('demoUser');
    if (demoUser) {
      try {
        const parsedUser = JSON.parse(demoUser);
        console.log('✅ AuthContext: Setting authenticated user:', parsedUser.displayName);
        
        setIsAuthenticated(true);
        setUser(parsedUser);
        setLoading(false);
        setPermissions({
          userManagement: true,
          deviceManagement: true,
          mailManagement: true,
          sharePointManagement: true,
          teamsManagement: true,
          complianceManagement: true,
          defenderManagement: true,
        });

        // Dispatch completion event AFTER this render cycle completes
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          console.log('✅ Auth state updated in context, dispatching authStateUpdated');
          window.dispatchEvent(new CustomEvent('authStateUpdated', { 
            detail: { isAuthenticated: true, user: parsedUser }
          }));
        });
      } catch (e) {
        console.error('Error parsing demo user:', e);
      }
    }

    // Reset the trigger for next login
    setDemoModeLoginTriggered(false);
  }, [demoModeLoginTriggered]);

  // Check authentication status on mount and when Convex auth state changes
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // Check Convex Auth first (SSO)
        if (convexAuthAuthenticated && !convexAuthLoading) {
          console.log('✅ Convex Auth: User authenticated via SSO');
          
          // Get user info from Convex
          try {
            const convexUser = await convex.query(api.ssoAuth.getCurrentUser);
            if (convexUser) {
              console.log('✅ Retrieved user from Convex:', convexUser.email);
              setIsAuthenticated(true);
              setUser({
                displayName: convexUser.name || convexUser.email,
                name: convexUser.name,
                email: convexUser.email,
                userPrincipalName: convexUser.email,
                username: convexUser.email,
                authMode: 'sso'
              });
              
              // SSO users get full permissions
              setPermissions({
                userManagement: true,
                deviceManagement: true,
                mailManagement: true,
                sharePointManagement: true,
                teamsManagement: true,
                complianceManagement: true,
                defenderManagement: true,
              });
              setLoading(false);
              return;
            }
          } catch (convexError) {
            console.error('Error fetching Convex user:', convexError);
          }
        }
        
        // Check if we have a stored user (app-only or demo mode)
        const demoUser = localStorage.getItem('demoUser');
        if (demoUser) {
          try {
            const parsedUser = JSON.parse(demoUser);
            console.log('✅ AuthContext: Restored user from localStorage:', parsedUser.displayName);
            
            // Check if we have a sessionId (required for Convex backend calls in app-only mode)
            const authMode = localStorage.getItem('authMode');
            if (authMode === 'app-only') {
              const sessionId = localStorage.getItem('sessionId');
              if (!sessionId) {
                console.warn('⚠️ No sessionId found - attempting to create Convex session');
                
                // Try to create a session with stored credentials
                const azureConfig = localStorage.getItem('azureConfig');
                if (azureConfig) {
                  try {
                    const config = JSON.parse(azureConfig);
                    
                    console.log('🔧 Creating Convex session for restored user...');
                    const configResult = await convex.action(api.auth.configure, {
                      clientId: config.clientId,
                      tenantId: config.tenantId,
                      clientSecret: config.clientSecret,
                    });
                    
                    localStorage.setItem('sessionId', configResult.sessionId);
                    console.log('✅ Convex session created:', configResult.sessionId);
                    
                    // Validate session
                    await convex.action(api.auth.loginAppOnly, {
                      sessionId: configResult.sessionId,
                    });
                  } catch (sessionError) {
                    console.error('❌ Failed to create Convex session:', sessionError);
                    // Clear auth state and force re-login
                    localStorage.removeItem('demoUser');
                    localStorage.removeItem('authMode');
                    setIsAuthenticated(false);
                    setUser(null);
                    setLoading(false);
                    return;
                  }
                } else {
                  console.error('❌ No Azure config found - clearing auth state');
                  localStorage.removeItem('demoUser');
                  localStorage.removeItem('authMode');
                  setIsAuthenticated(false);
                  setUser(null);
                  setLoading(false);
                  return;
                }
              }
            }
            
            setIsAuthenticated(true);
            setUser(parsedUser);
            
            // Set all permissions to true for app-only/demo mode
            setPermissions({
              userManagement: true,
              deviceManagement: true,
              mailManagement: true,
              sharePointManagement: true,
              teamsManagement: true,
              complianceManagement: true,
              defenderManagement: true,
            });
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing demo user:', e);
          }
        }

        // No authentication found
        console.log('❌ No authentication found');
        setIsAuthenticated(false);
        setUser(null);
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
  }, [convexAuthAuthenticated, convexAuthLoading, convex]);

  // Check user permissions for different operations
  // In SSO and app-only mode, we grant all permissions
  // This can be enhanced later with role-based access control
  const checkPermissions = useCallback(async () => {
    // For now, all authenticated users have all permissions
    // Future enhancement: implement role-based access control
    setPermissions({
      userManagement: true,
      deviceManagement: true,
      mailManagement: true,
      sharePointManagement: true,
      teamsManagement: true,
      complianceManagement: true,
      defenderManagement: true,
    });
  }, []);

  // Login function - not needed as Convex Auth handles SSO login via SSOLoginButton
  // Keeping for compatibility but it won't be called directly
  const login = useCallback(async () => {
    console.warn('Direct login() called - should use SSOLoginButton instead');
    throw new Error('Please use the SSO login button for authentication');
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const authMode = localStorage.getItem('authMode');

      // Handle SSO logout
      if (authMode === 'sso' || convexAuthAuthenticated) {
        console.log('🔓 Logging out from SSO mode');
        await signOut();
      }
      
      // Handle app-only mode logout
      if (authMode === 'app-only' || isDemoMode()) {
        console.log('🔓 Logging out from app-only/demo mode');
        localStorage.removeItem('demoUser');
        localStorage.removeItem('authMode');
        localStorage.removeItem('appOnlyToken'); // Clear cached app-only token
        localStorage.removeItem('sessionId'); // Clear session
        // Don't clear azureConfig - user might want to log in again
      }

      setIsAuthenticated(false);
      setUser(null);
      setPermissions({
        userManagement: false,
        deviceManagement: false,
        mailManagement: false,
        sharePointManagement: false,
        teamsManagement: false,
        complianceManagement: false,
        defenderManagement: false,
      });
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  }, [convexAuthAuthenticated, signOut]);

  // Request additional permissions - not needed with SSO
  const requestPermissions = useCallback(async (scopes) => {
    console.log('Permission request not needed with SSO authentication');
    // Permissions are granted via Azure AD app registration
  }, []);

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
      
      // For SSO users, refresh from Convex
      if (convexAuthAuthenticated) {
        const convexUser = await convex.query(api.ssoAuth.getCurrentUser);
        if (convexUser) {
          setUser({
            displayName: convexUser.name || convexUser.email,
            name: convexUser.name,
            email: convexUser.email,
            userPrincipalName: convexUser.email,
            username: convexUser.email,
            authMode: 'sso'
          });
        }
      }
    } catch (err) {
      console.error('User info refresh error:', err);
      setError(err.message);
    }
  }, [isAuthenticated, user, convexAuthAuthenticated, convex]);

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