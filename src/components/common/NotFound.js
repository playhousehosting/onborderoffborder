import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Page not found</h2>
          <p className="mt-2 text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="btn btn-primary inline-flex items-center"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Go back home
          </Link>
          
          <div className="text-sm text-gray-500">
            Or contact your administrator if you think this is an error.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
