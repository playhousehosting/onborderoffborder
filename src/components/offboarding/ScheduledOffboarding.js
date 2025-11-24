import React, { useState, useEffect } from 'react';
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from '../../services/convexService';
import msalGraphService from '../../services/msalGraphService';
import { graphService } from '../../services/graphService';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  UserMinusIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

const ScheduledOffboarding = () => {
  const convex = useConvex();
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  const isConvexAuth = convexAuth.isAuthenticated;
  const isMSALAuth = msalAuth.isAuthenticated;
  const hasPermission = (permission) => {
    return isConvexAuth ? convexAuth.hasPermission(permission) : msalAuth.hasPermission(permission);
  };
  
  useEffect(() => {
    if (isMSALAuth && msalAuth.getAccessToken) {
      service.setGetTokenFunction(msalAuth.getAccessToken);
    }
  }, [isMSALAuth, msalAuth.getAccessToken]);
  
  const service = isConvexAuth ? graphService : msalGraphService;
  
  const [scheduledOffboardings, setScheduledOffboardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [executingId, setExecutingId] = useState(null);
  const [executionProgress, setExecutionProgress] = useState(0);

  const [scheduleForm, setScheduleForm] = useState({
    userId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to user's timezone
    template: 'standard',
    useCustomActions: false,
    actions: {
      disableAccount: true,
      revokeAccess: true,
      removeFromGroups: true,
      convertToSharedMailbox: false,
      backupData: true,
      removeDevices: true,
    },
    notifyManager: true,
    notifyUser: true,
    managerEmail: '',
    customMessage: '',
  });

  const templates = [
    { id: 'standard', name: 'Standard Offboarding' },
    { id: 'executive', name: 'Executive Offboarding' },
    { id: 'contractor', name: 'Contractor Offboarding' },
    { id: 'security', name: 'Security Critical Offboarding' },
  ];

  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  ];

  useEffect(() => {
    fetchScheduledOffboardings();
  }, []);

  const fetchScheduledOffboardings = async () => {
    try {
      setLoading(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
        console.warn('⚠️ No session ID found');
        toast.error('Session not found. Please log in again.');
        setScheduledOffboardings([]);
        return;
      }

      console.log('🔍 Fetching scheduled offboardings with sessionId:', sessionId);

      // Call Convex to get scheduled offboardings
      const data = await convex.query(api.offboarding.list, { sessionId });
      
      // Transform Convex data to match frontend expectations
      const transformed = (Array.isArray(data) ? data : []).map(record => {
        const offboardingDate = new Date(record.offboardingDate);
        const timezone = record.timezone || 'UTC';
        
        // Convert to the scheduled timezone for display
        const localDateString = offboardingDate.toLocaleString('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        
        // Parse the locale string to get date and time parts
        const parts = localDateString.match(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/);
        const scheduledDate = parts ? `${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}` : '';
        const scheduledTime = parts ? `${parts[4]}:${parts[5]}` : '';
        
        return {
          id: record._id,
          user: {
            id: record.userId,
            displayName: record.displayName,
            mail: record.email || record.userPrincipalName,
          },
          scheduledDate,
          scheduledTime,
          timezone,
          template: record.template || 'standard',
          actions: record.actions || {
            disableAccount: true,
            revokeAccess: true,
            removeFromGroups: true,
            convertToSharedMailbox: false,
            backupData: true,
            removeDevices: true,
          },
          status: record.status,
          notifyManager: record.notifyManager ?? true,
          notifyUser: record.notifyUser ?? true,
          managerEmail: record.managerEmail || '',
          customMessage: record.notes || '',
          createdAt: new Date(record.createdAt).toISOString(),
          _id: record._id, // Keep for updates
        };
      });
      
      setScheduledOffboardings(transformed);
    } catch (error) {
      console.error('❌ Error fetching scheduled offboardings:', error);
      
      // Check if it's a session error
      if (error.message && (error.message.includes('Unauthorized') || error.message.includes('Session'))) {
        console.warn('⚠️ Session invalid or expired, clearing...');
        localStorage.removeItem('sessionId');
        toast.error('Your session has expired. Please log in again.');
      } else {
        toast.error('Failed to fetch scheduled offboardings. This feature may require additional setup.');
      }
      
      setScheduledOffboardings([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearching(true);
      const results = await service.searchUsers(searchTerm);
      setSearchResults(results.value || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('userManagement')) {
      toast.error('You do not have permission to schedule offboarding');
      return;
    }

      try {
        const sessionId = getSessionId();
        if (!sessionId) {
          toast.error('Session not found. Please log in again.');
          return;
        }

        const scheduleData = {
          userId: scheduleForm.userId,
          userName: selectedUser?.displayName || selectedUser?.name || '',
          userEmail: selectedUser?.mail || selectedUser?.userPrincipalName || '',
          scheduledDate: scheduleForm.scheduledDate,
          scheduledTime: scheduleForm.scheduledTime,
          timezone: scheduleForm.timezone,
          template: scheduleForm.template,
          useCustomActions: scheduleForm.useCustomActions,
          actions: scheduleForm.useCustomActions ? scheduleForm.actions : undefined,
          notifyManager: scheduleForm.notifyManager,
          notifyUser: scheduleForm.notifyUser,
          managerEmail: scheduleForm.managerEmail || '',
          customMessage: scheduleForm.customMessage || '',
        };

      if (editingSchedule) {
        await convex.mutation(api.offboarding.update, {
          sessionId,
          offboardingId: editingSchedule._id,
          ...scheduleData,
        });
        toast.success('Offboarding schedule updated successfully');
      } else {
        await convex.mutation(api.offboarding.create, {
          sessionId,
          ...scheduleData,
        });
        toast.success('Offboarding scheduled successfully');
      }      setShowScheduleForm(false);
      setEditingSchedule(null);
      setSelectedUser(null);
      setScheduleForm({
        userId: '',
        scheduledDate: '',
        scheduledTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        template: 'standard',
        useCustomActions: false,
        actions: {
          disableAccount: true,
          revokeAccess: true,
          removeFromGroups: true,
          convertToSharedMailbox: false,
          backupData: true,
          removeDevices: true,
        },
        notifyManager: true,
        notifyUser: true,
        managerEmail: '',
        customMessage: '',
      });
      
      fetchScheduledOffboardings();
    } catch (error) {
      console.error('Error scheduling offboarding:', error);
      toast.error('Failed to schedule offboarding');
    }
  };

  const executeScheduledOffboarding = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to execute this scheduled offboarding now?')) {
      return;
    }

    setExecutingId(scheduleId);
    setExecutionProgress(0);

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        setExecutingId(null);
        return;
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExecutionProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      await convex.mutation(api.offboarding.execute, {
        sessionId,
        offboardingId: scheduleId,
      });

      clearInterval(progressInterval);
      setExecutionProgress(100);
      
      setTimeout(() => {
        toast.success('Offboarding executed successfully');
        setExecutingId(null);
        setExecutionProgress(0);
        fetchScheduledOffboardings();
      }, 500);
    } catch (error) {
      console.error('Error executing scheduled offboarding:', error);
      toast.error('Failed to execute offboarding');
      setExecutingId(null);
      setExecutionProgress(0);
    }
  };

  const deleteScheduledOffboarding = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled offboarding?')) {
      return;
    }

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        return;
      }

      await convex.mutation(api.offboarding.remove, {
        sessionId,
        offboardingId: scheduleId,
      });
      toast.success('Scheduled offboarding deleted successfully');
      fetchScheduledOffboardings();
    } catch (error) {
      console.error('Error deleting scheduled offboarding:', error);
      toast.error('Failed to delete scheduled offboarding');
    }
  };

  const editScheduledOffboarding = (schedule) => {
    setEditingSchedule(schedule);
    setSelectedUser(schedule.user);
    setScheduleForm({
      userId: schedule.user.id,
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      timezone: schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      template: schedule.template,
      useCustomActions: !!schedule.actions,
      actions: schedule.actions || {
        disableAccount: true,
        revokeAccess: true,
        removeFromGroups: true,
        convertToSharedMailbox: false,
        backupData: true,
        removeDevices: true,
      },
      notifyManager: schedule.notifyManager,
      notifyUser: schedule.notifyUser,
      managerEmail: schedule.managerEmail,
      customMessage: schedule.customMessage || '',
    });
    setShowScheduleForm(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    return new Date(`${dateString}T${timeString}`).toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Scheduled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Failed
          </span>
        );
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduled Offboarding</h1>
            <p className="mt-1 text-sm text-gray-600">
              Schedule and manage future employee offboarding processes
            </p>
          </div>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="btn btn-primary"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule Offboarding
          </button>
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {editingSchedule ? 'Edit Scheduled Offboarding' : 'Schedule New Offboarding'}
              </h2>
              <button
                onClick={() => {
                  setShowScheduleForm(false);
                  setEditingSchedule(null);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-6">
              {/* User Selection */}
              <div>
                <label className="form-label">Select User</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{selectedUser.displayName}</p>
                        <p className="text-sm text-gray-500">{selectedUser.mail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search for user"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searching && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        </div>
                      )}
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                            <p className="text-sm text-gray-500">{user.mail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduledDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={scheduleForm.scheduledTime}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduledTime: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Timezone Selection */}
              <div>
                <label className="form-label">Timezone</label>
                <select
                  className="form-input"
                  value={scheduleForm.timezone}
                  onChange={(e) => setScheduleForm({...scheduleForm, timezone: e.target.value})}
                  required
                >
                  {commonTimezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Selected timezone: {scheduleForm.timezone}
                </p>
              </div>

              {/* Template or Custom Actions */}
              <div>
                <label className="form-label">Offboarding Configuration</label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="useTemplate"
                      name="configType"
                      checked={!scheduleForm.useCustomActions}
                      onChange={() => setScheduleForm({...scheduleForm, useCustomActions: false})}
                      className="form-radio"
                    />
                    <label htmlFor="useTemplate" className="ml-2 text-sm text-gray-700">
                      Use template
                    </label>
                  </div>
                  
                  {!scheduleForm.useCustomActions && (
                    <select
                      className="form-input ml-6"
                      value={scheduleForm.template}
                      onChange={(e) => setScheduleForm({...scheduleForm, template: e.target.value})}
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="useCustomActions"
                      name="configType"
                      checked={scheduleForm.useCustomActions}
                      onChange={() => setScheduleForm({...scheduleForm, useCustomActions: true})}
                      className="form-radio"
                    />
                    <label htmlFor="useCustomActions" className="ml-2 text-sm text-gray-700">
                      Custom actions
                    </label>
                  </div>

                  {scheduleForm.useCustomActions && (
                    <div className="ml-6 space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="disableAccount"
                          checked={scheduleForm.actions.disableAccount}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, disableAccount: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="disableAccount" className="ml-2 text-sm text-gray-700">
                          Disable account
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="revokeAccess"
                          checked={scheduleForm.actions.revokeAccess}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, revokeAccess: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="revokeAccess" className="ml-2 text-sm text-gray-700">
                          Revoke all access
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="removeFromGroups"
                          checked={scheduleForm.actions.removeFromGroups}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, removeFromGroups: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="removeFromGroups" className="ml-2 text-sm text-gray-700">
                          Remove from all groups
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="convertToSharedMailbox"
                          checked={scheduleForm.actions.convertToSharedMailbox}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, convertToSharedMailbox: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="convertToSharedMailbox" className="ml-2 text-sm text-gray-700">
                          Convert to shared mailbox
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="backupData"
                          checked={scheduleForm.actions.backupData}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, backupData: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="backupData" className="ml-2 text-sm text-gray-700">
                          Backup user data
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="removeDevices"
                          checked={scheduleForm.actions.removeDevices}
                          onChange={(e) => setScheduleForm({
                            ...scheduleForm,
                            actions: {...scheduleForm.actions, removeDevices: e.target.checked}
                          })}
                          className="form-checkbox"
                        />
                        <label htmlFor="removeDevices" className="ml-2 text-sm text-gray-700">
                          Remove registered devices
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div>
                <label className="form-label">Notifications</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyManager"
                      className="form-checkbox"
                      checked={scheduleForm.notifyManager}
                      onChange={(e) => setScheduleForm({...scheduleForm, notifyManager: e.target.checked})}
                    />
                    <label htmlFor="notifyManager" className="ml-2 text-sm text-gray-700">
                      Notify manager
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifyUser"
                      className="form-checkbox"
                      checked={scheduleForm.notifyUser}
                      onChange={(e) => setScheduleForm({...scheduleForm, notifyUser: e.target.checked})}
                    />
                    <label htmlFor="notifyUser" className="ml-2 text-sm text-gray-700">
                      Notify user
                    </label>
                  </div>
                </div>
              </div>

              {scheduleForm.notifyManager && (
                <div>
                  <label className="form-label">Manager Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="manager@company.com"
                    value={scheduleForm.managerEmail}
                    onChange={(e) => setScheduleForm({...scheduleForm, managerEmail: e.target.value})}
                  />
                </div>
              )}

              {/* Custom Message */}
              <div>
                <label className="form-label">Custom Message (optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Additional notes or instructions..."
                  value={scheduleForm.customMessage}
                  onChange={(e) => setScheduleForm({...scheduleForm, customMessage: e.target.value})}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setEditingSchedule(null);
                    setSelectedUser(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingSchedule ? 'Update Schedule' : 'Schedule Offboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scheduled Offboardings List */}
      <div className="card">
        <div className="card-body">
          {scheduledOffboardings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledOffboardings.map((schedule) => (
                    <React.Fragment key={schedule.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{schedule.user.displayName}</div>
                              <div className="text-sm text-gray-500">{schedule.user.mail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(schedule.scheduledDate, schedule.scheduledTime)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {schedule.timezone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {templates.find(t => t.id === schedule.template)?.name || schedule.template}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(schedule.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(schedule.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {schedule.status === 'scheduled' && (
                              <>
                                <button
                                  onClick={() => executeScheduledOffboarding(schedule.id)}
                                  disabled={executingId === schedule.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Execute Now"
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => editScheduledOffboarding(schedule)}
                                  disabled={executingId === schedule.id}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteScheduledOffboarding(schedule.id)}
                              disabled={executingId === schedule.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {executingId === schedule.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-2 bg-blue-50">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-blue-700">
                                    Executing offboarding...
                                  </span>
                                  <span className="text-sm font-medium text-blue-700">
                                    {executionProgress}%
                                  </span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${executionProgress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled offboardings</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by scheduling a new offboarding process.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledOffboarding;

