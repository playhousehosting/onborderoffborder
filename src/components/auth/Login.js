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
  const [showAppAuth, setShowAppAuth] = useState(false);
  const [configForm, setConfigForm] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: ''
  });
  const [isConfiguring, setIsConfiguring] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">
              Employee Life Cycle Portal
            </h1>
            <p className="text-blue-100 text-center text-sm">
              Sign in with your account
            </p>
          </div>

          {/* Clerk Sign In Component */}
          <div className="p-8">
            <SignIn 
              routing="path"
              path="/login"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden"
                }
              }}
            />

            {/* Features */}
            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Secure single sign-on with Clerk</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Manage employee onboarding & offboarding</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automated workflows and compliance</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or
                </span>
              </div>
            </div>

            {/* App Authentication Toggle */}
            {!showAppAuth ? (
              <button
                onClick={() => setShowAppAuth(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Use App Credentials (Admin)</span>
              </button>
            ) : (
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">App Authentication</h3>
                  <button
                    onClick={() => setShowAppAuth(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleAppLogin} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={configForm.clientId}
                      onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client secret"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isConfiguring}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}

            {/* Info Banner */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Two authentication methods available</p>
                  <p>Sign in with Clerk (user accounts) or use app credentials (admin access with full permissions).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-8 px-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>© 2025 Employee Life Cycle Portal</p>
            <p>Powered by Microsoft Graph API & Clerk</p>
            <p>Built by Kameron McCain</p>
            <p className="mt-2">
              <a href="/faq" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                View FAQ & Documentation
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
