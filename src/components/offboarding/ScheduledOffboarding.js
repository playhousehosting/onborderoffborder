import React, { useState, useEffect, useCallback } from 'react';
import { useConvex, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionId } from '../../services/convexService';
import { getActiveService, getAuthMode } from '../../services/serviceFactory';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import { exportScheduledOffboardingResultsToPDF } from '../../utils/pdfExport';
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
  DocumentTextIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const ScheduledOffboarding = () => {
  const convex = useConvex();
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  // Use serviceFactory to get the correct service based on auth mode
  const authMode = getAuthMode();
  const service = getActiveService();
  
  // Determine which auth is active based on serviceFactory mode
  const isConvexAuth = authMode === 'convex';
  const isMSALAuth = authMode === 'msal';
  const hasPermission = (permission) => {
    return isConvexAuth ? convexAuth.hasPermission(permission) : msalAuth.hasPermission(permission);
  };
  
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
  
  // Execution report state
  const [viewingReportId, setViewingReportId] = useState(null);
  const [executionLogs, setExecutionLogs] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Service credentials state for scheduled offboarding
  const [showCredentialsSetup, setShowCredentialsSetup] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [serviceCredentials, setServiceCredentials] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: '',
  });
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Convex action to configure credentials
  const configureCredentials = useAction(api.authActions.configure);

  const [scheduleForm, setScheduleForm] = useState({
    userId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to user's timezone
    template: 'standard',
    useCustomActions: false,
    actions: {
      // Account Actions
      disableAccount: true,
      resetPassword: true,
      revokeAccess: true,
      // Licensing
      revokeLicenses: true,
      // Groups & Access
      removeFromGroups: true,
      removeFromTeams: true,
      removeFromApps: true,
      removeAuthMethods: true,
      // Mailbox
      convertToSharedMailbox: false,
      setEmailForwarding: false,
      forwardingAddress: '',
      setAutoReply: false,
      autoReplyMessage: '',
      // Data
      backupData: true,
      transferFiles: false,
      newFileOwner: '',
      // Devices
      wipeDevices: false,
      retireDevices: true,
      removeApps: false,
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

  // Check if service credentials are already configured
  useEffect(() => {
    const serviceSessionId = localStorage.getItem('serviceSessionId');
    const serviceTenantId = localStorage.getItem('serviceTenantId');
    if (serviceSessionId && serviceTenantId) {
      setCredentialsConfigured(true);
    }
  }, []);

  useEffect(() => {
    fetchScheduledOffboardings();
  }, []);

  // Handler to save service credentials
  const handleSaveServiceCredentials = async () => {
    setIsSavingCredentials(true);
    try {
      if (!serviceCredentials.clientId || !serviceCredentials.tenantId || !serviceCredentials.clientSecret) {
        toast.error('All fields are required for service credentials');
        return;
      }

      const result = await configureCredentials({
        clientId: serviceCredentials.clientId,
        tenantId: serviceCredentials.tenantId,
        clientSecret: serviceCredentials.clientSecret,
      });

      if (result.success) {
        localStorage.setItem('serviceSessionId', result.sessionId);
        localStorage.setItem('serviceTenantId', serviceCredentials.tenantId);
        setCredentialsConfigured(true);
        setShowCredentialsSetup(false);
        toast.success('Service credentials saved! Scheduled offboarding will now work.');
      } else {
        toast.error('Failed to save service credentials');
      }
    } catch (error) {
      console.error('Error saving service credentials:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSavingCredentials(false);
    }
  };

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
          userId: selectedUser?.id || scheduleForm.userId,
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
    // Find the schedule record to get user details and actions
    const schedule = scheduledOffboardings.find(s => s.id === scheduleId);
    if (!schedule) {
      toast.error('Schedule not found');
      return;
    }

    // Check if the scheduled time has passed
    const timeRemaining = getTimeRemaining(schedule.scheduledDate, schedule.scheduledTime, schedule.timezone);
    
    if (!timeRemaining.expired && timeRemaining.diff > 0) {
      // Scheduled time has NOT yet arrived
      const confirmEarly = window.confirm(
        `⚠️ EARLY EXECUTION WARNING\n\n` +
        `This offboarding is scheduled for:\n` +
        `${formatDateTime(schedule.scheduledDate, schedule.scheduledTime, schedule.timezone)} (${schedule.timezone})\n\n` +
        `Time remaining: ${timeRemaining.text}\n\n` +
        `Are you sure you want to execute this offboarding EARLY?\n\n` +
        `Click OK to proceed immediately, or Cancel to wait for the scheduled time.`
      );
      
      if (!confirmEarly) {
        toast('Execution cancelled. Offboarding will run at the scheduled time.', {
          icon: '⏰',
          duration: 4000,
        });
        return;
      }
    }

    if (!window.confirm('Are you sure you want to execute this offboarding now? This will immediately disable the user account and perform all selected offboarding actions.')) {
      return;
    }

    if (!hasPermission('userManagement')) {
      toast.error('You do not have permission to perform offboarding operations');
      return;
    }

    setExecutingId(scheduleId);
    setExecutionProgress(0);

    const results = [];
    const startTime = Date.now();
    const user = schedule.user;
    const actions = schedule.actions;

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        setExecutingId(null);
        return;
      }

      // Mark as in-progress in Convex
      await convex.mutation(api.offboarding.execute, {
        sessionId,
        offboardingId: scheduleId,
      });

      // Calculate total steps
      const totalSteps = Object.values(actions).filter(v => v === true).length + 1; // +1 for revoke sessions
      let currentStep = 0;

      const updateProgress = () => {
        currentStep++;
        setExecutionProgress(Math.round((currentStep / totalSteps) * 100));
      };

      // 1. Disable account (CRITICAL: Do this first)
      if (actions.disableAccount) {
        try {
          await service.disableUser(user.id);
          results.push({
            action: 'disableAccount',
            status: 'success',
            message: 'Account has been disabled',
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'disableAccount',
            status: 'error',
            message: error.message,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      // 2. Revoke all sign-in sessions (CRITICAL: Always do after disabling)
      try {
        await service.revokeUserSessions(user.id);
        results.push({
          action: 'revokeSessions',
          status: 'success',
          message: 'All active sessions and refresh tokens have been revoked',
          timestamp: Date.now(),
        });
      } catch (error) {
        results.push({
          action: 'revokeSessions',
          status: 'error',
          message: error.message,
          timestamp: Date.now(),
        });
      }
      updateProgress();

      // 3. Revoke access (licenses)
      if (actions.revokeAccess) {
        try {
          const licenseResult = await service.removeAllLicenses(user.id);
          results.push({
            action: 'revokeAccess',
            status: 'success',
            message: `Removed ${licenseResult?.removedCount || 0} license(s)`,
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'revokeAccess',
            status: 'error',
            message: error.message,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      // 4. Remove from groups
      if (actions.removeFromGroups) {
        try {
          const groupsData = await service.getUserGroups(user.id);
          const groups = groupsData.value || [];
          let removedCount = 0;
          let failedCount = 0;

          for (const group of groups) {
            try {
              await service.removeUserFromGroup(group.id, user.id);
              removedCount++;
            } catch (error) {
              if (!error.isExpected) failedCount++;
            }
          }

          results.push({
            action: 'removeFromGroups',
            status: failedCount === groups.length && groups.length > 0 ? 'error' : 'success',
            message: groups.length === 0 
              ? 'User was not a member of any groups' 
              : `Removed from ${removedCount} groups${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'removeFromGroups',
            status: 'error',
            message: error.message,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      // 5. Convert to shared mailbox
      if (actions.convertToSharedMailbox) {
        try {
          await service.convertToSharedMailbox(user.id);
          results.push({
            action: 'convertToSharedMailbox',
            status: 'success',
            message: 'Mailbox converted to shared mailbox',
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'convertToSharedMailbox',
            status: 'error',
            message: error.message,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      // 6. Backup data
      if (actions.backupData) {
        try {
          await service.backupUserData(user.id);
          results.push({
            action: 'backupData',
            status: 'success',
            message: 'Data backup initiated successfully',
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'backupData',
            status: 'warning',
            message: `Backup may require manual action: ${error.message}`,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      // 7. Remove devices
      if (actions.removeDevices) {
        try {
          const devicesData = await service.getUserDevices(user.mail || user.id);
          const devices = devicesData?.value || [];
          let processedCount = 0;
          let failedCount = 0;

          for (const device of devices) {
            try {
              await service.retireDevice(device.id);
              processedCount++;
            } catch (error) {
              failedCount++;
            }
          }

          results.push({
            action: 'removeDevices',
            status: failedCount === devices.length && devices.length > 0 ? 'error' : 'success',
            message: devices.length === 0 
              ? 'User had no enrolled devices' 
              : `Retired ${processedCount} devices${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
            timestamp: Date.now(),
          });
        } catch (error) {
          results.push({
            action: 'removeDevices',
            status: 'warning',
            message: `Could not retrieve devices: ${error.message}`,
            timestamp: Date.now(),
          });
        }
        updateProgress();
      }

      setExecutionProgress(100);

      // Log execution results to Convex
      const endTime = Date.now();
      const hasErrors = results.some(r => r.status === 'error');
      const allSuccess = results.every(r => r.status === 'success' || r.status === 'skipped');
      const overallStatus = allSuccess ? 'completed' : hasErrors ? 'partial' : 'completed';

      try {
        await convex.mutation(api.offboarding.logExecution, {
          sessionId,
          offboardingId: scheduleId,
          targetUserId: user.id,
          targetUserName: user.displayName,
          targetUserEmail: user.mail,
          executionType: 'scheduled',
          startTime,
          endTime,
          status: overallStatus,
          actions: results,
        });
      } catch (logError) {
        console.error('Failed to log execution:', logError);
      }

      setTimeout(() => {
        toast.success(hasErrors 
          ? 'Offboarding completed with some errors - check the report for details' 
          : 'Offboarding executed successfully');
        setExecutingId(null);
        setExecutionProgress(0);
        fetchScheduledOffboardings();
      }, 500);

    } catch (error) {
      console.error('Error executing scheduled offboarding:', error);
      
      // Log failure to Convex
      try {
        const sessionId = getSessionId();
        if (sessionId) {
          await convex.mutation(api.offboarding.logExecution, {
            sessionId,
            offboardingId: scheduleId,
            targetUserId: user.id,
            targetUserName: user.displayName,
            targetUserEmail: user.mail,
            executionType: 'scheduled',
            startTime,
            endTime: Date.now(),
            status: 'failed',
            actions: results,
            error: error.message,
          });
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      toast.error('Failed to execute offboarding: ' + error.message);
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

  const retryFailedOffboarding = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to retry this failed offboarding?')) {
      return;
    }

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        return;
      }

      await convex.mutation(api.offboarding.retry, {
        sessionId,
        offboardingId: scheduleId,
      });
      toast.success('Offboarding scheduled for retry');
      fetchScheduledOffboardings();
    } catch (error) {
      console.error('Error retrying offboarding:', error);
      toast.error(`Failed to retry offboarding: ${error.message}`);
    }
  };

  const viewExecutionReport = async (scheduleId) => {
    // Toggle off if already viewing this report
    if (viewingReportId === scheduleId) {
      setViewingReportId(null);
      setExecutionLogs(null);
      return;
    }

    setViewingReportId(scheduleId);
    setLoadingReport(true);
    setExecutionLogs(null);

    try {
      const sessionId = getSessionId();
      if (!sessionId) {
        toast.error('Session not found. Please log in again.');
        setViewingReportId(null);
        setLoadingReport(false);
        return;
      }

      const logs = await convex.query(api.offboarding.getExecutionLogs, {
        sessionId,
        offboardingId: scheduleId,
        limit: 1, // Get the most recent execution for this offboarding
      });

      if (logs && logs.length > 0) {
        setExecutionLogs(logs[0]);
      } else {
        setExecutionLogs(null);
        toast.info('No execution report available yet');
      }
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      toast.error('Failed to load execution report');
      setViewingReportId(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const exportExecutionReportToPDF = (schedule) => {
    if (!executionLogs) {
      toast.error('No execution report available to export');
      return;
    }

    try {
      const filename = exportScheduledOffboardingResultsToPDF({
        executionLog: executionLogs,
        schedule: {
          scheduledDate: schedule.scheduledDate,
          scheduledTime: schedule.scheduledTime,
          template: schedule.template,
          actions: schedule.actions,
        },
      });
      toast.success(`Report exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export report to PDF');
    }
  };

  const getActionStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'skipped':
        return <MinusCircleIcon className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getActionStatusBadge = (status) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      skipped: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
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

  const formatDateTime = (dateString, timeString, timezone) => {
    // Display the scheduled date/time as stored (in the specified timezone)
    // The dateString is YYYY-MM-DD and timeString is HH:MM in the specified timezone
    // We want to display it exactly as scheduled, not converted to local time
    try {
      // Parse the date and time components
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Format as a readable date/time string
      const date = new Date(year, month - 1, day, hours, minutes);
      
      // Format with explicit options to show the scheduled time
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return `${dateString} ${timeString}`;
    }
  };

  // Calculate time remaining until scheduled execution
  const getTimeRemaining = useCallback((dateString, timeString, timezone) => {
    try {
      // Create a date string that can be parsed with the timezone
      const dateTimeStr = `${dateString}T${timeString}:00`;
      
      // Get the current time in the target timezone
      const now = new Date();
      const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      
      // Parse the scheduled date/time (it's already in the target timezone)
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes] = timeString.split(':').map(Number);
      const scheduledInTimezone = new Date(year, month - 1, day, hours, minutes);
      
      // Calculate the offset between local time and target timezone
      const localNow = new Date();
      const targetNow = new Date(localNow.toLocaleString('en-US', { timeZone: timezone }));
      const offsetMs = localNow.getTime() - targetNow.getTime();
      
      // Adjust scheduled time to local for comparison
      const scheduledLocal = new Date(scheduledInTimezone.getTime() + offsetMs);
      
      const diff = scheduledLocal.getTime() - localNow.getTime();
      
      if (diff <= 0) {
        return { expired: true, text: 'Ready to execute', diff: 0 };
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours_remaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes_remaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds_remaining = Math.floor((diff % (1000 * 60)) / 1000);
      
      let text = '';
      if (days > 0) {
        text = `${days}d ${hours_remaining}h ${minutes_remaining}m`;
      } else if (hours_remaining > 0) {
        text = `${hours_remaining}h ${minutes_remaining}m ${seconds_remaining}s`;
      } else if (minutes_remaining > 0) {
        text = `${minutes_remaining}m ${seconds_remaining}s`;
      } else {
        text = `${seconds_remaining}s`;
      }
      
      return { expired: false, text, diff, days, hours: hours_remaining, minutes: minutes_remaining, seconds: seconds_remaining };
    } catch (e) {
      console.error('Error calculating time remaining:', e);
      return { expired: false, text: 'Unknown', diff: 0 };
    }
  }, []);

  // Countdown Timer Component
  const CountdownTimer = ({ dateString, timeString, timezone, status }) => {
    const [timeRemaining, setTimeRemaining] = useState(() => 
      getTimeRemaining(dateString, timeString, timezone)
    );

    useEffect(() => {
      if (status !== 'scheduled') return;
      
      const interval = setInterval(() => {
        setTimeRemaining(getTimeRemaining(dateString, timeString, timezone));
      }, 1000);

      return () => clearInterval(interval);
    }, [dateString, timeString, timezone, status]);

    if (status !== 'scheduled') {
      return null;
    }

    if (timeRemaining.expired) {
      return (
        <div className="mt-1 flex items-center text-xs text-amber-600 font-medium">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Ready to execute
        </div>
      );
    }

    // Color based on urgency
    let colorClass = 'text-gray-500';
    if (timeRemaining.diff < 1000 * 60 * 60) { // Less than 1 hour
      colorClass = 'text-red-600 font-semibold';
    } else if (timeRemaining.diff < 1000 * 60 * 60 * 24) { // Less than 24 hours
      colorClass = 'text-amber-600 font-medium';
    } else if (timeRemaining.diff < 1000 * 60 * 60 * 24 * 7) { // Less than 7 days
      colorClass = 'text-blue-600';
    }

    return (
      <div className={`mt-1 flex items-center text-xs ${colorClass}`}>
        <ClockIcon className="h-3 w-3 mr-1 animate-pulse" />
        <span>Executes in: {timeRemaining.text}</span>
      </div>
    );
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCredentialsSetup(!showCredentialsSetup)}
              className={`btn ${credentialsConfigured ? 'btn-secondary' : 'btn-warning'}`}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              {credentialsConfigured ? 'Update Credentials' : 'Setup Required'}
            </button>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="btn btn-primary"
            >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule Offboarding
          </button>
          </div>
        </div>
      </div>

      {/* Service Credentials Setup Banner */}
      {!credentialsConfigured && !showCredentialsSetup && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Setup Required for Scheduled Offboarding</h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                To run scheduled offboardings automatically, you need to configure service credentials. 
                Click "Setup Required" above to add your Azure AD app credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Credentials Setup Form */}
      {showCredentialsSetup && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <KeyIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Service Credentials</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Required for scheduled offboarding to run automatically</p>
                </div>
              </div>
              <button
                onClick={() => setShowCredentialsSetup(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Why needed?</strong> Scheduled offboardings run on the server when your browser isn't open. 
                The server needs its own credentials (App-Only) to make Graph API calls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client ID (Application ID)
                </label>
                <input
                  type="text"
                  value={serviceCredentials.clientId}
                  onChange={(e) => setServiceCredentials(prev => ({ ...prev, clientId: e.target.value }))}
                  className="input w-full"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tenant ID (Directory ID)
                </label>
                <input
                  type="text"
                  value={serviceCredentials.tenantId}
                  onChange={(e) => setServiceCredentials(prev => ({ ...prev, tenantId: e.target.value }))}
                  className="input w-full"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={serviceCredentials.clientSecret}
                  onChange={(e) => setServiceCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                  className="input w-full pr-20"
                  placeholder="Enter client secret (required)"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Azure Portal → App Registrations → Certificates & secrets → New client secret
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheckIcon className="inline h-4 w-4 mr-1" />
                Credentials are encrypted and stored securely
              </p>
              <button
                onClick={handleSaveServiceCredentials}
                disabled={isSavingCredentials || !serviceCredentials.clientId || !serviceCredentials.tenantId || !serviceCredentials.clientSecret}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingCredentials ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Save Credentials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Configured Success Banner */}
      {credentialsConfigured && !showCredentialsSetup && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Service credentials configured - scheduled offboarding will run automatically
            </span>
          </div>
        </div>
      )}

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
                    <div className="ml-6 space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      {/* Account Actions */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <UserMinusIcon className="w-4 h-4 mr-1 text-blue-600" />
                          Account Actions
                        </h4>
                        <div className="ml-5 space-y-2">
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
                              id="resetPassword"
                              checked={scheduleForm.actions.resetPassword}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, resetPassword: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="resetPassword" className="ml-2 text-sm text-gray-700">
                              Reset password
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
                              Revoke all sessions
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Licensing */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <KeyIcon className="w-4 h-4 mr-1 text-purple-600" />
                          Licensing
                        </h4>
                        <div className="ml-5 space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="revokeLicenses"
                              checked={scheduleForm.actions.revokeLicenses}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, revokeLicenses: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="revokeLicenses" className="ml-2 text-sm text-gray-700">
                              Revoke licenses
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Groups & Access */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <ShieldCheckIcon className="w-4 h-4 mr-1 text-green-600" />
                          Groups & Access
                        </h4>
                        <div className="ml-5 space-y-2">
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
                              id="removeFromTeams"
                              checked={scheduleForm.actions.removeFromTeams}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, removeFromTeams: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="removeFromTeams" className="ml-2 text-sm text-gray-700">
                              Remove from Teams
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="removeFromApps"
                              checked={scheduleForm.actions.removeFromApps}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, removeFromApps: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="removeFromApps" className="ml-2 text-sm text-gray-700">
                              Remove app access
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="removeAuthMethods"
                              checked={scheduleForm.actions.removeAuthMethods}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, removeAuthMethods: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="removeAuthMethods" className="ml-2 text-sm text-gray-700">
                              Remove authentication methods
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Mailbox Options */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <DocumentTextIcon className="w-4 h-4 mr-1 text-orange-600" />
                          Mailbox Options
                        </h4>
                        <div className="ml-5 space-y-2">
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
                              id="setEmailForwarding"
                              checked={scheduleForm.actions.setEmailForwarding}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, setEmailForwarding: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="setEmailForwarding" className="ml-2 text-sm text-gray-700">
                              Set email forwarding
                            </label>
                          </div>
                          {scheduleForm.actions.setEmailForwarding && (
                            <input
                              type="email"
                              placeholder="Forwarding address"
                              value={scheduleForm.actions.forwardingAddress}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, forwardingAddress: e.target.value}
                              })}
                              className="form-input ml-6 text-sm"
                            />
                          )}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="setAutoReply"
                              checked={scheduleForm.actions.setAutoReply}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, setAutoReply: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="setAutoReply" className="ml-2 text-sm text-gray-700">
                              Set auto-reply message
                            </label>
                          </div>
                          {scheduleForm.actions.setAutoReply && (
                            <textarea
                              placeholder="Auto-reply message..."
                              value={scheduleForm.actions.autoReplyMessage}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, autoReplyMessage: e.target.value}
                              })}
                              className="form-input ml-6 text-sm"
                              rows={3}
                            />
                          )}
                        </div>
                      </div>

                      {/* Data Management */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <DocumentArrowDownIcon className="w-4 h-4 mr-1 text-cyan-600" />
                          Data Management
                        </h4>
                        <div className="ml-5 space-y-2">
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
                              id="transferFiles"
                              checked={scheduleForm.actions.transferFiles}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, transferFiles: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="transferFiles" className="ml-2 text-sm text-gray-700">
                              Transfer files to new owner
                            </label>
                          </div>
                          {scheduleForm.actions.transferFiles && (
                            <input
                              type="email"
                              placeholder="New file owner email"
                              value={scheduleForm.actions.newFileOwner}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, newFileOwner: e.target.value}
                              })}
                              className="form-input ml-6 text-sm"
                            />
                          )}
                        </div>
                      </div>

                      {/* Device Management */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <Cog6ToothIcon className="w-4 h-4 mr-1 text-red-600" />
                          Device Management
                        </h4>
                        <div className="ml-5 space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="retireDevices"
                              checked={scheduleForm.actions.retireDevices}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, retireDevices: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="retireDevices" className="ml-2 text-sm text-gray-700">
                              Retire devices
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="wipeDevices"
                              checked={scheduleForm.actions.wipeDevices}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, wipeDevices: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="wipeDevices" className="ml-2 text-sm text-gray-700">
                              <span className="text-red-600 font-medium">Wipe devices</span>
                              <span className="text-xs text-gray-500 ml-1">(Destructive)</span>
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="removeApps"
                              checked={scheduleForm.actions.removeApps}
                              onChange={(e) => setScheduleForm({
                                ...scheduleForm,
                                actions: {...scheduleForm.actions, removeApps: e.target.checked}
                              })}
                              className="form-checkbox"
                            />
                            <label htmlFor="removeApps" className="ml-2 text-sm text-gray-700">
                              Remove managed apps
                            </label>
                          </div>
                        </div>
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
                            {formatDateTime(schedule.scheduledDate, schedule.scheduledTime, schedule.timezone)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {schedule.timezone}
                          </div>
                          <CountdownTimer 
                            dateString={schedule.scheduledDate}
                            timeString={schedule.scheduledTime}
                            timezone={schedule.timezone}
                            status={schedule.status}
                          />
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
                            {/* Retry button for failed offboardings */}
                            {schedule.status === 'failed' && (
                              <button
                                onClick={() => retryFailedOffboarding(schedule.id)}
                                disabled={executingId === schedule.id}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Retry Offboarding"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteScheduledOffboarding(schedule.id)}
                              disabled={executingId === schedule.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                            {/* View Report button for completed/failed offboardings */}
                            {(schedule.status === 'completed' || schedule.status === 'failed') && (
                              <button
                                onClick={() => viewExecutionReport(schedule.id)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                title="View Execution Report"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                {viewingReportId === schedule.id ? (
                                  <ChevronUpIcon className="h-3 w-3 ml-0.5" />
                                ) : (
                                  <ChevronDownIcon className="h-3 w-3 ml-0.5" />
                                )}
                              </button>
                            )}
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
                      {/* Execution Report Panel */}
                      {viewingReportId === schedule.id && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            {loadingReport ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                <span className="ml-2 text-sm text-gray-600">Loading execution report...</span>
                              </div>
                            ) : executionLogs ? (
                              <div className="space-y-4">
                                {/* Report Header */}
                                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                      Execution Report
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      {executionLogs.targetUserName} ({executionLogs.targetUserEmail})
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">
                                        Started: {formatTimestamp(executionLogs.startTime)}
                                      </p>
                                      {executionLogs.endTime && (
                                        <p className="text-sm text-gray-500">
                                          Ended: {formatTimestamp(executionLogs.endTime)}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => exportExecutionReportToPDF(schedule)}
                                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                      title="Export to PDF"
                                    >
                                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                                      Export PDF
                                    </button>
                                  </div>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="text-2xl font-bold text-gray-900">{executionLogs.totalActions}</div>
                                    <div className="text-xs text-gray-500">Total Actions</div>
                                  </div>
                                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <div className="text-2xl font-bold text-green-600">{executionLogs.successfulActions}</div>
                                    <div className="text-xs text-green-600">Successful</div>
                                  </div>
                                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <div className="text-2xl font-bold text-red-600">{executionLogs.failedActions}</div>
                                    <div className="text-xs text-red-600">Failed</div>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="text-2xl font-bold text-gray-500">{executionLogs.skippedActions}</div>
                                    <div className="text-xs text-gray-500">Skipped</div>
                                  </div>
                                </div>

                                {/* Overall Status */}
                                <div className={`p-3 rounded-lg ${
                                  executionLogs.status === 'completed' ? 'bg-green-100 border border-green-300' :
                                  executionLogs.status === 'partial' ? 'bg-yellow-100 border border-yellow-300' :
                                  executionLogs.status === 'failed' ? 'bg-red-100 border border-red-300' :
                                  'bg-blue-100 border border-blue-300'
                                }`}>
                                  <div className="flex items-center">
                                    {executionLogs.status === 'completed' && <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />}
                                    {executionLogs.status === 'partial' && <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />}
                                    {executionLogs.status === 'failed' && <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />}
                                    {executionLogs.status === 'in-progress' && <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />}
                                    <span className={`font-medium ${
                                      executionLogs.status === 'completed' ? 'text-green-800' :
                                      executionLogs.status === 'partial' ? 'text-yellow-800' :
                                      executionLogs.status === 'failed' ? 'text-red-800' :
                                      'text-blue-800'
                                    }`}>
                                      Status: {executionLogs.status.charAt(0).toUpperCase() + executionLogs.status.slice(1)}
                                    </span>
                                  </div>
                                  {executionLogs.error && (
                                    <p className="mt-2 text-sm text-red-700">{executionLogs.error}</p>
                                  )}
                                </div>

                                {/* Action Details */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-700">Action Details</h4>
                                  </div>
                                  <div className="divide-y divide-gray-200">
                                    {executionLogs.actions && executionLogs.actions.length > 0 ? (
                                      executionLogs.actions.map((action, index) => (
                                        <div key={index} className="px-4 py-3 flex items-start">
                                          <div className="flex-shrink-0 mt-0.5">
                                            {getActionStatusIcon(action.status)}
                                          </div>
                                          <div className="ml-3 flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium text-gray-900">
                                                {action.action.split(/(?=[A-Z])/).join(' ')}
                                              </span>
                                              {getActionStatusBadge(action.status)}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{action.message}</p>
                                            {action.details && (
                                              <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 p-1 rounded">
                                                {action.details}
                                              </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">
                                              {formatTimestamp(action.timestamp)}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-4 py-3 text-sm text-gray-500">
                                        No detailed action logs available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">
                                  No execution report available for this offboarding.
                                </p>
                              </div>
                            )}
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

