import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { graphService } from '../../services/graphService';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import toast from 'react-hot-toast';
import {
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  CalendarIcon,
  ComputerDesktopIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const UserDetail = () => {
  const { userId } = useParams();
  const { hasPermission } = useAuth();
  const [user, setUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [userDevices, setUserDevices] = useState([]);
  const [userLicenses, setUserLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userData = await graphService.getUserById(userId);
      setUser(userData);
      
      // Fetch user groups
      try {
        const groupsData = await graphService.getUserGroups(userId);
        setUserGroups(groupsData.value || []);
      } catch (error) {
        console.warn('Could not fetch user groups:', error);
      }
      
      // Fetch user devices if user has device management permission
      if (hasPermission('deviceManagement')) {
        try {
          const devicesData = await graphService.getUserDevices(userData.userPrincipalName);
          setUserDevices(devicesData.value || []);
        } catch (error) {
          console.warn('Could not fetch user devices:', error);
        }
      }
      
      // Fetch user licenses
      try {
        const licensesData = await graphService.getUserLicenses(userId);
        setUserLicenses(licensesData || []);
      } catch (error) {
        console.warn('Could not fetch user licenses:', error);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (user) => {
    if (user.accountEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
          Disabled
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  const getDeviceStatusBadge = (complianceState) => {
    switch (complianceState) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            Compliant
          </span>
        );
      case 'noncompliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
            Non-compliant
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            Unknown
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">User not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The user you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link to="/users" className="mt-4 btn btn-primary">
          Back to User Search
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link to="/users" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
        </div>
      </div>

      {/* User Info Card */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-16 w-16">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="h-10 w-10 text-primary-600" />
                </div>
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-bold text-gray-900">{user.displayName}</h2>
                <p className="text-sm text-gray-500">{user.mail || user.userPrincipalName}</p>
                <div className="mt-2">{getStatusBadge(user)}</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {hasPermission('userManagement') && (
                <>
                  {user.accountEnabled ? (
                    <Link
                      to={`/offboarding/${user.id}`}
                      className="btn btn-danger"
                    >
                      <UserMinusIcon className="h-4 w-4 mr-2" />
                      Start Offboarding
                    </Link>
                  ) : (
                    <Link
                      to={`/onboarding/${user.id}`}
                      className="btn btn-success"
                    >
                      <UserPlusIcon className="h-4 w-4 mr-2" />
                      Start Onboarding
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'groups', 'devices', 'licenses'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              </div>
              <div className="card-body">
                <dl className="space-y-4">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{user.mail || user.userPrincipalName}</dd>
                    </div>
                  </div>
                  
                  {user.businessPhones && user.businessPhones.length > 0 && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{user.businessPhones[0]}</dd>
                      </div>
                    </div>
                  )}
                  
                  {user.mobilePhone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Mobile</dt>
                        <dd className="text-sm text-gray-900">{user.mobilePhone}</dd>
                      </div>
                    </div>
                  )}
                  
                  {user.officeLocation && (
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Office</dt>
                        <dd className="text-sm text-gray-900">{user.officeLocation}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Organization</h3>
              </div>
              <div className="card-body">
                <dl className="space-y-4">
                  <div className="flex items-center">
                    <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                      <dd className="text-sm text-gray-900">{user.jobTitle || '—'}</dd>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Department</dt>
                      <dd className="text-sm text-gray-900">{user.department || '—'}</dd>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Company</dt>
                      <dd className="text-sm text-gray-900">{user.companyName || '—'}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              </div>
              <div className="card-body">
                <dl className="space-y-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{formatDate(user.createdDateTime)}</dd>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Password Change</dt>
                      <dd className="text-sm text-gray-900">{formatDate(user.lastPasswordChangeDateTime)}</dd>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                      <dd className="text-sm text-gray-900">{user.accountEnabled ? 'Enabled' : 'Disabled'}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Group Memberships</h3>
            </div>
            <div className="card-body">
              {userGroups.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Group Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userGroups.map((group) => (
                        <tr key={group.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {group.displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {group.groupTypes?.includes('Unified') ? 'Microsoft 365' : 'Security'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No group memberships</h3>
                  <p className="mt-1 text-sm text-gray-500">This user is not a member of any groups.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Managed Devices</h3>
            </div>
            <div className="card-body">
              {userDevices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Device Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          OS
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Sync
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userDevices.map((device) => (
                        <tr key={device.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {device.deviceName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.manufacturer} {device.model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {device.operatingSystem} {device.osVersion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getDeviceStatusBadge(device.complianceState)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(device.lastSyncDateTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No managed devices</h3>
                  <p className="mt-1 text-sm text-gray-500">This user doesn't have any managed devices.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Assigned Licenses</h3>
            </div>
            <div className="card-body">
              {userLicenses.length > 0 ? (
                <div className="space-y-4">
                  {userLicenses.map((license, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900">{license.skuPartNumber}</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {license.servicePlans?.length || 0} services included
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No licenses assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">This user doesn't have any licenses assigned.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
