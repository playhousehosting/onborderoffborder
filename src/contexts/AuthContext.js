// AuthContext wrapper for Clerk authentication
// This provides a unified auth interface for the app
import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();

  // Map Clerk auth state to our app's expected format
  const authState = {
    isAuthenticated: isSignedIn || false,
    loading: !isLoaded,
    user: user ? {
      displayName: user.fullName || user.primaryEmailAddress?.emailAddress || 'User',
      email: user.primaryEmailAddress?.emailAddress,
      id: user.id,
      ...user
    } : null,
    permissions: {
      userManagement: true,
      deviceManagement: true,
      mailManagement: true,
      sharePointManagement: true,
      teamsManagement: true,
      complianceManagement: true,
      defenderManagement: true,
    }
  };

  console.log('🔄 Auth state:', { 
    isSignedIn, 
    isLoaded,
    user: user?.fullName
  });

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};
