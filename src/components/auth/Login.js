import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { MicrosoftIcon, ShieldCheckIcon } from '../common/Icons';
import { isDemoMode } from '../../config/authConfig';
import toast from 'react-hot-toast';
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setSessionId } from '../../services/convexService';
import { SSOLoginButton } from './SSOLogin';
import {
  SparklesIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Login = () => {
  const { loading, error } = useAuth();
  const { t } = useTranslation();
  const convex = useConvex();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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
      return hasValidConfig;
    } catch (e) {
      return false;
    }
  };
  
  // Check if we're in demo mode
  const demoMode = isDemoMode();
  const isConfigured = hasConfig() || demoMode;

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
        }
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
      
      toast.success('Configuration saved! Signing you in...');
      
      // Determine which auth mode to use based on whether secret is provided
      if (configToSave.clientSecret) {
        // App-Only mode - authenticate directly with client credentials
        console.log('Using App-Only authentication with client secret');
        
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
        
        console.log('✅ App-Only authentication complete, establishing Convex session...');
        
        // Configure Convex backend with credentials
        try {
          // Step 1: Configure credentials in Convex (uses action for encryption)
          console.log('🔧 Configuring credentials with Convex...');
          const configResult = await convex.action(api.auth.configure, {
            clientId: configToSave.clientId,
            tenantId: configToSave.tenantId,
            clientSecret: configToSave.clientSecret,
          });
          
          console.log('✅ Convex credentials configured, session ID:', configResult.sessionId);
          
          // Save session ID for future requests
          setSessionId(configResult.sessionId);
          
          // Step 2: Establish authenticated session (uses action for token validation)
          console.log('🔑 Logging in with app-only mode...');
          await convex.action(api.auth.loginAppOnly, {
            sessionId: configResult.sessionId,
          });
          
          console.log('✅ Convex session established successfully');
        } catch (convexError) {
          console.error('❌ Failed to establish Convex session:', convexError);
          toast.error('Failed to establish session: ' + convexError.message);
          setIsSaving(false);
          return;
        }
        
        // Dispatch event to AuthContext and wait for state update
        const event = new Event('demoModeLogin');
        console.log('📡 Dispatching demoModeLogin event');
        window.dispatchEvent(event);
        
        toast.success('Successfully authenticated! Redirecting to dashboard...');
        
        // Wait for AuthContext to update state via authStateUpdated event
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
        // No client secret - user should use SSO login button instead
        toast.info('Configuration saved! Please use the SSO login button above.');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
      setIsSaving(false);
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
      
      // Check if we already have a session ID
      let existingSessionId = localStorage.getItem('sessionId');
      console.log('🔍 Checking for existing session:', existingSessionId ? 'FOUND' : 'NOT FOUND');
      
      if (!existingSessionId) {
        // Create a new Convex session with encrypted credentials
        console.log('🔧 Creating new Convex session...');
        try {
          const configResult = await convex.action(api.auth.configure, {
            clientId: config.clientId,
            tenantId: config.tenantId,
            clientSecret: config.clientSecret,
          });
          
          console.log('✅ Convex session created:', configResult.sessionId);
          setSessionId(configResult.sessionId);
          existingSessionId = configResult.sessionId;
          
          // Validate session with login
          await convex.action(api.auth.loginAppOnly, {
            sessionId: existingSessionId,
          });
        } catch (convexError) {
          console.error('❌ Failed to establish Convex session:', convexError);
          toast.error('Failed to establish session: ' + convexError.message);
          setIsLoggingIn(false);
          return;
        }
      } else {
        console.log('✅ Using existing session ID:', existingSessionId);
      }
      
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
              
              {/* SSO Login Button - Primary Option */}
              <div className="mb-6">
                <SSOLoginButton 
                  onSuccess={() => {
                    toast.success('Successfully signed in!');
                    navigate('/dashboard');
                  }}
                  onError={(error) => {
                    toast.error('Sign in failed: ' + error.message);
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  🎉 Recommended: Sign in with your Microsoft 365 work account
                </p>
              </div>
              
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or configure manually</span>
                </div>
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
                {/* Azure AD Configuration - For App-Only Mode */}
                <div className="space-y-4 border-2 border-primary-200 dark:border-primary-700 rounded-lg p-5 bg-gradient-to-br from-white to-primary-50 dark:from-gray-800 dark:to-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">App-Only Credentials (Optional)</h3>
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
                      Client Secret <span className="text-gray-500 dark:text-gray-400 text-xs">(Required for App-Only mode)</span>
                    </label>
                    <input
                      type="password"
                      id="clientSecret"
                      name="clientSecret"
                      value={config.clientSecret}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Enter client secret for automated authentication"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 Provide secret for automated/background authentication
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
                        Save & Login (App-Only)
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    💡 Find these in Azure Portal → App Registrations → Your Application
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Quick access</span>
                  </div>
                </div>
                
                {/* Alternative Authentication Options */}
                <div className="grid grid-cols-3 gap-3">
                  {/* SSO Login with Microsoft 365 */}
                  <button
                    onClick={() => {
                      // Trigger SSO login button
                      document.querySelector('button[class*="bg-blue-600"]')?.click();
                    }}
                    className="flex flex-col items-center justify-center p-4 border-2 border-green-200 dark:border-green-700 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all bg-white dark:bg-gray-800"
                    title="Microsoft 365 SSO - Sign in with your work account"
                  >
                    <MicrosoftIcon className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">M365 SSO</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Recommended</span>
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
                
                {/* Info about authentication modes */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>SSO (Recommended):</strong> Sign in with your Microsoft 365 work account</p>
                    <p><strong>App-Only:</strong> Uses client secret for automated operations</p>
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
              </div>
            </div>
            
            <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p>© 2025 Employee Life Cycle Portal</p>
              <p className="mt-1">Powered by Microsoft Graph API & Convex</p>
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
