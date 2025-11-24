import React, { useState, useEffect } from 'react';
import msalGraphService from '../../services/msalGraphService';
import { graphService } from '../../services/graphService';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  UserIcon,
  MapPinIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  KeyIcon,
  ClockIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const UserDetailModal = ({ user, onClose, onUserUpdated }) => {
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  const isConvexAuth = convexAuth.isAuthenticated;
  const isMSALAuth = msalAuth.isAuthenticated;
  
  useEffect(() => {
    if (isMSALAuth && msalAuth.getAccessToken) {
      service.setGetTokenFunction(msalAuth.getAccessToken);
    }
  }, [isMSALAuth, msalAuth.getAccessToken]);
  
  const service = isConvexAuth ? graphService : msalGraphService;
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [signInLogs, setSignInLogs] = useState([]);
  const [authMethods, setAuthMethods] = useState([]);
  const [presence, setPresence] = useState(null);
  const [devices, setDevices] = useState([]);
  const [manager, setManager] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserDetails();
    }
  }, [user]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);

      // Load all user details in parallel
      const [
        signInLogsResponse,
        authMethodsResponse,
        presenceResponse,
        devicesResponse,
        managerResponse
      ] = await Promise.allSettled([
        service.getUserSignInLogs(user.id, 7),
        service.getUserAuthenticationMethods(user.id),
        service.getUserPresence(user.id),
        service.getUserRegisteredDevices(user.id),
        service.getUserManager(user.id)
      ]);

      if (signInLogsResponse.status === 'fulfilled') {
        setSignInLogs(signInLogsResponse.value?.value || []);
      }

      if (authMethodsResponse.status === 'fulfilled') {
        setAuthMethods(authMethodsResponse.value?.value || []);
      }

      if (presenceResponse.status === 'fulfilled') {
        setPresence(presenceResponse.value);
      }

      if (devicesResponse.status === 'fulfilled') {
        setDevices(devicesResponse.value?.value || []);
      }

      if (managerResponse.status === 'fulfilled') {
        setManager(managerResponse.value);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load some user details');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Reset password for ${user.displayName}? A temporary password will be generated and the user will be required to change it on next sign-in.`)) {
      return;
    }

    try {
      setProcessing(true);
      const response = await service.resetUserPassword(user.id);
      
      toast.success(
        <div>
          <p className="font-semibold">Password reset successfully!</p>
          {response.newPassword && (
            <p className="mt-1 text-sm">Temporary password: {response.newPassword}</p>
          )}
        </div>,
        { duration: 10000 }
      );

      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeAuthMethod = async (method) => {
    const methodName = getAuthMethodName(method);
    
    if (!confirm(`Remove ${methodName} from ${user.displayName}'s account? This will revoke this authentication method.`)) {
      return;
    }

    try {
      setProcessing(true);
      const methodType = method['@odata.type'].split('.').pop().replace('AuthenticationMethod', '');
      await service.deleteUserAuthenticationMethod(user.id, method.id, methodType);
      
      toast.success(`${methodName} removed successfully`);
      
      // Reload auth methods
      const updatedMethods = await service.getUserAuthenticationMethods(user.id);
      setAuthMethods(updatedMethods.value || []);
    } catch (error) {
      console.error('Error revoking auth method:', error);
      toast.error(`Failed to remove ${methodName}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAccount = async () => {
    const action = user.accountEnabled ? 'disable' : 'enable';
    
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} account for ${user.displayName}?`)) {
      return;
    }

    try {
      setProcessing(true);
      
      if (user.accountEnabled) {
        await service.disableUserAccount(user.id);
        toast.success('Account disabled successfully');
      } else {
        await service.enableUserAccount(user.id);
        toast.success('Account enabled successfully');
      }

      if (onUserUpdated) {
        onUserUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error(`Error ${action}ing account:`, error);
      toast.error(`Failed to ${action} account`);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm(`Revoke all active sessions for ${user.displayName}? This will sign them out of all devices and applications.`)) {
      return;
    }

    try {
      setProcessing(true);
      await service.revokeUserSessions(user.id);
      toast.success('All sessions revoked successfully');
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('Failed to revoke sessions');
    } finally {
      setProcessing(false);
    }
  };

  const getAuthMethodName = (method) => {
    const type = method['@odata.type'];
    if (type.includes('password')) return 'Password';
    if (type.includes('phone')) return `Phone (${method.phoneNumber})`;
    if (type.includes('email')) return `Email (${method.emailAddress})`;
    if (type.includes('microsoftAuthenticator')) return `Authenticator (${method.displayName || 'App'})`;
    if (type.includes('fido2')) return 'FIDO2 Security Key';
    if (type.includes('temporaryAccessPass')) return 'Temporary Access Pass';
    if (type.includes('softwareOath')) return 'Software Token';
    return 'Unknown Method';
  };

  const getAuthMethodIcon = (method) => {
    const type = method['@odata.type'];
    if (type.includes('password')) return <KeyIcon className="h-5 w-5" />;
    if (type.includes('phone')) return <DevicePhoneMobileIcon className="h-5 w-5" />;
    if (type.includes('email')) return <EnvelopeIcon className="h-5 w-5" />;
    if (type.includes('microsoftAuthenticator')) return <ShieldCheckIcon className="h-5 w-5" />;
    if (type.includes('fido2')) return <KeyIcon className="h-5 w-5" />;
    return <KeyIcon className="h-5 w-5" />;
  };

  const getPresenceBadge = () => {
    if (!presence) return null;

    const colorMap = {
      'Available': 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400',
      'Busy': 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400',
      'Away': 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
      'BeRightBack': 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
      'DoNotDisturb': 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400',
      'Offline': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
    };

    const color = colorMap[presence.availability] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {presence.availability}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {user.displayName}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.userPrincipalName}
                </p>
                <div className="mt-1 flex items-center space-x-2">
                  {user.accountEnabled ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
                      Disabled
                    </span>
                  )}
                  {getPresenceBadge()}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', label: '📊 Overview', icon: UserIcon },
                { id: 'activity', label: '🔐 Sign-in Activity', icon: ClockIcon },
                { id: 'auth', label: '🔑 Authentication', icon: ShieldCheckIcon },
                { id: 'devices', label: '💻 Devices', icon: ComputerDesktopIcon },
                { id: 'actions', label: '⚙️ Actions', icon: ExclamationTriangleIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="card">
                        <div className="card-header">
                          <h3 className="text-lg font-semibold">Basic Information</h3>
                        </div>
                        <div className="card-body space-y-3">
                          <div className="flex items-start">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.mail || '—'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.jobTitle || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.department || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Office Location</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.officeLocation || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Mobile Phone</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {user.mobilePhone || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Manager */}
                      {manager && (
                        <div className="card">
                          <div className="card-header">
                            <h3 className="text-lg font-semibold">Manager</h3>
                          </div>
                          <div className="card-body">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <UserIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {manager.displayName}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {manager.jobTitle}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {manager.mail}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Account Status */}
                      <div className="card">
                        <div className="card-header">
                          <h3 className="text-lg font-semibold">Account Status</h3>
                        </div>
                        <div className="card-body space-y-3">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.accountEnabled ? '✅ Enabled' : '❌ Disabled'}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatDate(user.createdDateTime)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Last Password Change</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatDate(user.lastPasswordChangeDateTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign-in Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Recent Sign-in Activity (Last 7 Days)
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {signInLogs.length} sign-in{signInLogs.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {signInLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          No sign-in activity in the last 7 days
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {signInLogs.map((log, index) => (
                          <div key={log.id || index} className="card">
                            <div className="card-body">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {log.status?.errorCode === 0 ? (
                                      <CheckCircleIcon className="h-5 w-5 text-success-500" />
                                    ) : (
                                      <ExclamationTriangleIcon className="h-5 w-5 text-danger-500" />
                                    )}
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                      {log.appDisplayName}
                                    </h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      {formatRelativeTime(log.createdDateTime)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">📍 Location</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {log.location?.city || 'Unknown'}, {log.location?.state || ''} {log.location?.countryOrRegion || ''}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">🌐 IP Address</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {log.ipAddress || 'Unknown'}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">💻 Device</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {log.deviceDetail?.operatingSystem || 'Unknown'} / {log.deviceDetail?.browser || 'Unknown'}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">🔐 Auth Method</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {log.authenticationDetails?.[0]?.authenticationMethod || 'Unknown'}
                                      </p>
                                    </div>
                                  </div>

                                  {log.status?.errorCode !== 0 && (
                                    <div className="mt-2 p-2 bg-danger-50 dark:bg-danger-900/20 rounded">
                                      <p className="text-sm text-danger-700 dark:text-danger-400">
                                        ❌ {log.status?.failureReason || 'Sign-in failed'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Authentication Methods Tab */}
                {activeTab === 'auth' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Registered Authentication Methods
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {authMethods.length} method{authMethods.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {authMethods.length === 0 ? (
                      <div className="text-center py-12">
                        <KeyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          No authentication methods registered
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {authMethods.map((method) => (
                          <div key={method.id} className="card">
                            <div className="card-body">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                  <div className="mt-1 text-primary-600 dark:text-primary-400">
                                    {getAuthMethodIcon(method)}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                      {getAuthMethodName(method)}
                                    </h4>
                                    {method.createdDateTime && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Added: {formatDate(method.createdDateTime)}
                                      </p>
                                    )}
                                    {method.phoneType && (
                                      <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                                        {method.phoneType}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {!method['@odata.type'].includes('password') && (
                                  <button
                                    onClick={() => handleRevokeAuthMethod(method)}
                                    disabled={processing}
                                    className="text-danger-600 hover:text-danger-800 dark:text-danger-400 dark:hover:text-danger-300"
                                    title="Remove method"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Devices Tab */}
                {activeTab === 'devices' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Registered Devices
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {devices.length} device{devices.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {devices.length === 0 ? (
                      <div className="text-center py-12">
                        <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          No registered devices
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {devices.map((device) => (
                          <div key={device.id} className="card">
                            <div className="card-body">
                              <div className="flex items-start space-x-3">
                                <div className="mt-1 text-primary-600 dark:text-primary-400">
                                  {device.operatingSystem?.includes('iOS') || device.operatingSystem?.includes('Android') ? (
                                    <DevicePhoneMobileIcon className="h-6 w-6" />
                                  ) : (
                                    <ComputerDesktopIcon className="h-6 w-6" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {device.displayName}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {device.operatingSystem} {device.operatingSystemVersion}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    {device.isCompliant ? (
                                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
                                        ✅ Compliant
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
                                        ❌ Non-compliant
                                      </span>
                                    )}
                                    {device.isManaged && (
                                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                                        🛡️ Managed
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Last sign-in: {formatRelativeTime(device.approximateLastSignInDateTime)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-warning-800 dark:text-warning-400">
                            ⚠️ Caution Required
                          </h3>
                          <p className="mt-1 text-sm text-warning-700 dark:text-warning-500">
                            These actions may impact the user's ability to access resources. Please use with caution.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reset Password */}
                      <div className="card">
                        <div className="card-body">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 text-primary-600 dark:text-primary-400">
                              <KeyIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                Reset Password
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Generate a temporary password and require user to change it on next sign-in.
                              </p>
                              <button
                                onClick={handleResetPassword}
                                disabled={processing}
                                className="mt-3 btn btn-secondary btn-sm"
                              >
                                Reset Password
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revoke Sessions */}
                      <div className="card">
                        <div className="card-body">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 text-warning-600 dark:text-warning-400">
                              <ArrowPathIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                Revoke Sessions
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Sign out user from all devices and applications immediately.
                              </p>
                              <button
                                onClick={handleRevokeSessions}
                                disabled={processing}
                                className="mt-3 btn btn-warning btn-sm"
                              >
                                Revoke All Sessions
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Account */}
                      <div className="card">
                        <div className="card-body">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 text-danger-600 dark:text-danger-400">
                              {user.accountEnabled ? (
                                <LockClosedIcon className="h-6 w-6" />
                              ) : (
                                <LockOpenIcon className="h-6 w-6" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                {user.accountEnabled ? 'Disable Account' : 'Enable Account'}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {user.accountEnabled
                                  ? 'Prevent user from signing in and accessing any resources.'
                                  : 'Allow user to sign in and access resources.'}
                              </p>
                              <button
                                onClick={handleToggleAccount}
                                disabled={processing}
                                className={`mt-3 btn btn-sm ${
                                  user.accountEnabled ? 'btn-danger' : 'btn-success'
                                }`}
                              >
                                {user.accountEnabled ? 'Disable Account' : 'Enable Account'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={processing}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;

