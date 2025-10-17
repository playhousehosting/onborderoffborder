import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { graphService } from '../../services/graphService';
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
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    totalDevices: 0,
    recentOnboarding: 0,
    recentOffboarding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Only fetch data if user has permissions
        if (hasPermission('userManagement')) {
          // Get user statistics
          const usersData = await graphService.getUsers(999);
          const totalUsers = usersData.value?.length || 0;
          const activeUsers = usersData.value?.filter(u => u.accountEnabled).length || 0;
          const disabledUsers = totalUsers - activeUsers;
          
          // Get device statistics if user has device management permission
          let totalDevices = 0;
          if (hasPermission('deviceManagement')) {
            try {
              const devicesData = await graphService.makeRequest('/deviceManagement/managedDevices?$top=999');
              totalDevices = devicesData.value?.length || 0;
            } catch (deviceError) {
              console.warn('Could not fetch device data:', deviceError);
            }
          }
          
          setStats({
            totalUsers,
            activeUsers,
            disabledUsers,
            totalDevices,
            recentOnboarding: Math.floor(Math.random() * 5), // Mock data for demo
            recentOffboarding: Math.floor(Math.random() * 3), // Mock data for demo
          });
          
          // Mock recent activity data for demo
          setRecentActivity([
            {
              id: 1,
              type: 'offboarding',
              user: 'John Doe',
              action: 'Account disabled',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              status: 'completed',
            },
            {
              id: 2,
              type: 'onboarding',
              user: 'Jane Smith',
              action: 'Account created',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
              status: 'completed',
            },
            {
              id: 3,
              type: 'device',
              user: 'Bob Johnson',
              action: 'Device wiped',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
              status: 'completed',
            },
            {
              id: 4,
              type: 'offboarding',
              user: 'Alice Brown',
              action: 'Mailbox converted',
              timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
              status: 'in-progress',
            },
          ]);
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.displayName || user?.name}! 👋</h1>
            <p className="text-primary-100 text-lg">
              Ready to streamline your employee lifecycle management today?
            </p>
          </div>
          <div className="hidden lg:block">
            <SparklesIcon className="h-16 w-16 text-primary-200" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <UserGroupIcon className="h-8 w-8 text-white" />
              <span className="text-blue-100 text-sm font-medium">Total</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600 mt-1">Total Users</div>
            <div className="flex items-center mt-3 text-sm text-blue-600">
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              <span>Active directory</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
            <div className="flex items-center justify-between">
              <CheckCircleIcon className="h-8 w-8 text-white" />
              <span className="text-green-100 text-sm font-medium">Active</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600 mt-1">Active Users</div>
            <div className="flex items-center mt-3 text-sm text-green-600">
              <ShieldCheckIcon className="h-4 w-4 mr-1" />
              <span>Currently enabled</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4">
            <div className="flex items-center justify-between">
              <UserMinusIcon className="h-8 w-8 text-white" />
              <span className="text-amber-100 text-sm font-medium">Disabled</span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.disabledUsers}</div>
            <div className="text-sm text-gray-600 mt-1">Disabled Users</div>
            <div className="flex items-center mt-3 text-sm text-amber-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Recently offboarded</span>
            </div>
          </div>
        </div>

        {hasPermission('deviceManagement') && (
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <ComputerDesktopIcon className="h-8 w-8 text-white" />
                <span className="text-purple-100 text-sm font-medium">Devices</span>
              </div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-gray-900">{stats.totalDevices}</div>
              <div className="text-sm text-gray-600 mt-1">Managed Devices</div>
              <div className="flex items-center mt-3 text-sm text-purple-600">
                <CogIcon className="h-4 w-4 mr-1" />
                <span>Intune managed</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What would you like to do today?</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hasPermission('userManagement') && (
            <>
              <Link
                to="/onboarding"
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-200"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 rounded-lg p-3 group-hover:bg-green-200 transition-colors">
                      <UserPlusIcon className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Onboarding</h3>
                  <p className="text-gray-600 mb-4">Set up a new employee with all necessary accounts and resources</p>
                  <div className="flex items-center text-green-600 font-medium">
                    <span>Get started</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                to="/offboarding"
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-red-200"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 rounded-lg p-3 group-hover:bg-red-200 transition-colors">
                      <UserMinusIcon className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Offboarding</h3>
                  <p className="text-gray-600 mb-4">Process departing employee accounts and data securely</p>
                  <div className="flex items-center text-red-600 font-medium">
                    <span>Begin process</span>
                    <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                to="/transfer"
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200 transition-colors">
                      <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Transfer / Promote</h3>
                  <p className="text-gray-600 mb-4">Process role changes, transfers, and promotions</p>
                  <div className="flex items-center text-purple-600 font-medium">
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
            className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200 transition-colors">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Users</h3>
              <p className="text-gray-600 mb-4">Find and manage user accounts across your organization</p>
              <div className="flex items-center text-blue-600 font-medium">
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Scheduled Offboarding</h3>
                <p className="text-gray-600 mb-4">Schedule and manage future employee offboarding processes</p>
                <div className="flex items-center text-amber-600 font-medium">
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
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-purple-200"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200 transition-colors">
                    <ComputerDesktopIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Devices</h3>
                <p className="text-gray-600 mb-4">View and manage Intune devices across your organization</p>
                <div className="flex items-center text-purple-600 font-medium">
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-500">
                              <div className="font-medium text-gray-900">{activity.user}</div>
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
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No recent activity to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;