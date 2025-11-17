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
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl animate-pulse">
                  <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-center mb-2">
                Welcome Worldwide Admins 🌍
              </h1>
              <p className="text-blue-50 text-center text-base mb-1">
                Employee Life Cycle Portal
              </p>
              <p className="text-blue-100 text-center text-sm">
                Empowering HR teams across the globe
              </p>
            </div>
          </div>

          {/* Clerk Sign In Component */}
          <div className="p-8">
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

            {/* Features */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-100 dark:border-green-800 shadow-sm">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Why Teams Love This Portal
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center shadow-sm">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">🔐 Secure single sign-on with Clerk authentication</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center shadow-sm">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">👥 Streamlined employee onboarding & offboarding</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center shadow-sm">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">⚡ Automated workflows for maximum efficiency</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center shadow-sm">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium">🌍 Built for global teams, available 24/7</span>
                </div>
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
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-bold mb-2 text-base">🔑 Two Authentication Methods Available</p>
                  <p className="font-medium leading-relaxed">
                    <span className="inline-block mr-1">✨</span> 
                    <strong>Clerk SSO:</strong> For user accounts with role-based permissions
                  </p>
                  <p className="font-medium leading-relaxed mt-1">
                    <span className="inline-block mr-1">🛡️</span>
                    <strong>App Credentials:</strong> For admin access with full permissions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pb-8 px-8 text-center space-y-3">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">🌟 Trusted by HR Teams Worldwide</p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>🇺🇸</span>
                <span>🇬🇧</span>
                <span>🇨🇦</span>
                <span>🇦🇺</span>
                <span>🇩🇪</span>
                <span>🇫🇷</span>
                <span>🇯🇵</span>
                <span>🇧🇷</span>
                <span>🇮🇳</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p className="font-medium">© 2025 Employee Life Cycle Portal</p>
              <p>Powered by Microsoft Graph API & Clerk Authentication</p>
              <p>Built with ❤️ by Kameron McCain</p>
            </div>
            <div className="pt-2">
              <a 
                href="/faq" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View FAQ & Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
