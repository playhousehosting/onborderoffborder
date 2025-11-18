import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { getSessionId, setSessionId, clearSessionId } from '../services/convexService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ConvexAuthProvider = ({ children }) => {
  const convex = useConvex();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    userManagement: false,
    deviceManagement: false,
    mailManagement: false,
    sharePointManagement: false,
    teamsManagement: false,
    complianceManagement: false,
    defenderManagement: false,
  });

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        const sessionId = getSessionId();
        
        if (!sessionId) {
          console.log('❌ No session ID found');
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('🔑 Checking session status with Convex...');

        // Check session status with Convex
        const status = await convex.query(api.authMutations.getStatus, { sessionId });

        if (status.authenticated) {
          console.log('✅ Session valid, user authenticated');
          setIsAuthenticated(true);
          setUser(status.user);
          
          // Set permissions based on auth mode
          if (status.authMode === 'app-only') {
            setPermissions({
              userManagement: true,
              deviceManagement: true,
              mailManagement: true,
              sharePointManagement: true,
              teamsManagement: true,
              complianceManagement: true,
              defenderManagement: true,
            });
          }
        } else {
          // Don't warn if using MSAL auth - Convex session not required
          if (sessionId && !sessionId.startsWith('msal_')) {
            console.warn('⚠️ Session invalid or expired:', status.reason);
          }
          clearSessionId();
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        clearSessionId();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [convex]);

  /**
   * Configure Azure credentials
   */
  const configure = async (clientId, tenantId, clientSecret) => {
    try {
      console.log('🔧 Configuring credentials with Convex...');
      
      const result = await convex.action(api.authActions.configure, {
        clientId,
        tenantId,
        clientSecret,
      });

      console.log('✅ Credentials configured, session ID:', result.sessionId);
      setSessionId(result.sessionId);
      
      return result;
    } catch (error) {
      console.error('❌ Configuration error:', error);
      throw error;
    }
  };

  /**
   * Login with app-only (client credentials) mode
   */
  const loginAppOnly = async () => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        throw new Error('No session ID. Please configure credentials first.');
      }

      console.log('🔑 Logging in with app-only mode...');
      
      const result = await convex.action(api.authActions.loginAppOnly, { sessionId });

      console.log('✅ App-only login successful');
      
      // Set authMode to app-only so Graph API uses correct token acquisition
      localStorage.setItem('authMode', 'app-only');
      console.log('✅ Set authMode to app-only');
      
      // Trigger storage event so AuthContext picks up the authenticated session
      window.dispatchEvent(new Event('storage'));
      
      setIsAuthenticated(true);
      setUser(result.user);
      setPermissions({
        userManagement: true,
        deviceManagement: true,
        mailManagement: true,
        sharePointManagement: true,
        teamsManagement: true,
        complianceManagement: true,
        defenderManagement: true,
      });

      return result;
    } catch (error) {
      console.error('❌ App-only login error:', error);
      throw error;
    }
  };

  /**
   * Login with OAuth2 (delegated) mode
   */
  const loginOAuth2 = async (userInfo) => {
    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        throw new Error('No session ID. Please configure credentials first.');
      }

      console.log('🔑 Logging in with OAuth2 mode...');
      
      const result = await convex.mutation(api.authMutations.loginOAuth2, {
        sessionId,
        userId: userInfo.localAccountId,
        email: userInfo.username,
        displayName: userInfo.name,
        tenantId: userInfo.tenantId,
        roles: userInfo.roles || ['user'],
      });

      console.log('✅ OAuth2 login successful');
      
      // Trigger storage event so AuthContext picks up the authenticated session
      window.dispatchEvent(new Event('storage'));
      
      setIsAuthenticated(true);
      setUser(result.user);
      setPermissions({
        userManagement: true,
        deviceManagement: true,
        mailManagement: true,
        sharePointManagement: true,
        teamsManagement: true,
        complianceManagement: true,
        defenderManagement: true,
      });

      return result;
    } catch (error) {
      console.error('❌ OAuth2 login error:', error);
      throw error;
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      const sessionId = getSessionId();
      if (sessionId) {
        await convex.mutation(api.authMutations.logout, { sessionId });
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      clearSessionId();
      localStorage.removeItem('azureConfig');
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      localStorage.removeItem('authMode');
      
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
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    permissions,
    configure,
    loginAppOnly,
    loginOAuth2,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
