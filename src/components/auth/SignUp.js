import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp as ClerkSignUp, useAuth } from '@clerk/clerk-react';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';

const SignUp = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const convexAuth = useConvexAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if ((isSignedIn && isLoaded) || convexAuth.isAuthenticated) {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, isLoaded, convexAuth.isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white text-center">
              Create Account
            </h1>
            <p className="text-blue-100 text-center text-sm mt-2">
              Get started with your account
            </p>
          </div>

          {/* Clerk Sign Up Component */}
          <div className="p-8">
            <ClerkSignUp 
              routing="path"
              path="/sign-up"
              signInUrl="/login"
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden"
                }
              }}
            />
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <a 
            href="/login" 
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
