import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth } from '../../contexts/ConvexAuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const MSALLogin = () => {
  const { isAuthenticated, loading, login } = useMSALAuth();
  const convexAuth = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Custom tenant form state
  const [configForm, setConfigForm] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: ''
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [savedCredentialsAvailable, setSavedCredentialsAvailable] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('customTenantConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfigForm(parsedConfig);
        setSavedCredentialsAvailable(true);
        setRememberCredentials(true);
        toast.success(t('login.savedCredentialsLoaded') || 'Saved credentials loaded');
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
        localStorage.removeItem('customTenantConfig');
      }
    }
  }, [t]);

  // Redirect if already authenticated (either MSAL SSO or ConvexAuth app-only)
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('✅ MSAL user authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    } else if (convexAuth.isAuthenticated && !convexAuth.loading) {
      console.log('✅ App-only user authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, convexAuth.isAuthenticated, convexAuth.loading, navigate]);

  const handleMicrosoftLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('❌ Microsoft login error:', error);
    }
  };

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
        localStorage.removeItem('customTenantConfig');
      }
      
      // Use Convex-based app-only authentication (client credentials flow)
      // This is separate from MSAL SSO and doesn't require user interaction
      console.log('🔧 Configuring custom tenant credentials...');
      await convexAuth.configure(
        configForm.clientId,
        configForm.tenantId,
        configForm.clientSecret
      );
      
      console.log('🔑 Logging in with app-only mode...');
      await convexAuth.loginAppOnly();
      
      toast.success(t('login.authSuccess') || 'Successfully authenticated with app credentials');
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ App authentication error:', error);
      toast.error(error.message || t('login.authFailed') || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleClearSavedCredentials = () => {
    localStorage.removeItem('customTenantConfig');
    setConfigForm({ clientId: '', tenantId: '', clientSecret: '' });
    setSavedCredentialsAvailable(false);
    setRememberCredentials(false);
    toast.success(t('login.credentialsCleared') || 'Saved credentials cleared');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
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
              Revoke access, backup data, disable accounts, and ensure compliance automatically
            </p>
          </div>

          {/* Transfers Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Department Transfers</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Update permissions, move mailboxes, reassign licenses, and update org charts seamlessly
            </p>
          </div>

          {/* Groups Card */}
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

        {/* Authentication Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 max-w-7xl mx-auto">
          {/* Microsoft SSO Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">
                  {t('login.microsoftSSO') || 'Microsoft SSO'}
                </h2>
                <p className="text-blue-50 text-center text-sm">
                  {t('login.microsoftSSODescription') || 'Sign in with your organization account'}
                </p>
              </div>
            </div>

            {/* Sign In Section */}
            <div className="p-8">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  {t('login.useM365Account') || 'Use your Microsoft 365 account to access the portal'}
                </p>
              </div>

              {/* Microsoft Sign In Button */}
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" viewBox="0 0 23 23" fill="none">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span className="text-lg">{t('login.signInMicrosoft') || 'Sign in with Microsoft'}</span>
              </button>

              {/* Features */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800 shadow-sm">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  {t('login.benefits') || 'Benefits'}
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t('login.ssoSecurity') || 'Secure SSO authentication'}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t('login.mfaSupport') || 'MFA support'}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {t('login.yourPermissions') || 'Uses your permissions'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Custom Tenant Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">
                  {t('login.customTenant') || 'Custom Tenant'}
                </h2>
                <p className="text-purple-50 text-center text-sm">
                  {t('login.customTenantDescription') || 'Use your own Azure app credentials'}
                </p>
              </div>
            </div>

            {/* Custom Tenant Form */}
            <div className="p-8">
              {savedCredentialsAvailable && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {t('login.savedCredentialsLoaded') || 'Saved credentials loaded'}
                  </p>
                </div>
              )}

              <form onSubmit={handleAppLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('login.clientId') || 'Client ID'}
                  </label>
                  <input
                    type="text"
                    value={configForm.clientId}
                    onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('login.tenantId') || 'Tenant ID'}
                  </label>
                  <input
                    type="text"
                    value={configForm.tenantId}
                    onChange={(e) => setConfigForm({ ...configForm, tenantId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('login.clientSecret') || 'Client Secret'}
                  </label>
                  <input
                    type="password"
                    value={configForm.clientSecret}
                    onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••••••••••••••"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberCredentials}
                      onChange={(e) => setRememberCredentials(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('login.rememberCredentials') || 'Remember my credentials'}
                    </span>
                  </label>
                  {savedCredentialsAvailable && (
                    <button
                      type="button"
                      onClick={handleClearSavedCredentials}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      {t('login.clearSavedCredentials') || 'Clear'}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isConfiguring}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfiguring ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('login.configuring') || 'Configuring...'}
                    </span>
                  ) : (
                    t('login.signInCustom') || 'Sign in with Custom Tenant'
                  )}
                </button>
              </form>

              {/* Info */}
              <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  {t('login.customTenantInfo') || 'What is this?'}
                </h3>
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  {t('login.customTenantInfoDescription') || 'Use your own Azure app registration to authenticate with full control over permissions and scopes.'}
                </p>
              </div>
            </div>
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

export default MSALLogin;
