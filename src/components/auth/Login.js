import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { MicrosoftIcon } from '../common/Icons';
import toast from 'react-hot-toast';
import { useAuthActions } from "@convex-dev/auth/react";

const Login = () => {
  const { isAuthenticated, loading } = useAuth();
  const { signIn } = useAuthActions();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSSOLogin = async () => {
    try {
      console.log('🔑 Starting SSO login with Azure AD');
      await signIn("azure-ad");
    } catch (error) {
      console.error('❌ SSO login error:', error);
      toast.error(t('login.error') || 'SSO login failed. Please try again.');
    }
  };

  if (loading) {
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
              Sign in with your Microsoft 365 account
            </p>
          </div>

          {/* Login Content */}
          <div className="p-8">
            <div className="space-y-4">
              {/* SSO Login Button */}
              <button
                onClick={handleSSOLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <MicrosoftIcon className="h-6 w-6" />
                <span>Sign in with Microsoft 365</span>
              </button>

              {/* Features */}
              <div className="mt-8 space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Secure single sign-on with Azure AD</span>
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

              {/* Info Banner */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">First time signing in?</p>
                    <p>You may need to consent to required permissions. An administrator may need to approve these permissions for your organization.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>© 2025 Employee Life Cycle Portal</p>
              <p>Powered by Microsoft Graph API</p>
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
    </div>
  );
};

export default Login;
