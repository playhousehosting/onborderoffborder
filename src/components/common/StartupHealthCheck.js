import React, { useEffect, useState } from 'react';
import { isDemoMode } from '../../config/authConfig';

/**
 * StartupHealthCheck component performs initialization checks
 * and provides user feedback if something is wrong
 * Now NON-BLOCKING - shows warnings but always renders the app
 */
const StartupHealthCheck = ({ children, onHealthy }) => {
  const [status, setStatus] = useState('checking');
  const [issues, setIssues] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const performHealthCheck = async () => {
      const foundIssues = [];
      const foundSuggestions = [];

      try {
        // Check 1: Verify root element exists
        if (!document.getElementById('root')) {
          foundIssues.push('Root element missing from DOM');
        }

        // Check 2: Verify localStorage is accessible
        try {
          localStorage.setItem('health_check', 'test');
          localStorage.removeItem('health_check');
        } catch (e) {
          foundIssues.push('localStorage is not accessible (required for auth)');
          foundSuggestions.push('Enable cookies and local storage in your browser');
        }

        // Check 3: Check configuration (non-blocking)
        const demoMode = isDemoMode();
        if (!demoMode) {
          const config = localStorage.getItem('azureConfig');
          if (!config) {
            foundIssues.push('No Azure configuration found');
            foundSuggestions.push('Configure Azure AD credentials or enable demo mode');
          } else {
            try {
              const parsed = JSON.parse(config);
              if (!parsed.clientId || !parsed.tenantId) {
                foundIssues.push('Incomplete Azure configuration');
                foundSuggestions.push('Complete the Azure AD configuration');
              }
            } catch (e) {
              foundIssues.push('Corrupted Azure configuration');
              foundSuggestions.push('Reconfigure Azure AD settings');
            }
          }
        }

        // Check 4: Verify fetch API is available
        if (typeof fetch === 'undefined') {
          foundIssues.push('Fetch API not available');
          foundSuggestions.push('Update your browser to a modern version');
        }

        setIssues(foundIssues);
        setSuggestions(foundSuggestions);

        if (foundIssues.length === 0) {
          setStatus('healthy');
          if (onHealthy) onHealthy();
        } else {
          setStatus('warning'); // Changed from 'unhealthy' to 'warning'
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setStatus('warning'); // Changed from 'error' to 'warning'
        foundIssues.push(`Health check failed: ${error.message}`);
        setIssues(foundIssues);
      }
    };

    performHealthCheck();
  }, [onHealthy]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Starting application...</h2>
          <p className="text-gray-600">Performing system checks</p>
        </div>
      </div>
    );
  }

  // Show dismissible warning banner if there are issues, but ALWAYS render children
  const warningBanner = (status === 'warning' && issues.length > 0 && !dismissed) ? (
    <div className="bg-yellow-50 border-b-2 border-yellow-400 p-4 shadow-md">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <svg className="h-6 w-6 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-gray-800">Configuration Issues Detected</h3>
              <button
                onClick={() => setDismissed(true)}
                className="ml-auto text-gray-500 hover:text-gray-700"
                title="Dismiss"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="ml-9 space-y-2">
              {issues.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Issues:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">💡 Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    localStorage.setItem('demoMode', 'true');
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors font-medium"
                >
                  ✓ Enable Demo Mode
                </button>
                <button
                  onClick={() => window.location.href = '/configure'}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  ⚙️ Configure Azure AD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ALWAYS render children with optional warning banner
  return (
    <>
      {warningBanner}
      {children}
    </>
  );
};

export default StartupHealthCheck;
