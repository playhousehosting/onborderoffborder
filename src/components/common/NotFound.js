import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HomeIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-700">{t('errors.errorCode')} 404</h1>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{t('errors.pageNotFound')}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('errors.pageNotFoundMessage')}
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="btn btn-primary inline-flex items-center"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            {t('errors.goHome')}
          </Link>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('errors.pageNotFoundDesc')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
