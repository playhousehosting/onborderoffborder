// Unified AuthContext supporting both Clerk and App-Only authentication
import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useAuth as useConvexAuth } from './ConvexAuthContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { isSignedIn: clerkSignedIn, isLoaded: clerkLoaded, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const convexAuth = useConvexAuth();

  // Determine which auth mode is active
  const authMode = convexAuth.isAuthenticated ? 'app-only' : 
                   clerkSignedIn ? 'clerk' : 
                   null;

  // Map auth state from both providers to unified format
  const permissions = convexAuth.isAuthenticated ? convexAuth.permissions : {
    userManagement: true,
    deviceManagement: true,
    mailManagement: true,
    sharePointManagement: true,
    teamsManagement: true,
    complianceManagement: true,
    defenderManagement: true,
  };

  const authState = {
    isAuthenticated: clerkSignedIn || convexAuth.isAuthenticated,
    loading: !clerkLoaded || convexAuth.isLoading,
    authMode, // 'clerk', 'app-only', or null
    user: convexAuth.isAuthenticated ? {
      displayName: 'Admin (App Credentials)',
      email: convexAuth.user?.email || 'app-admin@system',
      id: convexAuth.user?.id || 'app-admin',
      authMode: 'app-only',
      ...convexAuth.user
    } : clerkUser ? {
      displayName: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || 'User',
      email: clerkUser.primaryEmailAddress?.emailAddress,
      id: clerkUser.id,
      authMode: 'clerk',
      ...clerkUser
    } : null,
    // Permissions: app-only has full access, Clerk users have standard access
    permissions,
    // Helper function to check permissions
    hasPermission: (permission) => {
      if (!permissions) return false;
      return permissions[permission] === true;
    },
    // Expose logout from active auth mode
    logout: convexAuth.isAuthenticated ? convexAuth.logout : clerkSignedIn ? clerkSignOut : null
  };

  console.log('🔄 Auth state:', { 
    authMode,
    isAuthenticated: authState.isAuthenticated,
    clerkSignedIn, 
    clerkLoaded,
    convexAuthenticated: convexAuth.isAuthenticated,
    user: authState.user?.displayName
  });

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};
