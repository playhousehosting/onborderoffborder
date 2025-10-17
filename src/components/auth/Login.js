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
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const Login = () => {
  const { login, loading, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
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
      return !!(config.tenantId && config.clientId);
    } catch (e) {
      return false;
    }
  };
  
  // Check if we're in demo mode
  const demoMode = isDemoMode();
  const isConfigured = hasConfig() || demoMode;

  // Load existing config on mount
  React.useEffect(() => {
    try {
      const existingConfig = JSON.parse(localStorage.getItem('azureConfig') || '{}');
      setConfig({
        clientId: existingConfig.clientId || '',
        tenantId: existingConfig.tenantId || '',
        clientSecret: existingConfig.clientSecret || '',
      });
    } catch (e) {
      console.error('Error loading config:', e);
    }
  }, []);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    if (!config.clientId || !config.tenantId) {
      toast.error('Client ID and Tenant ID are required');
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem('azureConfig', JSON.stringify(config));
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demoUser');
      toast.success('Configuration saved! Please refresh the page to sign in.');
      setShowConfigForm(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login(true);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      toast.error('Sign in failed. Please try again.');
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
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-6">
                    This portal requires administrator privileges to manage user lifecycle and device operations.
                  </p>
                </div>
                
                {/* Demo Mode Button */}
                <button
                  onClick={handleDemoLogin}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Try Demo Mode
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>
                
                {/* Sign in with Microsoft Button */}
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn || loading || !isConfigured}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {isLoggingIn || loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <MicrosoftIcon className="h-5 w-5 mr-2" />
                      {isConfigured ? 'Sign in with Microsoft' : 'Configure Azure AD First'}
                    </>
                  )}
                </button>
                
                {/* Configure Azure AD Section */}
                {!isConfigured && (
                  <div className="border-2 border-primary-200 rounded-lg p-4 bg-primary-50">
                    <button
                      onClick={() => setShowConfigForm(!showConfigForm)}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium text-primary-900">
                          {showConfigForm ? 'Hide Configuration' : 'Configure Azure AD'}
                        </span>
                      </div>
                      <svg 
                        className={`h-5 w-5 text-primary-600 transition-transform ${showConfigForm ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showConfigForm && (
                      <div className="mt-4 space-y-4 animate-in">
                        <div>
                          <label htmlFor="clientId" className="block text-xs font-medium text-gray-700 mb-1">
                            Client ID (Application ID) *
                          </label>
                          <input
                            type="text"
                            id="clientId"
                            name="clientId"
                            value={config.clientId}
                            onChange={handleConfigChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </div>

                        <div>
                          <label htmlFor="tenantId" className="block text-xs font-medium text-gray-700 mb-1">
                            Tenant ID (Directory ID) *
                          </label>
                          <input
                            type="text"
                            id="tenantId"
                            name="tenantId"
                            value={config.tenantId}
                            onChange={handleConfigChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </div>

                        <div>
                          <label htmlFor="clientSecret" className="block text-xs font-medium text-gray-700 mb-1">
                            Client Secret (Optional)
                          </label>
                          <input
                            type="password"
                            id="clientSecret"
                            name="clientSecret"
                            value={config.clientSecret}
                            onChange={handleConfigChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter client secret"
                          />
                        </div>

                        <button
                          onClick={handleSaveConfig}
                          disabled={isSaving || !config.clientId || !config.tenantId}
                          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Save Configuration
                            </>
                          )}
                        </button>

                        <p className="text-xs text-gray-600">
                          💡 Find these in Azure Portal → App Registrations → Your App
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show config status */}
                {isConfigured && !demoMode && (
                  <div className="text-center">
                    <button
                      onClick={() => navigate('/configure')}
                      className="text-sm text-primary-600 hover:text-primary-700 underline"
                    >
                      Update Configuration
                    </button>
                  </div>
                )}
                
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
              <p>© 2023 Employee Offboarding Portal</p>
              <p className="mt-1">Powered by Microsoft Graph API</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;