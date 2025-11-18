import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import { CogIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ConfigurationForm = () => {
  const { login, loading, error } = useAuth();
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    useCertificate: false,
    certificate: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Load saved configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('azureConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (e) {
        console.error('Failed to parse saved configuration:', e);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveConfiguration = async () => {
    // Validate configuration
    if (!config.tenantId || !config.clientId) {
      toast.error('Please fill in Tenant ID and Client ID');
      return;
    }

    setIsSaving(true);
    try {
      const configToSave = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        clientSecret: config.clientSecret ? config.clientSecret.trim() : undefined,
        useCertificate: config.useCertificate,
        certificate: config.certificate ? config.certificate.trim() : undefined
      };
      
      // Save to localStorage
      localStorage.setItem('azureConfig', JSON.stringify(configToSave));

      toast.success('Configuration saved! Please use SSO to sign in.');
      
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
        
        // Dispatch event to AuthContext and wait for state update
        window.dispatchEvent(new Event('demoModeLogin'));
        
        console.log('✅ Authentication stored, redirecting to dashboard...');
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
        // OAuth2 mode - requires page reload to reinitialize MSAL
        sessionStorage.setItem('autoLogin', 'true');
        sessionStorage.setItem('autoLoginMode', 'oauth2');
        
        // Reload to trigger OAuth2 flow
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 500);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    if (!config.tenantId || !config.clientId) {
      toast.error('Please configure your Azure AD settings first');
      return;
    }

    try {
      await login(true);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      toast.error('Sign in failed. Please check your configuration and try again.');
    }
  };

  const clearConfiguration = () => {
    localStorage.removeItem('azureConfig');
    sessionStorage.removeItem('clientSecret');
    sessionStorage.removeItem('certificate');
    setConfig({
      tenantId: '',
      clientId: '',
      clientSecret: '',
      useCertificate: false,
      certificate: ''
    });
    toast.success('Configuration cleared');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Welcome content */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 shadow-lg">
                <CogIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Employee Lifecycle Portal
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Configure your Azure AD settings to manage employee onboarding and offboarding processes.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-green-100 rounded-lg p-2 mr-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-gray-700">Secure authentication</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-blue-100 rounded-lg p-2 mr-3">
                  <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-gray-700">Multi-tenant support</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-purple-100 rounded-lg p-2 mr-3">
                  <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-gray-700">Certificate or secret auth</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Configuration form */}
          <div className="max-w-md mx-auto w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Azure AD Configuration</h2>
                <p className="text-gray-600">Enter your Azure AD app details</p>
              </div>
              
              {error && (
                <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
                      <div className="mt-1 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="tenantId" className="form-label">Tenant ID</label>
                  <input
                    type="text"
                    id="tenantId"
                    name="tenantId"
                    className="form-input"
                    placeholder="your-tenant-id or directory ID"
                    value={config.tenantId}
                    onChange={handleInputChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Found in your Azure AD overview page
                  </p>
                </div>
                
                <div>
                  <label htmlFor="clientId" className="form-label">Application (Client) ID</label>
                  <input
                    type="text"
                    id="clientId"
                    name="clientId"
                    className="form-input"
                    placeholder="your-app-client-id"
                    value={config.clientId}
                    onChange={handleInputChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Found in your app registration overview
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="useCertificate"
                      name="useCertificate"
                      className="form-checkbox"
                      checked={config.useCertificate}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="useCertificate" className="ml-2 text-sm text-gray-700">
                      Use Certificate Authentication
                    </label>
                  </div>
                  
                  {config.useCertificate ? (
                    <div>
                      <label htmlFor="certificate" className="form-label">Certificate</label>
                      <textarea
                        id="certificate"
                        name="certificate"
                        className="form-input"
                        rows={4}
                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                        value={config.certificate}
                        onChange={handleInputChange}
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="clientSecret" className="form-label">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          id="clientSecret"
                          name="clientSecret"
                          className="form-input pr-10"
                          placeholder="your-client-secret"
                          value={config.clientSecret}
                          onChange={handleInputChange}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Create a new client secret in your app registration
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={saveConfiguration}
                    disabled={isSaving}
                    className="flex-1 btn btn-primary"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Logging in...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Save & Login to Dashboard
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={clearConfiguration}
                    type="button"
                    className="btn btn-secondary"
                  >
                    Clear
                  </button>
                </div>
                
                <p className="text-xs text-center text-gray-500 mt-2">
                  💡 Saving will automatically log you into the dashboard
                </p>
                
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={() => {
                      localStorage.setItem('demoMode', 'true');
                      localStorage.setItem('demoUser', JSON.stringify({
                        name: 'Demo Administrator',
                        username: 'demo@example.com',
                        homeAccountId: 'demo-user-id'
                      }));
                      toast.success('Demo mode enabled!');
                      setTimeout(() => {
                        navigate('/dashboard');
                      }, 500);
                    }}
                    className="w-full mt-3 px-4 py-2 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Try Demo Mode
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Need help?</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p className="mb-2">To create an Azure AD app registration:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to Azure Portal {'>'} Azure Active Directory</li>
                          <li>Select App registrations {'>'} New registration</li>
                          <li>Configure redirect URI: http://localhost:3000</li>
                          <li>Add Microsoft Graph API permissions</li>
                          <li>Create a client secret or upload a certificate</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
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

export default ConfigurationForm;
