import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useTranslation } from 'react-i18next';
import msalGraphService from '../../services/msalGraphService';
import { logger } from '../../utils/logger';
import { SkeletonDashboard } from '../common/Skeleton';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  CogIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, hasPermission, getAccessToken } = useMSALAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    totalDevices: 0,
    compliantDevices: 0,
    nonCompliantDevices: 0,
    recentOnboarding: 0,
    recentOffboarding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  // Set up MSAL graph service with token function
  useEffect(() => {
    msalGraphService.setGetTokenFunction(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Use MSAL graph service
        const service = msalGraphService;
        
        // Only fetch data if user has permissions
        if (hasPermission('userManagement')) {
          // Get ALL user statistics using pagination
          logger.debug('📊 Fetching all users with pagination...');
          const usersData = await service.getAllUsers({ top: 999 }); // Fetch 999 per page for better performance
          const totalUsers = usersData.value?.length || 0;
          const activeUsers = usersData.value?.filter(u => u.accountEnabled).length || 0;
          const disabledUsers = totalUsers - activeUsers;
          
          logger.success(`✅ Loaded ${totalUsers} total users (${activeUsers} active, ${disabledUsers} disabled)`);
          
          // Get device statistics if user has device management permission
          let totalDevices = 0;
          let compliantDevices = 0;
          let nonCompliantDevices = 0;
          
          if (hasPermission('deviceManagement')) {
            try {
              const devicesData = await service.makeRequest('/deviceManagement/managedDevices?$top=999&$select=id,deviceName,complianceState');
              totalDevices = devicesData.value?.length || 0;
              
              // Count compliant and non-compliant devices
              if (devicesData.value) {
                compliantDevices = devicesData.value.filter(d => d.complianceState === 'compliant').length;
                nonCompliantDevices = devicesData.value.filter(d => 
                  d.complianceState === 'noncompliant' || 
                  d.complianceState === 'nonCompliant'
                ).length;
              }
              
              logger.debug(`📱 Device Stats: ${totalDevices} total, ${compliantDevices} compliant, ${nonCompliantDevices} non-compliant`);
            } catch (deviceError) {
              logger.warn('Could not fetch device data:', deviceError);
            }
          }
          
          // Fetch real audit logs from Graph API
          let auditActivity = [];
          try {
            // Get directory audit logs (user creation, password changes, etc.)
            // Note: directoryAudits endpoint doesn't support $orderby, results are returned in descending order by default
            const auditLogs = await service.makeRequest('/auditLogs/directoryAudits?$top=50');
            
            if (auditLogs.value && auditLogs.value.length > 0) {
              auditActivity = auditLogs.value.slice(0, 10).map((log, idx) => {
                let type = 'device';
                let action = log.result;
                
                // Determine activity type based on operation name
                if (log.operationName) {
                  if (log.operationName.includes('Create') || log.operationName.includes('User Add')) {
                    type = 'onboarding';
                    action = 'Account created';
                  } else if (log.operationName.includes('Delete') || log.operationName.includes('Disable')) {
                    type = 'offboarding';
                    action = 'Account disabled';
                  } else if (log.operationName.includes('Password')) {
                    action = 'Password changed';
                  } else if (log.operationName.includes('Update')) {
                    action = 'Account updated';
                  }
                }
                
                return {
                  id: idx + 1,
                  type: type,
                  user: log.targetResources?.[0]?.displayName || log.userPrincipalName || 'Unknown User',
                  action: action,
                  timestamp: new Date(log.createdDateTime),
                  status: log.result === 'Success' ? 'completed' : 'failed',
                };
              });
            }
          } catch (auditError) {
            console.warn('Could not fetch audit logs, using fallback:', auditError);
          }
          
          // Calculate real onboarding/offboarding counts
          const recentOnboarding = auditActivity.filter(a => a.type === 'onboarding' && a.status === 'completed').length;
          const recentOffboarding = auditActivity.filter(a => a.type === 'offboarding' && a.status === 'completed').length;
          
          setStats({
            totalUsers,
            activeUsers,
            disabledUsers,
            totalDevices,
            compliantDevices,
            nonCompliantDevices,
            recentOnboarding,
            recentOffboarding,
          });
          
          setRecentActivity(auditActivity);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [hasPermission]);

  // No OAuth callback checking needed with MSAL
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    if (!oauthSuccess) return;
    const oauthError = searchParams.get('oauth_error');
    const errorDetails = searchParams.get('details') || searchParams.get('oauth_error_description');

    if (oauthSuccess) {
      toast.success('✅ Microsoft authorization successful! Reloading dashboard...');
      // Remove query params and reload
      window.history.replaceState({}, '', '/dashboard');
      window.location.reload();
    } else if (oauthError) {
      toast.error(`OAuth Error: ${oauthError}${errorDetails ? ` - ${errorDetails}` : ''}`);
      // Remove query params
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'onboarding':
        return <UserPlusIcon className="h-5 w-5 text-success-500" />;
      case 'offboarding':
        return <UserMinusIcon className="h-5 w-5 text-danger-500" />;
      case 'device':
        return <ComputerDesktopIcon className="h-5 w-5 text-warning-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-success-500" />;
      case 'in-progress':
        return <ClockIcon className="h-4 w-4 text-warning-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-4 w-4 text-danger-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      <div className="animate-in">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-500 via-blue-500 to-purple-600 dark:from-primary-600 dark:via-blue-600 dark:to-purple-700 rounded-2xl p-8 mb-8 text-white shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold">{t('dashboard.welcomeBack')}, {user?.displayName || user?.name}! 👋</h1>
            </div>
            <p className="text-blue-50 text-xl font-medium mb-2">
              🌍 Managing your global workforce has never been easier
            </p>
            <p className="text-primary-100 dark:text-primary-200 text-base">
              Your command center for employee lifecycle management • Available 24/7 worldwide
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20">
              <SparklesIcon className="h-20 w-20 text-white animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips Banner */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border-2 border-green-200 dark:border-green-700 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
              💡 Pro Tips for Global Admins
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800 dark:text-green-200">
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span><strong>Help Center:</strong> Access comprehensive guides in the sidebar</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span><strong>Quick Actions:</strong> Streamline workflows with one-click access</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span><strong>Audit Logs:</strong> Track all changes in real-time below</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">•</span>
                <span><strong>24/7 Access:</strong> Manage your team from anywhere, anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="h-6 w-6 text-blue-500" />
          Organization Overview
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-4">
            <div className="flex items-center justify-between">
              <UserGroupIcon className="h-8 w-8 text-white" />
              <span className="text-blue-100 dark:text-blue-200 text-sm font-medium">Total</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('dashboard.totalUsers')}</div>
            <div className="flex items-center mt-3 text-sm text-blue-600 dark:text-blue-400">
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              <span>Active directory</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-4">
            <div className="flex items-center justify-between">
              <CheckCircleIcon className="h-8 w-8 text-white" />
              <span className="text-green-100 dark:text-green-200 text-sm font-medium">Active</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Users</div>
            <div className="flex items-center mt-3 text-sm text-green-600 dark:text-green-400">
              <ShieldCheckIcon className="h-4 w-4 mr-1" />
              <span>Currently enabled</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 p-4">
            <div className="flex items-center justify-between">
              <UserMinusIcon className="h-8 w-8 text-white" />
              <span className="text-amber-100 dark:text-amber-200 text-sm font-medium">Disabled</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.disabledUsers}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Disabled Users</div>
            <div className="flex items-center mt-3 text-sm text-amber-600 dark:text-amber-400">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Recently offboarded</span>
            </div>
          </div>
        </div>

        {hasPermission('deviceManagement') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-4">
              <div className="flex items-center justify-between">
                <ComputerDesktopIcon className="h-8 w-8 text-white" />
                <span className="text-purple-100 dark:text-purple-200 text-sm font-medium">Devices</span>
              </div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalDevices}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('dashboard.activeDevices')}</div>
              <div className="flex flex-col gap-2 mt-3 text-sm">
                <div className="flex items-center text-success-600 dark:text-success-400">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  <span>{stats.compliantDevices} Compliant</span>
                </div>
                {stats.nonCompliantDevices > 0 && (
                  <div className="flex items-center text-danger-600 dark:text-danger-400">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    <span>{stats.nonCompliantDevices} Non-Compliant</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <svg className="h-7 w-7 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('dashboard.quickActions')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose an action to get started with your workflow</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hasPermission('userManagement') && (
            <>
              <Link
                to="/onboarding"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-700"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                      <UserPlusIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Start Onboarding</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Set up a new employee with all necessary accounts and resources</p>
                  <div className="flex items-center text-green-600 dark:text-green-400 font-medium">
                    <span>Get started</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                to="/offboarding"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-700"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 transition-colors">
                      <UserMinusIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Start Offboarding</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Process departing employee accounts and data securely</p>
                  <div className="flex items-center text-red-600 dark:text-red-400 font-medium">
                    <span>Begin process</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                to="/transfer"
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                      <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Transfer / Promote</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Process role changes, transfers, and promotions</p>
                  <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
                    <span>Start transfer</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </>
          )}

          <Link
            to="/users"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Search Users</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Find and manage user accounts across your organization</p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                <span>Browse users</span>
                <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {hasPermission('userManagement') && (
            <Link
              to="/scheduled-offboarding"
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-amber-200"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-amber-100 rounded-lg p-3 group-hover:bg-amber-200 transition-colors">
                    <CalendarIcon className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Scheduled Offboarding</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Schedule and manage future employee offboarding processes</p>
                <div className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                  <span>View schedule</span>
                  <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
          
          {hasPermission('deviceManagement') && (
            <Link
              to="/devices"
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-700"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                    <ComputerDesktopIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Manage Devices</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">View and manage Intune devices across your organization</p>
                <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium">
                  <span>View devices</span>
                  <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ClockIcon className="h-7 w-7 text-blue-500" />
              {t('dashboard.recentActivity')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Live updates from your organization's activity log</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <div className="font-medium text-gray-900 dark:text-gray-100">{activity.user}</div>
                              <div className="mt-0.5">
                                {activity.action}
                                <span className="mx-1">•</span>
                                {formatTimestamp(activity.timestamp)}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 self-center">
                            {getStatusIcon(activity.status)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ClockIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p>{t('dashboard.noRecentActivity')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Dashboard;
