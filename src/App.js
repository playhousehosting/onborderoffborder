import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { MSALAuthProvider, useMSALAuth as useAuth } from './contexts/MSALAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { msalInstance } from './config/msalConfig';
import { authService } from './services/authService';
import './index.css';

// Initialize authService with MSAL instance
authService.setMsalInstance(msalInstance);

// Components
import Layout from './components/common/Layout';
import MSALLogin from './components/auth/MSALLogin';
import SignUp from './components/auth/SignUp';
import OAuthCallback from './components/auth/OAuthCallback';
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
import DefenderManagement from './components/defender/DefenderManagement';
import ScheduledOffboarding from './components/offboarding/ScheduledOffboarding';
import WorkflowManagement from './components/workflows/WorkflowManagement';
import Settings from './components/settings/Settings';
import ConfigurationForm from './components/auth/ConfigurationForm';
import FAQ from './components/common/FAQ';
import Help from './components/common/Help';
import NotFound from './components/common/NotFound';
import ErrorBoundary from './components/common/ErrorBoundary';

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
  return (
    <ErrorBoundary>
      <MsalProvider instance={msalInstance}>
        <MSALAuthProvider>
          <ThemeProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public Routes - Always accessible */}
                  <Route path="/login" element={<MSALLogin />} />
                  <Route path="/login/*" element={<MSALLogin />} />
                  <Route path="/sign-up" element={<SignUp />} />
                  <Route path="/sign-up/*" element={<SignUp />} />
                  <Route path="/oauth-callback" element={<OAuthCallback />} />
                  <Route path="/configure" element={<ConfigurationForm />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/help" element={<Help />} />
                  
                  {/* Default route */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
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
                  path="/defender"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DefenderManagement />
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
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Help />
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
          </ThemeProvider>
        </MSALAuthProvider>
      </MsalProvider>
    </ErrorBoundary>
  );
}

export default App;
