import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure application settings and preferences
        </p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Settings</h3>
          <p className="mt-1 text-gray-500">
            This component will be implemented with application configuration options.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;