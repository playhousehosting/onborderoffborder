import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

const MicrosoftOAuthPrompt = ({ onSuccess }) => {
  const { userId, getToken } = useAuth();
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleAuthorize = async () => {
    try {
      setIsAuthorizing(true);
      
      // Get Clerk token for authentication
      const token = await getToken();
      
      // Get OAuth initiation URL from backend
      const convexUrl = process.env.REACT_APP_CONVEX_URL?.replace('.convex.cloud', '.convex.site');
      const response = await fetch(
        `${convexUrl}/clerk-proxy/oauth/initiate?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Microsoft OAuth consent screen
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('❌ OAuth initiation error:', error);
      toast.error('Failed to initiate Microsoft authorization');
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Microsoft Authorization Required
        </h2>

        {/* Description */}
        <div className="space-y-4 text-gray-600 dark:text-gray-300 mb-6">
          <p className="text-center">
            To access Microsoft Graph API and manage users across your organization, you need to authorize this application.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">1.</span>
                <span>You'll be redirected to Microsoft's secure sign-in page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">2.</span>
                <span>Sign in with your Microsoft 365 administrator account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">3.</span>
                <span>Review and accept the requested permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">4.</span>
                <span>You'll be redirected back to the dashboard</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              📋 Permissions Requested:
            </h4>
            <ul className="text-xs space-y-1">
              <li>• Read and write user profiles</li>
              <li>• Read directory data</li>
              <li>• Read and write directory data</li>
              <li>• Read all groups</li>
              <li>• Manage devices (Intune)</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isAuthorizing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Redirecting to Microsoft...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Authorize Microsoft Access</span>
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          🔒 Secure OAuth 2.0 flow • Your credentials are never shared with this application
        </p>
      </div>
    </div>
  );
};

export default MicrosoftOAuthPrompt;
