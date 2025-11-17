// MSAL-based AuthContext for native Microsoft SSO
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal, useAccount } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../config/msalConfig';

const MSALAuthContext = createContext();

export const useMSALAuth = () => {
  const context = useContext(MSALAuthContext);
  if (!context) {
    throw new Error('useMSALAuth must be used within an MSALAuthProvider');
  }
  return context;
};

export const MSALAuthProvider = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get access token silently
  const getAccessToken = async () => {
    if (!account) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account
      });
      return response.accessToken;
    } catch (error) {
      console.warn('Silent token acquisition failed, attempting interactive', error);
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed', interactiveError);
        return null;
      }
    }
  };

  // Update access token when account changes
  useEffect(() => {
    if (account && inProgress === InteractionStatus.None) {
      getAccessToken().then(token => {
        setAccessToken(token);
        setLoading(false);
      });
    } else if (!account && inProgress === InteractionStatus.None) {
      setAccessToken(null);
      setLoading(false);
    }
  }, [account, inProgress]);

  // Login function
  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await instance.logoutRedirect({
        account: account
      });
    } catch (error) {
      console.error('Logout failed', error);
      throw error;
    }
  };

  const authState = {
    isAuthenticated: !!account,
    loading: loading || inProgress !== InteractionStatus.None,
    authMode: account ? 'microsoft' : null,
    user: account ? {
      displayName: account.name || account.username,
      email: account.username,
      id: account.homeAccountId,
      authMode: 'microsoft'
    } : null,
    accessToken,
    // All permissions enabled for Microsoft authenticated users
    permissions: {
      userManagement: true,
      deviceManagement: true,
      mailManagement: true,
      sharePointManagement: true,
      teamsManagement: true,
      complianceManagement: true,
      defenderManagement: true,
    },
    hasPermission: () => true, // Microsoft SSO users have all permissions
    login,
    logout,
    getAccessToken
  };

  console.log('🔄 MSAL Auth state:', {
    authMode: authState.authMode,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    user: authState.user?.displayName,
    hasToken: !!accessToken
  });

  return (
    <MSALAuthContext.Provider value={authState}>
      {children}
    </MSALAuthContext.Provider>
  );
};
