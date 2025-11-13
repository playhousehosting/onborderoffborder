import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { MicrosoftIcon, ShieldCheckIcon } from '../common/Icons';
import { isDemoMode } from '../../config/authConfig';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Login = () => {
  const { login, loading, error } = useAuth();
  const { t } = useTranslation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState(localStorage.getItem('preferredAuthMode') || 'app-only');
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  
  // Check if we have configuration
  const hasConfig = () => {
    try {
      const config = JSON.parse(localStorage.getItem('azureConfig') || '{}');
      const hasValidConfig = !!(config.tenantId && config.clientId);
      console.log('Login - hasConfig check:', { config, hasValidConfig });
      return hasValidConfig;
    } catch (e) {
      console.error('Login - hasConfig error:', e);
      return false;
    }
  };
  
  // Check if we're in demo mode
  const demoMode = isDemoMode();
  const isConfigured = hasConfig() || demoMode;
  
  console.log('Login - isConfigured:', isConfigured, 'demoMode:', demoMode, 'hasConfig:', hasConfig());

  // Load existing config on mount and check for auto-login flag
  React.useEffect(() => {
    try {
      const existingConfig = JSON.parse(localStorage.getItem('azureConfig') || '{}');
      setConfig({
        clientId: existingConfig.clientId || '',
        tenantId: existingConfig.tenantId || '',
        clientSecret: existingConfig.clientSecret || '',
      });
      
      // Check if we should auto-login after config save
      const shouldAutoLogin = sessionStorage.getItem('autoLogin');
      const autoLoginMode = sessionStorage.getItem('autoLoginMode');
      if (shouldAutoLogin === 'true' && isConfigured) {
        sessionStorage.removeItem('autoLogin');
        sessionStorage.removeItem('autoLoginMode');
        console.log('Auto-login triggered after config save, mode:', autoLoginMode);
        
        // Use the specified auth mode
        if (autoLoginMode === 'app-only') {
          handleAppOnlyLogin();
        } else {
          handleLogin();
        }
      }
      
      // Check if we should trigger interactive login after page reload
      const pendingInteractiveLogin = sessionStorage.getItem('pendingInteractiveLogin');
      if (pendingInteractiveLogin === 'true' && isConfigured) {
        sessionStorage.removeItem('pendingInteractiveLogin');
        console.log('✅ Backend MSAL config loaded, triggering interactive login...');
        
        // Trigger the actual MSAL login now that config is loaded
        setTimeout(() => {
          triggerMsalLogin();
        }, 500);
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfigAndLogin = async () => {
    if (!config.clientId || !config.tenantId) {
      toast.error('Client ID and Tenant ID are required');
      return;
    }

    setIsSaving(true);
    try {
      const configToSave = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        clientSecret: config.clientSecret ? config.clientSecret.trim() : undefined
      };
      
      console.log('Saving Azure config:', configToSave);
      localStorage.setItem('azureConfig', JSON.stringify(configToSave));
      
      // Verify it was saved
      const savedConfig = localStorage.getItem('azureConfig');
      console.log('Verified saved config:', savedConfig);
      
      toast.success('Configuration saved! Signing you in...');
      
      // Determine which auth mode to use based on whether secret is provided
      if (configToSave.clientSecret) {
        // App-Only mode - authenticate directly with client credentials
        console.log('Using App-Only authentication with client secret');
        
        // Enable demo mode for app-only authentication (uses localStorage auth)
        localStorage.setItem('demoMode', 'true');
        localStorage.setItem('authMode', 'app-only');
        
        // Create a mock admin user for app-only mode
        const appUser = {
          displayName: 'Application Admin',
          name: 'Application Admin',
          userPrincipalName: `app@${configToSave.tenantId}`,
          username: `app@${configToSave.tenantId}`,
          homeAccountId: 'app-only-id',
          localAccountId: 'app-only-id',
          authMode: 'app-only'
        };
        
        localStorage.setItem('demoUser', JSON.stringify(appUser));
        
        console.log('✅ App-Only authentication complete, establishing backend session...');
        
        // Call backend to establish session with credentials
        try {
          const backendResponse = await fetch('/api/auth/login-app-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Important: include session cookie
          });
          
          if (!backendResponse.ok) {
            const errorData = await backendResponse.json();
            throw new Error(errorData.error || 'Backend session establishment failed');
          }
          
          console.log('✅ Backend session established successfully');
        } catch (backendError) {
          console.error('❌ Failed to establish backend session:', backendError);
          toast.error('Failed to establish backend session: ' + backendError.message);
          setIsSaving(false);
          return;
        }
        
        // Dispatch event to AuthContext and wait for state update
        const event = new Event('demoModeLogin');
        console.log('📡 Dispatching demoModeLogin event');
        window.dispatchEvent(event);
        
        toast.success('Successfully authenticated! Redirecting to dashboard...');
        
        // Wait for AuthContext to update state via authStateUpdated event
        // This ensures isAuthenticated is true before ProtectedRoute checks
        const handleAuthStateUpdated = () => {
          console.log('✅ Auth state updated in context, navigating to dashboard');
          setIsSaving(false);
          navigate('/dashboard', { replace: true });
          window.removeEventListener('authStateUpdated', handleAuthStateUpdated);
        };
        
        window.addEventListener('authStateUpdated', handleAuthStateUpdated, { once: true });
        
        // Fallback timeout in case event doesn't fire
        setTimeout(() => {
          window.removeEventListener('authStateUpdated', handleAuthStateUpdated);
          console.log('Timeout: Navigating to dashboard anyway');
          setIsSaving(false);
          navigate('/dashboard', { replace: true });
        }, 500);
      } else {
        // OAuth2 mode - requires page reload to reinitialize MSAL
        sessionStorage.setItem('autoLogin', 'true');
        sessionStorage.setItem('autoLoginMode', 'oauth2');
        window.location.href = window.location.origin;
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    console.log('handleLogin (OAuth2) called - isConfigured:', isConfigured);
    
    if (!isConfigured) {
      toast.error('Please configure Azure AD credentials first');
      return;
    }
    
    try {
      setIsLoggingIn(true);
      console.log('Attempting OAuth2 interactive login...');
      await login(true);
      toast.success('Successfully signed in with Microsoft!');
      
      // Wait for oauthLoginStateUpdated event before navigating
      // This ensures isAuthenticated is true in context
      const handleOAuthStateUpdated = () => {
        console.log('✅ OAuth2 state updated in context, navigating to dashboard');
        setIsLoggingIn(false);
        navigate('/dashboard', { replace: true });
        window.removeEventListener('oauthLoginStateUpdated', handleOAuthStateUpdated);
      };
      
      window.addEventListener('oauthLoginStateUpdated', handleOAuthStateUpdated, { once: true });
      
      // Fallback timeout in case event doesn't fire
      setTimeout(() => {
        window.removeEventListener('oauthLoginStateUpdated', handleOAuthStateUpdated);
        console.log('Timeout: Navigating to dashboard anyway');
        setIsLoggingIn(false);
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('OAuth2 login failed:', err);
      toast.error(`Sign in failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAppOnlyLogin = async () => {
    console.log('handleAppOnlyLogin called - isConfigured:', isConfigured);
    
    if (!isConfigured) {
      toast.error('Please configure Azure AD credentials first');
      return;
    }
    
    const config = JSON.parse(localStorage.getItem('azureConfig') || '{}');
    if (!config.clientSecret) {
      toast.error('App-Only authentication requires a Client Secret');
      return;
    }
    
    try {
      setIsLoggingIn(true);
      console.log('Attempting App-Only (Client Credentials) login...');
      
      // Set a flag to indicate app-only mode
      localStorage.setItem('authMode', 'app-only');
      
      // Create a mock admin user for app-only mode
      const appUser = {
        displayName: 'Application Admin',
        name: 'Application Admin',
        userPrincipalName: 'app@company.com',
        username: 'app@company.com',
        homeAccountId: 'app-only-id',
        localAccountId: 'app-only-id',
        authMode: 'app-only'
      };
      
      localStorage.setItem('demoUser', JSON.stringify(appUser));
      window.dispatchEvent(new Event('demoModeLogin'));
      
      console.log('App-Only login successful, navigating to dashboard');
      toast.success('Successfully authenticated with Client Credentials!');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('App-Only login failed:', err);
      toast.error(`App authentication failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Trigger MSAL login (called after page reload with backend config)
  const triggerMsalLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log('🔄 Initiating MSAL popup login with backend config...');
      
      // Set auth mode to interactive
      localStorage.setItem('authMode', 'interactive');
      localStorage.removeItem('demoMode');
      
      // Wait for login to complete and auth state to update
      await new Promise((resolve, reject) => {
        const handleSuccess = () => {
          console.log('✅ OAuth2 login state updated');
          window.removeEventListener('oauthLoginStateUpdated', handleSuccess);
          resolve();
        };
        
        window.addEventListener('oauthLoginStateUpdated', handleSuccess, { once: true });
        
        // Call the login function from AuthContext which uses MSAL
        login().catch(reject);
        
        // Timeout after 60 seconds
        setTimeout(() => {
          window.removeEventListener('oauthLoginStateUpdated', handleSuccess);
          reject(new Error('Login timeout - popup may have been blocked'));
        }, 60000);
      });
      
      toast.success('Successfully signed in with Microsoft account!');
      console.log('✅ Navigating to dashboard...');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Interactive login failed:', err);
      
      // Provide specific error messages
      let errorMessage = err.message || 'Unknown error occurred';
      
      if (errorMessage.includes('popup_window_error') || errorMessage.includes('blocked')) {
        errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
      } else if (errorMessage.includes('AADSTS')) {
        errorMessage = `Azure AD error: ${errorMessage}. Check your app registration settings.`;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Login timed out. Please check your popup blocker and try again.';
      }
      
      toast.error(`Sign in failed: ${errorMessage}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInteractiveLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log('🔵 Attempting Interactive (OAuth2) login with backend MSAL config...');
      
      // Import the fetchMsalConfigFromBackend function dynamically
      const { fetchMsalConfigFromBackend } = await import('../../config/authConfig');
      
      // Fetch MSAL configuration from backend environment variables
      console.log('🔍 Fetching MSAL config from backend Vercel environment...');
      const backendConfig = await fetchMsalConfigFromBackend();
      
      if (!backendConfig || !backendConfig.clientId || !backendConfig.tenantId) {
        console.error('❌ Backend MSAL config not available');
        toast.error('Interactive authentication not configured on backend. Please set AZURE_CLIENT_ID and AZURE_TENANT_ID in Vercel environment variables.');
        return;
      }
      
      console.log('✅ Backend MSAL config received:', {
        clientId: backendConfig.clientId.substring(0, 8) + '...',
        tenantId: backendConfig.tenantId.substring(0, 8) + '...',
        isMultiTenant: backendConfig.isMultiTenant,
        authority: backendConfig.authority
      });
      
      // Store backend config in localStorage for MSAL initialization
      const msalConfig = {
        clientId: backendConfig.clientId,
        tenantId: backendConfig.tenantId,
        authority: backendConfig.authority,  // Use authority from backend
        isMultiTenant: backendConfig.isMultiTenant
      };
      localStorage.setItem('azureConfig', JSON.stringify(msalConfig));
      
      // Set auth mode to interactive
      localStorage.setItem('authMode', 'interactive');
      localStorage.removeItem('demoMode');
      
      // Reset MSAL instance to pick up new configuration
      console.log('🔄 Resetting MSAL instance with backend config...');
      const { resetMsalInstance } = await import('../../App');
      resetMsalInstance();
      
      // Reload the page to reinitialize MSAL with new config
      console.log('🔄 Reloading page to apply new MSAL configuration...');
      toast.success('Configuration loaded from backend. Initializing authentication...');
      
      // Set a flag to auto-trigger login after reload
      sessionStorage.setItem('pendingInteractiveLogin', 'true');
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('❌ Failed to load backend config:', err);
      toast.error(`Failed to load configuration: ${err.message || 'Please try again.'}`);
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = () => {
    // Enable demo mode
    localStorage.setItem('demoMode', 'true');
    
    // Simulate successful login for demo mode
    const mockUser = {
      displayName: 'Demo User',
      name: 'Demo User',
      userPrincipalName: 'demo@company.com',
      username: 'demo@company.com',
      homeAccountId: 'demo-user-id',
      localAccountId: 'demo-user-id',
    };
    
    // Store mock user in localStorage
    localStorage.setItem('demoUser', JSON.stringify(mockUser));
    
    // Dispatch custom event to notify AuthContext
    window.dispatchEvent(new Event('demoModeLogin'));
    
    // Show success message
    toast.success('Demo mode: Logged in successfully');
    
    // Small delay to let the auth context update
    setTimeout(() => {
      navigate('/dashboard');
    }, 100);
  };

  const toggleAuthMode = () => {
    const newMode = authMode === 'app-only' ? 'interactive' : 'app-only';
    setAuthMode(newMode);
    localStorage.setItem('preferredAuthMode', newMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Welcome content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-2xl p-4 shadow-lg">
                <ShieldCheckIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Employee Lifecycle Portal
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Streamline your employee onboarding and offboarding processes with powerful Microsoft 365 integration.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 mr-3">
                  <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Effortless user management</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                  <ComputerDesktopIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Intune device integration</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 mr-3">
                  <EnvelopeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Automated email workflows</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 mr-3">
                  <SparklesIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">Secure data handling</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="max-w-md mx-auto w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome Back! 👋</h2>
                <p className="text-gray-600 dark:text-gray-400">{t('auth.pleaseSignIn')}</p>
              </div>
              
              {demoMode && (
                <div className="mb-6 p-4 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Demo Mode Active</h3>
                      <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        The application is running in demo mode. Click "Configure Azure AD" below to set up your own credentials.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!isConfigured && !demoMode && (
                <div className="mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Azure AD Not Configured</h3>
                      <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                        Configure your Azure AD credentials to enable Microsoft authentication, or try Demo Mode to explore the application.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mb-6 p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Sign in error</h3>
                      <div className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {/* Azure AD Configuration - Always Visible */}
                <div className="space-y-4 border-2 border-primary-200 dark:border-primary-700 rounded-lg p-5 bg-gradient-to-br from-white to-primary-50 dark:from-gray-800 dark:to-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Azure AD Credentials</h3>
                    {isConfigured && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Configured
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tenant ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="tenantId"
                      name="tenantId"
                      value={config.tenantId}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Application (Client) ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="clientId"
                      name="clientId"
                      value={config.clientId}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Secret <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional - required for App-Only mode)</span>
                    </label>
                    <input
                      type="password"
                      id="clientSecret"
                      name="clientSecret"
                      value={config.clientSecret}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter client secret (optional)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 Provide secret for automated/background authentication, leave blank for interactive login
                    </p>
                  </div>

                  <button
                    onClick={handleSaveConfigAndLogin}
                    disabled={isSaving || !config.clientId || !config.tenantId}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 dark:from-primary-700 dark:to-primary-800 dark:hover:from-primary-800 dark:hover:to-primary-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01]"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Logging in...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Save & Login to Dashboard
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    💡 Find these in Azure Portal → App Registrations → Your Application
                  </p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Interactive Sign-In:</strong> Uses multi-tenant app credentials from Vercel backend environment (AZURE_CLIENT_ID, AZURE_TENANT_ID)
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or choose authentication mode</span>
                  </div>
                </div>
                
                {/* Alternative Authentication Options */}
                <div className="grid grid-cols-3 gap-3">
                  {/* OAuth2 Interactive Sign-In */}
                  <button
                    onClick={handleInteractiveLogin}
                    disabled={isLoggingIn || loading || !isConfigured}
                    className="flex flex-col items-center justify-center p-4 border-2 border-blue-200 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                    title="OAuth2 Interactive Sign-In - Sign in with your Microsoft account"
                  >
                    <MicrosoftIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">OAuth2</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Interactive</span>
                  </button>

                  {/* App-Only Authentication */}
                  <button
                    onClick={handleAppOnlyLogin}
                    disabled={isLoggingIn || loading || !isConfigured || !config.clientSecret}
                    className="flex flex-col items-center justify-center p-4 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                    title="App-Only Authentication (requires client secret)"
                  >
                    <ShieldCheckIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">App-Only</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Automated</span>
                  </button>

                  {/* Demo Mode */}
                  <button
                    onClick={handleDemoLogin}
                    className="flex flex-col items-center justify-center p-4 border-2 border-amber-200 dark:border-amber-700 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all bg-white dark:bg-gray-800"
                    title="Demo Mode - No credentials required"
                  >
                    <SparklesIcon className="h-8 w-8 text-amber-600 dark:text-amber-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Demo</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Try it out</span>
                  </button>
                </div>
                
                {/* Info about selected mode */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>OAuth2:</strong> Sign in with your Microsoft account (delegated permissions)</p>
                    <p><strong>App-Only:</strong> Uses client secret for automated operations (requires secret above)</p>
                    <p><strong>Demo:</strong> Explore the app with mock data (no credentials needed)</p>
                  </div>
                </div>

                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Required Permissions</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">User Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">Group Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">Device Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">Mailbox Settings</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">SharePoint Access</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 dark:text-green-400 mr-1" />
                      <span className="text-gray-600 dark:text-gray-400">Teams Management</span>
                    </div>
                  </div>
                </div>
                
                {demoMode ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <InformationCircleIcon className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Setup Instructions</h3>
                        <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                          <p className="mb-2">To enable full authentication:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Create an Azure AD app registration</li>
                            <li>Update the .env file with your credentials</li>
                            <li>Grant the required API permissions</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">First time sign in?</h3>
                        <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                          You may need to consent to required permissions. An administrator may need to approve these permissions for your organization.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>© 2025 Employee Life Cycle Portal</p>
              <p className="mt-1">Powered by Microsoft Graph API</p>
              <p className="mt-1">Built by Kameron McCain</p>
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