import React, { useState, useEffect } from 'react';
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from '../../services/convexService';
import { graphService } from '../../services/graphService';
import { useAuth } from '../../contexts/AuthContext';
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
  const { hasPermission } = useAuth();
  const [scheduledOffboardings, setScheduledOffboardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({
    userId: '',
    scheduledDate: '',
    scheduledTime: '',
    template: 'standard',
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

  useEffect(() => {
    fetchScheduledOffboardings();
  }, []);

  const fetchScheduledOffboardings = async () => {
    try {
      setLoading(true);
      const sessionId = getSessionId();
      
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        setScheduledOffboardings([]);
        return;
      }

      // Call Convex to get scheduled offboardings
      const data = await convex.query(api.offboarding.list, { sessionId });
      
      // Transform Convex data to match frontend expectations
      const transformed = (Array.isArray(data) ? data : []).map(record => {
        const offboardingDate = new Date(record.offboardingDate);
        return {
          id: record._id,
          user: {
            id: record.userId,
            displayName: record.displayName,
            mail: record.email || record.userPrincipalName,
          },
          scheduledDate: offboardingDate.toISOString().split('T')[0],
          scheduledTime: offboardingDate.toTimeString().substring(0, 5),
          template: record.template || 'standard',
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
      console.error('Error fetching scheduled offboardings:', error);
      toast.error('Failed to fetch scheduled offboardings');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setSearching(true);
      const results = await graphService.searchUsers(searchTerm);
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
          template: scheduleForm.template,
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
        template: 'standard',
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

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        return;
      }

      await convex.mutation(api.offboarding.execute, {
        sessionId,
        offboardingId: scheduleId,
      });
      toast.success('Offboarding executed successfully');
      fetchScheduledOffboardings();
    } catch (error) {
      console.error('Error executing scheduled offboarding:', error);
      toast.error('Failed to execute offboarding');
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
      template: schedule.template,
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

              {/* Template Selection */}
              <div>
                <label className="form-label">Offboarding Template</label>
                <select
                  className="form-input"
                  value={scheduleForm.template}
                  onChange={(e) => setScheduleForm({...scheduleForm, template: e.target.value})}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
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
                    <tr key={schedule.id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(schedule.scheduledDate, schedule.scheduledTime)}
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
                                className="text-green-600 hover:text-green-900"
                                title="Execute Now"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => editScheduledOffboarding(schedule)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteScheduledOffboarding(schedule.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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