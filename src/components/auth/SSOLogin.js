import React from 'react';
import { useAuthActions } from "@convex-dev/auth/react";
import { MicrosoftIcon } from '../common/Icons';

/**
 * Microsoft 365 SSO Login Button
 * Uses Convex Auth for OAuth authentication
 */
export const SSOLoginButton = ({ className = "", onSuccess, onError }) => {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSSOLogin = async () => {
    setIsLoading(true);
    try {
      // Trigger Microsoft OAuth flow via Convex Auth
      await signIn("azure-ad");
      
      // Convex Auth handles the redirect to Microsoft login
      // After successful auth, user will be redirected back to the app
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("SSO login error:", error);
      
      // Provide helpful error message
      let errorMessage = "SSO login failed. ";
      
      if (error.message && error.message.includes("Server Error")) {
        errorMessage += "This usually means the Convex Auth environment variables are not configured. ";
        errorMessage += "Please ensure AUTH_AZURE_AD_ID, AUTH_AZURE_AD_SECRET, and AUTH_AZURE_AD_ISSUER are set in your Convex Dashboard. ";
        errorMessage += "See CONVEX_SSO_CONFIGURATION.md for setup instructions.";
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Please try again or contact support.";
      }
      
      console.error("SSO login error details:", errorMessage);
      
      if (onError) {
        onError(new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSSOLogin}
      disabled={isLoading}
      className={`flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 
        ${isLoading 
          ? 'bg-gray-300 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
        } text-white shadow-lg hover:shadow-xl ${className}`}
    >
      <MicrosoftIcon className="w-6 h-6" />
      <span>
        {isLoading ? 'Signing in...' : 'Sign in with Microsoft 365'}
      </span>
    </button>
  );
};

/**
 * SSO Logout Button
 */
export const SSOLogoutButton = ({ className = "", onSuccess }) => {
  const { signOut } = useAuthActions();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      
      // Clear local session data
      localStorage.removeItem('sessionId');
      localStorage.removeItem('demoUser');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("SSO logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`py-2 px-4 rounded-lg font-medium transition-all duration-200 
        ${isLoading 
          ? 'bg-gray-300 cursor-not-allowed' 
          : 'bg-red-600 hover:bg-red-700 active:scale-95'
        } text-white shadow-md hover:shadow-lg ${className}`}
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
};

export default SSOLoginButton;
