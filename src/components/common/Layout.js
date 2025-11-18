import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import {
  HomeIcon,
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  CogIcon,
  ComputerDesktopIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  CalendarIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon, current: location.pathname === '/dashboard' },
    { name: t('nav.userSearch'), href: '/users', icon: UserGroupIcon, current: location.pathname.startsWith('/users') },
    {
      name: t('nav.onboarding'),
      href: '/onboarding',
      icon: UserPlusIcon,
      current: location.pathname.startsWith('/onboarding'),
      permission: 'userManagement'
    },
    {
      name: t('nav.offboarding'),
      href: '/offboarding',
      icon: UserMinusIcon,
      current: location.pathname.startsWith('/offboarding') && location.pathname !== '/scheduled-offboarding',
      permission: 'userManagement'
    },
    {
      name: t('nav.scheduledOffboarding'),
      href: '/scheduled-offboarding',
      icon: CalendarIcon,
      current: location.pathname === '/scheduled-offboarding',
      permission: 'userManagement'
    },
    {
      name: t('nav.workflows'),
      href: '/workflows',
      icon: ArrowPathIcon,
      current: location.pathname === '/workflows',
      permission: 'userManagement'
    },
    {
      name: t('nav.deviceManagement'),
      href: '/intune',
      icon: ComputerDesktopIcon,
      current: location.pathname === '/intune',
      permission: 'deviceManagement'
    },
    {
      name: t('nav.complianceManagement'),
      href: '/compliance',
      icon: ShieldCheckIcon,
      current: location.pathname === '/compliance',
      permission: 'complianceManagement'
    },
    {
      name: t('nav.teamsManagement'),
      href: '/teams',
      icon: ChatBubbleLeftRightIcon,
      current: location.pathname === '/teams',
      permission: 'teamsManagement'
    },
    {
      name: t('nav.defenderManagement'),
      href: '/defender',
      icon: ShieldCheckIcon,
      current: location.pathname === '/defender',
      permission: 'defenderManagement'
    },
    { name: t('nav.faq'), href: '/faq', icon: QuestionMarkCircleIcon, current: location.pathname === '/faq' },
    { name: 'Help Center', href: '/help', icon: SparklesIcon, current: location.pathname === '/help' },
    { name: t('nav.settings'), href: '/settings', icon: CogIcon, current: location.pathname === '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <Sidebar navigation={filteredNavigation} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar navigation={filteredNavigation} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:border-none">
          <button
            type="button"
            className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          {/* Search bar could go here */}
          <div className="flex-1 px-4 flex justify-between sm:px-6 lg:max-w-6xl lg:mx-auto lg:px-8">
            <div className="flex-1 flex"></div>
            <div className="ml-4 flex items-center md:ml-6 gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Language Selector */}
              <LanguageSelector />
              
              {/* User dropdown */}
              <div className="ml-3 relative">
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.displayName || user?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user?.userPrincipalName || user?.username}</div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.displayName?.charAt(0) || user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded-full text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    title="Sign out"
                  >
                    <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const Sidebar = ({ navigation }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <h1 className="ml-2 text-xl font-bold text-gray-900 dark:text-gray-100">{t('nav.appTitle')}</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                item.current
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-6 w-6 ${
                  item.current ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
