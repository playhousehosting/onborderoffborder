import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';

/**
 * OAuth Callback Handler
 * Handles the redirect after OAuth authentication completes
 */
const OAuthCallback = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    console.log('🔄 OAuth callback - checking auth state...', { isAuthenticated, loading });
    
    if (!loading) {
      if (isAuthenticated) {
        // Get stored redirect location or default to dashboard
        const redirectTo = sessionStorage.getItem('auth_redirect') || '/dashboard';
        sessionStorage.removeItem('auth_redirect');
        
        console.log('✅ OAuth callback: authenticated, redirecting to:', redirectTo);
        navigate(redirectTo, { replace: true });
      } else {
        console.warn('⚠️ OAuth callback: not authenticated, redirecting to login');
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 dark:text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
