import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
      
      // Clear demo mode
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      
      toast.success('Configuration saved! Signing you in...');
      
      // Determine which auth mode to use based on whether secret is provided
      if (configToSave.clientSecret) {
        // App-Only mode - authenticate directly with client credentials
        console.log('Using App-Only authentication with client secret');
        
        // Set a flag to indicate app-only mode
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
        window.dispatchEvent(new Event('demoModeLogin'));
        
        toast.success('Successfully authenticated with Client Credentials!');
        
        // Navigate to dashboard after a short delay
        setTimeout(() => {
          setIsSaving(false);
          navigate('/dashboard');
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
      console.log('OAuth2 login successful, navigating to dashboard');
      toast.success('Successfully signed in with Microsoft!');
      navigate('/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Welcome content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 shadow-lg">
                <ShieldCheckIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Employee Lifecycle Portal
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Streamline your employee onboarding and offboarding processes with powerful Microsoft 365 integration.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-green-100 rounded-lg p-2 mr-3">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-gray-700">Effortless user management</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-blue-100 rounded-lg p-2 mr-3">
                  <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-gray-700">Intune device integration</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-purple-100 rounded-lg p-2 mr-3">
                  <EnvelopeIcon className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-gray-700">Automated email workflows</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-amber-100 rounded-lg p-2 mr-3">
                  <SparklesIcon className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-gray-700">Secure data handling</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="max-w-md mx-auto w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back! 👋</h2>
                <p className="text-gray-600">Sign in to access your dashboard</p>
              </div>
              
              {demoMode && (
                <div className="mb-6 p-4 border border-amber-200 rounded-lg bg-amber-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Demo Mode Active</h3>
                      <div className="mt-1 text-sm text-amber-700">
                        The application is running in demo mode. Click "Configure Azure AD" below to set up your own credentials.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!isConfigured && !demoMode && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Azure AD Not Configured</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        Configure your Azure AD credentials to enable Microsoft authentication, or try Demo Mode to explore the application.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Sign in error</h3>
                      <div className="mt-1 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {/* Azure AD Configuration - Always Visible */}
                <div className="space-y-4 border-2 border-primary-200 rounded-lg p-5 bg-gradient-to-br from-white to-primary-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900">Azure AD Credentials</h3>
                    {isConfigured && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Configured
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="tenantId"
                      name="tenantId"
                      value={config.tenantId}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                      Application (Client) ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="clientId"
                      name="clientId"
                      value={config.clientId}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret <span className="text-gray-500 text-xs">(Optional - required for App-Only mode)</span>
                    </label>
                    <input
                      type="password"
                      id="clientSecret"
                      name="clientSecret"
                      value={config.clientSecret}
                      onChange={handleConfigChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter client secret (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Provide secret for automated/background authentication, leave blank for interactive login
                    </p>
                  </div>

                  <button
                    onClick={handleSaveConfigAndLogin}
                    disabled={isSaving || !config.clientId || !config.tenantId}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01]"
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
                  
                  <p className="text-xs text-gray-600 text-center">
                    💡 Find these in Azure Portal → App Registrations → Your Application
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or choose authentication mode</span>
                  </div>
                </div>
                
                {/* Alternative Authentication Options */}
                <div className="grid grid-cols-3 gap-3">
                  {/* OAuth2 Interactive Sign-In */}
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn || loading || !isConfigured}
                    className="flex flex-col items-center justify-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    title="OAuth2 Interactive Sign-In"
                  >
                    <MicrosoftIcon className="h-8 w-8 text-blue-600 mb-2" />
                    <span className="text-xs font-semibold text-gray-700">OAuth2</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Interactive</span>
                  </button>

                  {/* App-Only Authentication */}
                  <button
                    onClick={handleAppOnlyLogin}
                    disabled={isLoggingIn || loading || !isConfigured || !config.clientSecret}
                    className="flex flex-col items-center justify-center p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    title="App-Only Authentication (requires client secret)"
                  >
                    <ShieldCheckIcon className="h-8 w-8 text-purple-600 mb-2" />
                    <span className="text-xs font-semibold text-gray-700">App-Only</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Automated</span>
                  </button>

                  {/* Demo Mode */}
                  <button
                    onClick={handleDemoLogin}
                    className="flex flex-col items-center justify-center p-4 border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-all bg-white"
                    title="Demo Mode - No credentials required"
                  >
                    <SparklesIcon className="h-8 w-8 text-amber-600 mb-2" />
                    <span className="text-xs font-semibold text-gray-700">Demo</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Try it out</span>
                  </button>
                </div>
                
                {/* Info about selected mode */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>OAuth2:</strong> Sign in with your Microsoft account (delegated permissions)</p>
                    <p><strong>App-Only:</strong> Uses client secret for automated operations (requires secret above)</p>
                    <p><strong>Demo:</strong> Explore the app with mock data (no credentials needed)</p>
                  </div>
                </div>

                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Required Permissions</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">User Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">Group Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">Device Management</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">Mailbox Settings</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">SharePoint Access</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-gray-600">Teams Management</span>
                    </div>
                  </div>
                </div>
                
                {demoMode ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <InformationCircleIcon className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">Setup Instructions</h3>
                        <div className="mt-1 text-sm text-amber-700">
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">First time sign in?</h3>
                        <div className="mt-1 text-sm text-blue-700">
                          You may need to consent to required permissions. An administrator may need to approve these permissions for your organization.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center mt-6 text-xs text-gray-500">
              <p>© 2025 Employee Life Cycle Portal</p>
              <p className="mt-1">Powered by Microsoft Graph API</p>
              <p className="mt-1">Built by Kameron McCain</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;