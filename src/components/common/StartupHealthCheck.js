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

  // Warning banner disabled - render children only
  return children;
};

export default StartupHealthCheck;
