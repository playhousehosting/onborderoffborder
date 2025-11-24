import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const Login = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const convexAuth = useConvexAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [configForm, setConfigForm] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: ''
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [savedCredentialsAvailable, setSavedCredentialsAvailable] = useState(false);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('customTenantConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfigForm({
          clientId: parsed.clientId || '',
          tenantId: parsed.tenantId || '',
          clientSecret: parsed.clientSecret || ''
        });
        setRememberCredentials(true);
        setSavedCredentialsAvailable(true);
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    }
  }, []);

  // Redirect if already authenticated (Clerk or App-only)
  useEffect(() => {
    if ((isSignedIn && isLoaded) || convexAuth.isAuthenticated) {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, isLoaded, convexAuth.isAuthenticated, navigate]);

  const handleAppLogin = async (e) => {
    e.preventDefault();
    setIsConfiguring(true);
    
    try {
      // Save credentials if remember option is checked
      if (rememberCredentials) {
        localStorage.setItem('customTenantConfig', JSON.stringify({
          clientId: configForm.clientId,
          tenantId: configForm.tenantId,
          clientSecret: configForm.clientSecret
        }));
      } else {
        // Clear saved credentials if remember is unchecked
        localStorage.removeItem('customTenantConfig');
      }
      
      // First configure credentials
      await convexAuth.configure(
        configForm.clientId,
        configForm.tenantId,
        configForm.clientSecret
      );
      
      // Then login with app-only mode
      await convexAuth.loginAppOnly();
      
      toast.success('Successfully authenticated with app credentials');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ App authentication error:', error);
      toast.error(error.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleClearSavedCredentials = () => {
    localStorage.removeItem('customTenantConfig');
    setConfigForm({
      clientId: '',
      tenantId: '',
      clientSecret: ''
    });
    setRememberCredentials(false);
    setSavedCredentialsAvailable(false);
    toast.success(t('login.credentialsCleared') || 'Saved credentials cleared');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('login.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 shadow-2xl">
              <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Employee Life Cycle Portal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Streamline your HR operations with automated workflows for onboarding, offboarding, transfers, and more
          </p>
        </div>

        {/* Authentication Section - Moved to Top */}
        <div className="max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clerk SSO Login */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h2 className="text-xl font-bold mb-1">Sign In with Microsoft</h2>
              <p className="text-blue-100 text-sm">Use your Microsoft 365 account to access the portal</p>
            </div>
            <div className="p-6">
              <SignIn 
                routing="path"
                path="/login"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
                signInFallbackRedirectUrl="/dashboard"
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "shadow-none",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden"
                  }
                }}
              />
            </div>
          </div>

          {/* Custom Tenant Credentials - Always Visible */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-300 dark:border-purple-700">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h2 className="text-xl font-bold">Custom Tenant (Admin)</h2>
              </div>
              <p className="text-purple-100 text-sm">Bring your own Azure AD tenant credentials</p>
            </div>
            
            <div className="p-6">
              {/* Saved credentials indicator */}
              {savedCredentialsAvailable && (
                <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('login.savedCredentialsLoaded') || 'Saved credentials loaded'}</span>
                </div>
              )}
              
              <form onSubmit={handleAppLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={configForm.clientId}
                    onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={configForm.tenantId}
                    onChange={(e) => setConfigForm({ ...configForm, tenantId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={configForm.clientSecret}
                    onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter client secret"
                    required
                  />
                </div>
                
                {/* Remember credentials checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberCredentials"
                    checked={rememberCredentials}
                    onChange={(e) => setRememberCredentials(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberCredentials" className="text-sm text-gray-700 dark:text-gray-300">
                    {t('login.rememberCredentials') || 'Remember my credentials on this device'}
                  </label>
                </div>

                {/* Clear saved credentials button */}
                {savedCredentialsAvailable && (
                  <button
                    type="button"
                    onClick={handleClearSavedCredentials}
                    className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {t('login.clearSavedCredentials') || 'Clear Saved Credentials'}
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isConfiguring}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isConfiguring ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Authenticating...
                    </span>
                  ) : (
                    'Sign in with App Credentials'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Onboarding Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-green-200 dark:border-green-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Employee Onboarding</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Create accounts, assign licenses, set up email, and provision devices automatically
            </p>
          </div>

          {/* Offboarding Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-red-200 dark:border-red-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Employee Offboarding</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Disable accounts, revoke licenses, set auto-replies, and transfer files securely
            </p>
          </div>

          {/* Transfers Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Transfers & Promotions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage department changes, role updates, and location transfers seamlessly
            </p>
          </div>

          {/* Groups Management Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-purple-200 dark:border-purple-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Group Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Create and manage distribution lists, security groups, and Microsoft 365 groups
            </p>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
          {/* Security Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Enterprise Security</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bank-level encryption, MFA support, and Azure AD integration for maximum security
            </p>
          </div>

          {/* Automation Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Automated Workflows</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Save hours with automated provisioning, deprovisioning, and compliance workflows
            </p>
          </div>

          {/* Support Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">24/7 Global Access</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Available worldwide with multi-language support and dedicated help resources
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
