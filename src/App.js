import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Components
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import UserSearch from './components/users/UserSearch';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import OffboardingWizard from './components/offboarding/OffboardingWizard';
import TransferWizard from './components/transfer/TransferWizard';
import UserDetail from './components/users/UserDetail';
import DeviceManagement from './components/intune/DeviceManagement';
import IntuneManagement from './components/intune/IntuneManagement';
import PurviewManagement from './components/compliance/PurviewManagement';
import TeamsManagement from './components/teams/TeamsManagement';
import CopilotManagement from './components/copilot/CopilotManagement';
import ScheduledOffboarding from './components/offboarding/ScheduledOffboarding';
import WorkflowManagement from './components/workflows/WorkflowManagement';
import Settings from './components/settings/Settings';
import ConfigurationForm from './components/auth/ConfigurationForm';
import FAQ from './components/common/FAQ';
import NotFound from './components/common/NotFound';
import ErrorBoundary from './components/common/ErrorBoundary';
import { isDemoMode } from './config/authConfig';

// Initialize MSAL instance outside component to prevent recreation
let msalInstance = null;

const getMsalInstance = () => {
  // Always create a fresh instance to pick up config changes
  // This is necessary when user updates Azure AD config from the UI
  if (!msalInstance) {
    try {
      msalInstance = new PublicClientApplication(msalConfig);
    } catch (error) {
      console.error('Failed to create MSAL instance:', error);
      // Create a minimal instance to prevent app crash
      // User will be prompted to configure
      msalInstance = new PublicClientApplication({
        auth: {
          clientId: 'demo-client-id',
          authority: 'https://login.microsoftonline.com/common',
          redirectUri: window.location.origin,
        },
        cache: {
          cacheLocation: 'sessionStorage',
          storeAuthStateInCookie: false,
        },
      });
    }
  }
  return msalInstance;
};

// Helper to reset MSAL instance (called when config changes)
export const resetMsalInstance = () => {
  console.log('🔄 Resetting MSAL instance to pick up new configuration');
  msalInstance = null;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  console.log(`🔒 ProtectedRoute check - isAuthenticated: ${isAuthenticated}, loading: ${loading}, user: ${user?.displayName || 'none'}`);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.warn('🚫 ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ ProtectedRoute: Access granted');
  return children;
};

function App() {
  const [msalInitialized, setMsalInitialized] = useState(false);
  const [msalError, setMsalError] = useState(null);
  const msal = getMsalInstance();

  // Check if we have a valid Azure configuration or are in demo mode
  const hasValidConfig = () => {
    // Demo mode is always valid
    if (isDemoMode()) return true;
    
    try {
      const config = JSON.parse(localStorage.getItem('azureConfig') || '{}');
      // Valid if we have both tenant ID and client ID
      return !!(config.tenantId && config.clientId);
    } catch (e) {
      return false;
    }
  };

  // Always allow access without config - users can configure from the UI
  const shouldShowConfigScreen = () => {
    return !hasValidConfig();
  };

  useEffect(() => {
    // Initialize MSAL before rendering the app
    const initializeMsal = async () => {
      try {
        // Add timeout to prevent infinite hanging (reduced to 5 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MSAL initialization timeout after 5 seconds')), 5000)
        );
        
        const initPromise = (async () => {
          await msal.initialize();
          
          console.log('🔍 MSAL initialized, handling redirect promise...');
          
          // Handle redirect promise to complete sign-in flow
          const response = await msal.handleRedirectPromise();
          
          if (response) {
            console.log('✅ MSAL redirect handled successfully:', response.account?.username);
            // Set auth mode to interactive if we got a successful response
            localStorage.setItem('authMode', 'interactive');
            
            // Dispatch event to notify AuthContext that login succeeded
            window.dispatchEvent(new CustomEvent('oauthLoginStateUpdated', { 
              detail: { isAuthenticated: true, user: response.account }
            }));
          } else {
            // Check if we have any accounts in cache
            const accounts = msal.getAllAccounts();
            if (accounts.length > 0) {
              console.log('✅ MSAL account found in cache:', accounts[0].username);
              msal.setActiveAccount(accounts[0]);
              localStorage.setItem('authMode', 'interactive');
            } else {
              console.log('ℹ️ No MSAL accounts found in cache');
            }
          }
        })();
        
        await Promise.race([initPromise, timeoutPromise]);
        setMsalInitialized(true);
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setMsalError(error.message);
        // ALWAYS allow the app to render - even with errors
        setMsalInitialized(true);
      }
    };
    
    initializeMsal();
  }, [msal]);

  // Show loading screen while MSAL initializes (with timeout)
  if (!msalInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Show a warning banner if MSAL failed, but still render the app
  const msalWarningBanner = msalError && !isDemoMode() ? (
    <div className="bg-yellow-50 border-b-2 border-yellow-400 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">Configuration Warning</p>
            <p className="text-sm text-yellow-700">{msalError}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.href = '/configure'}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
          >
            Configure
          </button>
          <button
            onClick={() => {
              localStorage.setItem('demoMode', 'true');
              window.location.reload();
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Demo Mode
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MsalProvider instance={msal}>
          <AuthProvider>
            <Router>
              <div className="App">
                {/* Show warning banner if there's a configuration issue */}
                {msalWarningBanner}
                
                <Routes>
                  {/* Public Routes - Always accessible */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/configure" element={<ConfigurationForm />} />
                  <Route path="/faq" element={<FAQ />} />
                  
                  {/* Demo route - direct entry bypassing config checks */}
                  <Route path="/demo" element={<Navigate to="/login" replace state={{ isDemoEntry: true }} />} />
                  
                  {/* Default route - show login if configured, otherwise configure screen */}
                  <Route path="/" element={<Navigate to={shouldShowConfigScreen() ? "/configure" : "/login"} replace />} />
                  
                  {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <UserSearch />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users/:userId"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <UserDetail />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding/:userId?"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <OnboardingWizard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/offboarding/:userId?"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <OffboardingWizard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfer/:userId?"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <TransferWizard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scheduled-offboarding"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ScheduledOffboarding />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/workflows"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <WorkflowManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/devices"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DeviceManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intune"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <IntuneManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compliance"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PurviewManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teams"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <TeamsManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/copilot"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <CopilotManagement />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Settings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Global Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </MsalProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;