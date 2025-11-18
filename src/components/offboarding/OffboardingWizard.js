import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { graphService } from '../../services/graphService';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  UserMinusIcon,
  UserIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  FolderIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Generate random password (12 characters)
const generateRandomPassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*-_=+';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const OffboardingWizard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const convex = useConvex();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [executionProgress, setExecutionProgress] = useState({
    currentTask: '',
    currentStep: 0,
    totalSteps: 0,
  });
  
  // Offboarding options
  const [offboardingOptions, setOffboardingOptions] = useState({
    disableAccount: true,
    resetPassword: true,
    revokeLicenses: true,
    convertMailbox: false,
    setEmailForwarding: false,
    forwardingAddress: '',
    setAutoReply: false,
    autoReplyMessage: '',
    backupData: false,
    removeFromGroups: true,
    removeFromTeams: true,
    removeFromApps: true,
    removeAuthMethods: true,
    transferFiles: false,
    newFileOwner: '',
    wipeDevices: false,
    retireDevices: false,
    removeApps: false,
  });

  // Offboarding templates
  const offboardingTemplates = [
    {
      id: 'standard',
      name: 'Standard Offboarding',
      description: 'Basic offboarding for most employees',
      icon: UserMinusIcon,
      options: {
        disableAccount: true,
        resetPassword: true,
        revokeLicenses: true,
        convertMailbox: false,
        setEmailForwarding: false,
        forwardingAddress: '',
        setAutoReply: false,
        autoReplyMessage: '',
        backupData: true,
        removeFromGroups: true,
        removeFromTeams: true,
        removeFromApps: true,
        removeAuthMethods: true,
        transferFiles: false,
        newFileOwner: '',
        wipeDevices: false,
        retireDevices: true,
        removeApps: true,
      }
    },
    {
      id: 'executive',
      name: 'Executive Offboarding',
      description: 'Enhanced offboarding for executives with data preservation',
      icon: ShieldCheckIcon,
      options: {
        disableAccount: true,
        resetPassword: true,
        revokeLicenses: true,
        convertMailbox: true,
        setEmailForwarding: true,
        forwardingAddress: '',
        setAutoReply: true,
        autoReplyMessage: 'Thank you for your message. I am no longer with the company. For assistance, please contact my replacement or the department head.',
        backupData: true,
        removeFromGroups: false,
        removeFromTeams: false,
        removeFromApps: false,
        removeAuthMethods: false,
        transferFiles: true,
        newFileOwner: '',
        wipeDevices: false,
        retireDevices: true,
        removeApps: false,
      }
    },
    {
      id: 'contractor',
      name: 'Contractor Offboarding',
      description: 'Quick offboarding for temporary contractors',
      icon: ClockIcon,
      options: {
        disableAccount: true,
        resetPassword: true,
        revokeLicenses: true,
        convertMailbox: false,
        setEmailForwarding: false,
        forwardingAddress: '',
        setAutoReply: false,
        autoReplyMessage: '',
        backupData: false,
        removeFromGroups: true,
        removeFromTeams: true,
        removeFromApps: true,
        removeAuthMethods: true,
        transferFiles: false,
        newFileOwner: '',
        wipeDevices: true,
        retireDevices: false,
        removeApps: true,
      }
    },
    {
      id: 'security',
      name: 'Security Critical Offboarding',
      description: 'Immediate offboarding for security concerns',
      icon: ExclamationTriangleIcon,
      options: {
        disableAccount: true,
        convertMailbox: false,
        setEmailForwarding: false,
        forwardingAddress: '',
        setAutoReply: false,
        autoReplyMessage: '',
        backupData: false,
        removeFromGroups: true,
        removeFromTeams: true,
        removeFromApps: true,
        removeAuthMethods: true,
        transferFiles: true,
        newFileOwner: '',
        wipeDevices: true,
        retireDevices: false,
        removeApps: true,
        revokeLicenses: true,
      }
    }
  ];
  
  const [executionResults, setExecutionResults] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const steps = [
    { id: 'user-selection', name: 'Select User', icon: UserIcon },
    { id: 'options', name: 'Configure Options', icon: CheckCircleIcon },
    { id: 'confirmation', name: 'Confirm & Execute', icon: ShieldCheckIcon },
    { id: 'results', name: 'Results', icon: CheckCircleIcon },
  ];

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [userId]);

  const fetchUser = async (id) => {
    try {
      setLoading(true);
      const userData = await graphService.getUserById(id);
      setSelectedUser(userData);
    } catch (error) {
      logger.error('Error fetching user:', error);
      toast.error('Failed to fetch user details');
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
      logger.error('Error searching users:', error);
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

  const handleOptionChange = (option, value) => {
    console.log(`🔧 Option changed: ${option} = ${value}`);
    setOffboardingOptions(prev => {
      const updated = {
        ...prev,
        [option]: value,
      };
      console.log('📋 Updated options:', updated);
      return updated;
    });
  };

  const applyTemplate = (templateId) => {
    const template = offboardingTemplates.find(t => t.id === templateId);
    if (template) {
      setOffboardingOptions(template.options);
      toast.success(`Applied ${template.name} template`);
    }
  };

  const validateStep = () => {
    switch (steps[currentStep].id) {
      case 'user-selection':
        return selectedUser !== null;
      case 'options':
        if (offboardingOptions.setEmailForwarding && !offboardingOptions.forwardingAddress) {
          toast.error('Please provide a forwarding address');
          return false;
        }
        if (offboardingOptions.transferFiles && !offboardingOptions.newFileOwner) {
          toast.error('Please specify a new file owner');
          return false;
        }
        return true;
      case 'confirmation':
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const executeOffboarding = async () => {
    console.log('🚀 Starting offboarding with options:', offboardingOptions);
    
    if (!hasPermission('userManagement')) {
      toast.error('You do not have permission to perform offboarding operations');
      return;
    }

    setIsExecuting(true);
    const results = [];
    
    // Calculate total steps based on selected options (add 1 for revoke sessions)
    const totalSteps = Object.entries(offboardingOptions).filter(([key, value]) => {
      // Count only boolean options that are true, or device options if either is selected
      if (key === 'wipeDevices' || key === 'retireDevices') {
        return offboardingOptions.wipeDevices || offboardingOptions.retireDevices;
      }
      return typeof value === 'boolean' && value;
    }).length + 1; // +1 for revoke sessions (always executed after disable)
    
    setExecutionProgress({ currentTask: 'Starting offboarding...', currentStep: 0, totalSteps });

    try {
      // 1. Disable account (CRITICAL: Do this first per Microsoft best practices)
      if (offboardingOptions.disableAccount) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Disabling account...', currentStep: prev.currentStep + 1 }));
        try {
          await graphService.disableUser(selectedUser.id);
          results.push({
            action: 'Disable Account',
            status: 'success',
            message: 'Account has been disabled',
          });
        } catch (error) {
          results.push({
            action: 'Disable Account',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Disable Account',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 2. Revoke all sign-in sessions (CRITICAL: Always do this after disabling account)
      setExecutionProgress(prev => ({ ...prev, currentTask: 'Revoking all active sessions...', currentStep: prev.currentStep + 1 }));
      try {
        await graphService.revokeUserSessions(selectedUser.id);
        results.push({
          action: 'Revoke Sessions',
          status: 'success',
          message: 'All active sessions and refresh tokens have been revoked',
        });
      } catch (error) {
        results.push({
          action: 'Revoke Sessions',
          status: 'error',
          message: error.message,
        });
      }

      // 3. Reset password
      if (offboardingOptions.resetPassword) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Resetting password...', currentStep: prev.currentStep + 1 }));
        try {
          const newPassword = generateRandomPassword();
          await graphService.resetUserPassword(selectedUser.id, newPassword, false);
          results.push({
            action: 'Reset Password',
            status: 'success',
            message: `Password has been reset to a random 12-character password. Store securely if needed.`,
          });
        } catch (error) {
          results.push({
            action: 'Reset Password',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Reset Password',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 3. Revoke licenses
      if (offboardingOptions.revokeLicenses) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Revoking licenses...', currentStep: prev.currentStep + 1 }));
        try {
          const licenseResult = await graphService.removeAllLicenses(selectedUser.id);
          results.push({
            action: 'Revoke Licenses',
            status: 'success',
            message: `Removed ${licenseResult.removedCount} license(s)`,
          });
        } catch (error) {
          results.push({
            action: 'Revoke Licenses',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Revoke Licenses',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 4. Convert mailbox
      if (offboardingOptions.convertMailbox) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Converting mailbox to shared...', currentStep: prev.currentStep + 1 }));
        try {
          await graphService.convertToSharedMailbox(selectedUser.id);
          results.push({
            action: 'Convert Mailbox',
            status: 'success',
            message: 'Mailbox converted to shared mailbox',
          });
        } catch (error) {
          results.push({
            action: 'Convert Mailbox',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Convert Mailbox',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 5. Set email forwarding
      if (offboardingOptions.setEmailForwarding) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Setting up email forwarding...', currentStep: prev.currentStep + 1 }));
        try {
          await graphService.setMailForwarding(
            selectedUser.id,
            offboardingOptions.forwardingAddress,
            true
          );
          results.push({
            action: 'Email Forwarding',
            status: 'success',
            message: `Email forwarding set to ${offboardingOptions.forwardingAddress}`,
          });
        } catch (error) {
          results.push({
            action: 'Email Forwarding',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Email Forwarding',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 6. Set auto-reply
      if (offboardingOptions.setAutoReply) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Setting auto-reply message...', currentStep: prev.currentStep + 1 }));
        try {
          await graphService.setAutoReply(
            selectedUser.id,
            true,
            'All',
            offboardingOptions.autoReplyMessage,
            offboardingOptions.autoReplyMessage
          );
          results.push({
            action: 'Auto-Reply',
            status: 'success',
            message: 'Auto-reply message has been set',
          });
        } catch (error) {
          results.push({
            action: 'Auto-Reply',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Auto-Reply',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 7. Backup data
      if (offboardingOptions.backupData) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Backing up user data...', currentStep: prev.currentStep + 1 }));
        try {
          const backupResult = await graphService.backupUserData(selectedUser.id);
          results.push({
            action: 'Data Backup',
            status: 'success',
            message: 'Data backup initiated successfully',
            details: backupResult,
          });
        } catch (error) {
          results.push({
            action: 'Data Backup',
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          action: 'Data Backup',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 8. Remove from groups
      if (offboardingOptions.removeFromGroups) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Removing from groups...', currentStep: prev.currentStep + 1 }));
        try {
          const groupsData = await graphService.getUserGroups(selectedUser.id);
          const groups = groupsData.value || [];
          let removedCount = 0;
          let failedCount = 0;
          
          if (groups.length === 0) {
            results.push({
              action: 'Remove from Groups',
              status: 'success',
              message: 'User is not a member of any groups',
            });
          } else {
            for (const group of groups) {
              try {
                await graphService.removeUserFromGroup(group.id, selectedUser.id);
                removedCount++;
              } catch (error) {
                failedCount++;
                logger.warn(`Failed to remove from group ${group.displayName}:`, error);
              }
            }
            
            const message = failedCount > 0 
              ? `Removed from ${removedCount} groups (${failedCount} failed)`
              : `Removed from ${removedCount} groups`;
            
            results.push({
              action: 'Remove from Groups',
              status: failedCount === groups.length ? 'error' : 'success',
              message: message,
            });
          }
        } catch (error) {
          results.push({
            action: 'Remove from Groups',
            status: 'error',
            message: `Failed to retrieve groups: ${error.message}`,
          });
        }
      } else {
        results.push({
          action: 'Remove from Groups',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 9. Remove from Teams
      if (offboardingOptions.removeFromTeams) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Removing from Teams...', currentStep: prev.currentStep + 1 }));
        try {
          const teamsData = await graphService.getUserTeams(selectedUser.id);
          const teams = teamsData.value || [];
          let removedCount = 0;
          let failedCount = 0;
          
          if (teams.length === 0) {
            results.push({
              action: 'Remove from Teams',
              status: 'success',
              message: 'User is not a member of any teams',
            });
          } else {
            for (const team of teams) {
              try {
                await graphService.removeUserFromTeam(team.id, selectedUser.id);
                removedCount++;
              } catch (error) {
                failedCount++;
                logger.warn(`Failed to remove from team ${team.displayName}:`, error);
              }
            }
            
            const message = failedCount > 0 
              ? `Removed from ${removedCount} teams (${failedCount} failed)`
              : `Removed from ${removedCount} teams`;
            
            results.push({
              action: 'Remove from Teams',
              status: failedCount === teams.length ? 'error' : 'success',
              message: message,
            });
          }
        } catch (error) {
          results.push({
            action: 'Remove from Teams',
            status: 'error',
            message: `Failed to retrieve teams: ${error.message}`,
          });
        }
      } else {
        results.push({
          action: 'Remove from Teams',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 10. Remove from Enterprise Applications
      if (hasPermission('application') && offboardingOptions.removeFromApps) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Removing from enterprise applications...', currentStep: prev.currentStep + 1 }));
        try {
          const appsData = await graphService.getUserAppRoleAssignments(selectedUser.id);
          const apps = appsData.value || [];
          let removedCount = 0;
          let failedCount = 0;

          if (apps.length === 0) {
            results.push({
              action: 'Remove from Enterprise Applications',
              status: 'success',
              message: 'User has no enterprise application assignments',
            });
          } else {
            for (const app of apps) {
              try {
                await graphService.removeUserFromEnterpriseApp(selectedUser.id, app.id);
                removedCount++;
              } catch (error) {
                failedCount++;
                logger.warn(`Failed to remove from ${app.appDisplayName}:`, error);
              }
            }

            const message = failedCount > 0
              ? `Removed from ${removedCount} apps (${failedCount} failed)`
              : `Removed from ${removedCount} apps`;

            results.push({
              action: 'Remove from Enterprise Applications',
              status: failedCount === apps.length ? 'error' : 'success',
              message: message,
            });
          }
        } catch (error) {
          results.push({
            action: 'Remove from Enterprise Applications',
            status: 'error',
            message: `Failed to retrieve applications: ${error.message}`,
          });
        }
      } else {
        results.push({
          action: 'Remove from Enterprise Applications',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 11. Remove Authentication Methods
      if (hasPermission('userAuthenticationMethod') && offboardingOptions.removeAuthMethods) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Removing authentication methods...', currentStep: prev.currentStep + 1 }));
        try {
          const authMethodsData = await graphService.getUserAuthenticationMethods(selectedUser.id);
          const authMethods = authMethodsData.value || [];
          let removedCount = 0;
          let failedCount = 0;

          if (authMethods.length === 0) {
            results.push({
              action: 'Remove Authentication Methods',
              status: 'success',
              message: 'User has no authentication methods to remove',
            });
          } else {
            for (const method of authMethods) {
              try {
                await graphService.removeAuthenticationMethod(selectedUser.id, method.id, method.methodType);
                removedCount++;
              } catch (error) {
                failedCount++;
                logger.warn(`Failed to remove ${method.displayName}:`, error);
              }
            }

            const message = failedCount > 0
              ? `Removed ${removedCount} authentication methods (${failedCount} failed)`
              : `Removed ${removedCount} authentication methods`;

            results.push({
              action: 'Remove Authentication Methods',
              status: failedCount === authMethods.length ? 'error' : 'success',
              message: message,
            });
          }
        } catch (error) {
          results.push({
            action: 'Remove Authentication Methods',
            status: 'error',
            message: `Failed to retrieve authentication methods: ${error.message}`,
          });
        }
      } else {
        results.push({
          action: 'Remove Authentication Methods',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      // 12. Handle devices
      if (hasPermission('deviceManagement') && (offboardingOptions.wipeDevices || offboardingOptions.retireDevices)) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Managing devices...', currentStep: prev.currentStep + 1 }));
        try {
          const devicesData = await graphService.getUserDevices(selectedUser.userPrincipalName);
          const devices = devicesData.value || [];
          let processedDevices = 0;
          let failedDevices = 0;
          
          if (devices.length === 0) {
            results.push({
              action: 'Device Management',
              status: 'success',
              message: 'User has no enrolled devices',
            });
          } else {
            for (const device of devices) {
              try {
                if (offboardingOptions.wipeDevices) {
                  await graphService.wipeDevice(device.id, false, false);
                } else if (offboardingOptions.retireDevices) {
                  await graphService.retireDevice(device.id);
                }
                processedDevices++;
              } catch (error) {
                failedDevices++;
                logger.warn(`Failed to process device ${device.deviceName}:`, error);
              }
            }
            
            const action = offboardingOptions.wipeDevices ? 'Wiped' : 'Retired';
            const message = failedDevices > 0
              ? `${action} ${processedDevices} devices (${failedDevices} failed)`
              : `${action} ${processedDevices} devices`;
            
            results.push({
              action: 'Device Management',
              status: failedDevices === devices.length ? 'error' : 'success',
              message: message,
            });
          }
        } catch (error) {
          results.push({
            action: 'Device Management',
            status: 'error',
            message: `Failed to retrieve devices: ${error.message}`,
          });
        }
      } else {
        results.push({
          action: 'Device Management',
          status: 'skipped',
          message: 'Not selected',
        });
      }

      setExecutionProgress({ currentTask: 'Completed!', currentStep: totalSteps, totalSteps });

      setExecutionResults(results);
      setCurrentStep(3); // Move to results step

      // Log execution to Convex for audit trail
      const endTime = Date.now();
      const startTime = endTime - 60000; // Approximate start time (will be more accurate in production)
      
      try {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          // Determine overall status
          const hasErrors = results.some(r => r.status === 'error');
          const allSkipped = results.every(r => r.status === 'skipped');
          const overallStatus = hasErrors ? 'partial' : allSkipped ? 'failed' : 'completed';

          // Log to Convex database
          await convex.mutation(api.offboarding.logExecution, {
            sessionId,
            targetUserId: selectedUser.id,
            targetUserName: selectedUser.displayName,
            targetUserEmail: selectedUser.mail || selectedUser.userPrincipalName,
            executionType: 'immediate',
            startTime,
            endTime,
            status: overallStatus,
            actions: results.map((result, index) => ({
              action: result.action,
              status: result.status,
              message: result.message,
              timestamp: startTime + (index * 5000), // Approximate timestamps
            })),
          });
          
          logger.info('✅ Execution logged to Convex database');
        }
      } catch (logError) {
        logger.error('Failed to log execution to Convex:', logError);
        // Don't fail the offboarding if logging fails
      }

      toast.success('Offboarding process completed');
    } catch (error) {
      logger.error('Offboarding error:', error);
      
      // Log failure to Convex
      try {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && selectedUser) {
          await convex.mutation(api.offboarding.logExecution, {
            sessionId,
            targetUserId: selectedUser.id,
            targetUserName: selectedUser.displayName,
            targetUserEmail: selectedUser.mail || selectedUser.userPrincipalName,
            executionType: 'immediate',
            startTime: Date.now() - 30000,
            endTime: Date.now(),
            status: 'failed',
            actions: results.map((result, index) => ({
              action: result.action,
              status: result.status,
              message: result.message,
              timestamp: Date.now() - (results.length - index) * 1000,
            })),
            error: error.message,
          });
        }
      } catch (logError) {
        logger.error('Failed to log error to Convex:', logError);
      }

      toast.error('Offboarding process failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'user-selection':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Select User to Offboard</h3>
            
            {selectedUser ? (
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <UserIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">{selectedUser.displayName}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.mail || selectedUser.userPrincipalName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="btn btn-secondary"
                    >
                      Change User
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="form-label">Search for user</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter name or email"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searching && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="card">
                    <div className="card-body">
                      <div className="space-y-2">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                  <UserIcon className="h-5 w-5 text-primary-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                                <p className="text-sm text-gray-500">{user.mail || user.userPrincipalName}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'options':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configure Offboarding Options</h3>
            
            {/* Templates Section */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Templates</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {offboardingTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <template.icon className="h-6 w-6 text-primary-500 dark:text-primary-400" />
                      </div>
                      <div className="ml-3">
                        <h5 className="text-sm font-medium text-gray-900">{template.name}</h5>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Account Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Account Settings</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="disableAccount"
                      className="form-checkbox"
                      checked={offboardingOptions.disableAccount}
                      onChange={(e) => handleOptionChange('disableAccount', e.target.checked)}
                    />
                    <label htmlFor="disableAccount" className="ml-2 text-sm text-gray-700">
                      Disable user account
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="convertMailbox"
                      className="form-checkbox"
                      checked={offboardingOptions.convertMailbox}
                      onChange={(e) => handleOptionChange('convertMailbox', e.target.checked)}
                    />
                    <label htmlFor="convertMailbox" className="ml-2 text-sm text-gray-700">
                      Convert mailbox to shared mailbox
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="revokeLicenses"
                      className="form-checkbox"
                      checked={offboardingOptions.revokeLicenses}
                      onChange={(e) => handleOptionChange('revokeLicenses', e.target.checked)}
                    />
                    <label htmlFor="revokeLicenses" className="ml-2 text-sm text-gray-700">
                      Revoke all licenses
                    </label>
                  </div>
                </div>
              </div>

              {/* Email Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Email Settings</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="setEmailForwarding"
                      className="form-checkbox"
                      checked={offboardingOptions.setEmailForwarding}
                      onChange={(e) => handleOptionChange('setEmailForwarding', e.target.checked)}
                    />
                    <label htmlFor="setEmailForwarding" className="ml-2 text-sm text-gray-700">
                      Set email forwarding
                    </label>
                  </div>
                  
                  {offboardingOptions.setEmailForwarding && (
                    <div className="ml-6">
                      <label className="form-label">Forwarding Address</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="manager@company.com"
                        value={offboardingOptions.forwardingAddress}
                        onChange={(e) => handleOptionChange('forwardingAddress', e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="setAutoReply"
                      className="form-checkbox"
                      checked={offboardingOptions.setAutoReply}
                      onChange={(e) => handleOptionChange('setAutoReply', e.target.checked)}
                    />
                    <label htmlFor="setAutoReply" className="ml-2 text-sm text-gray-700">
                      Set auto-reply message
                    </label>
                  </div>
                  
                  {offboardingOptions.setAutoReply && (
                    <div className="ml-6">
                      <label className="form-label">Auto-Reply Message</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Thank you for your message. I am no longer with the company. For assistance, please contact..."
                        value={offboardingOptions.autoReplyMessage}
                        onChange={(e) => handleOptionChange('autoReplyMessage', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Data and Files */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Data and Files</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="backupData"
                      className="form-checkbox"
                      checked={offboardingOptions.backupData}
                      onChange={(e) => handleOptionChange('backupData', e.target.checked)}
                    />
                    <label htmlFor="backupData" className="ml-2 text-sm text-gray-700">
                      Backup user data (OneDrive, emails)
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="transferFiles"
                      className="form-checkbox"
                      checked={offboardingOptions.transferFiles}
                      onChange={(e) => handleOptionChange('transferFiles', e.target.checked)}
                    />
                    <label htmlFor="transferFiles" className="ml-2 text-sm text-gray-700">
                      Transfer file ownership
                    </label>
                  </div>
                  
                  {offboardingOptions.transferFiles && (
                    <div className="ml-6">
                      <label className="form-label">New File Owner</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="manager@company.com"
                        value={offboardingOptions.newFileOwner}
                        onChange={(e) => handleOptionChange('newFileOwner', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Groups and Teams */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Groups and Teams</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="removeFromGroups"
                      className="form-checkbox"
                      checked={offboardingOptions.removeFromGroups}
                      onChange={(e) => handleOptionChange('removeFromGroups', e.target.checked)}
                    />
                    <label htmlFor="removeFromGroups" className="ml-2 text-sm text-gray-700">
                      Remove from all groups
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="removeFromTeams"
                      className="form-checkbox"
                      checked={offboardingOptions.removeFromTeams}
                      onChange={(e) => handleOptionChange('removeFromTeams', e.target.checked)}
                    />
                    <label htmlFor="removeFromTeams" className="ml-2 text-sm text-gray-700">
                      Remove from all Teams
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="removeFromApps"
                      className="form-checkbox"
                      checked={offboardingOptions.removeFromApps}
                      onChange={(e) => handleOptionChange('removeFromApps', e.target.checked)}
                    />
                    <label htmlFor="removeFromApps" className="ml-2 text-sm text-gray-700">
                      Remove from all enterprise applications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="removeAuthMethods"
                      className="form-checkbox"
                      checked={offboardingOptions.removeAuthMethods}
                      onChange={(e) => handleOptionChange('removeAuthMethods', e.target.checked)}
                    />
                    <label htmlFor="removeAuthMethods" className="ml-2 text-sm text-gray-700">
                      Remove all authentication methods (MFA, phone, email)
                    </label>
                  </div>
                </div>
              </div>

              {/* Device Management */}
              {hasPermission('deviceManagement') && (
                <div className="card">
                  <div className="card-header">
                    <h4 className="text-md font-medium text-gray-900">Device Management (Intune)</h4>
                  </div>
                  <div className="card-body space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="wipeDevices"
                        className="form-checkbox"
                        checked={offboardingOptions.wipeDevices}
                        onChange={(e) => handleOptionChange('wipeDevices', e.target.checked)}
                      />
                      <label htmlFor="wipeDevices" className="ml-2 text-sm text-gray-700">
                        Wipe all devices
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="retireDevices"
                        className="form-checkbox"
                        checked={offboardingOptions.retireDevices}
                        onChange={(e) => handleOptionChange('retireDevices', e.target.checked)}
                      />
                      <label htmlFor="retireDevices" className="ml-2 text-sm text-gray-700">
                        Retire devices (company data only)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="removeApps"
                        className="form-checkbox"
                        checked={offboardingOptions.removeApps}
                        onChange={(e) => handleOptionChange('removeApps', e.target.checked)}
                      />
                      <label htmlFor="removeApps" className="ml-2 text-sm text-gray-700">
                        Remove app assignments
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Confirm Offboarding Details</h3>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Warning: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                    You are about to offboard {selectedUser.displayName}. This will permanently change their account settings and access.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card mb-6">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">User Information</h4>
              </div>
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{selectedUser.displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.mail || selectedUser.userPrincipalName}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Selected Actions</h4>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {offboardingOptions.disableAccount && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Disable user account
                    </div>
                  )}
                  {offboardingOptions.resetPassword && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Reset password
                    </div>
                  )}
                  {offboardingOptions.revokeLicenses && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Revoke all licenses
                    </div>
                  )}
                  {offboardingOptions.convertMailbox && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Convert mailbox to shared mailbox
                    </div>
                  )}
                  {offboardingOptions.setEmailForwarding && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Set email forwarding to {offboardingOptions.forwardingAddress}
                    </div>
                  )}
                  {offboardingOptions.setAutoReply && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Set auto-reply message
                    </div>
                  )}
                  {offboardingOptions.backupData && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Backup user data
                    </div>
                  )}
                  {offboardingOptions.removeFromGroups && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Remove from all groups
                    </div>
                  )}
                  {offboardingOptions.removeFromTeams && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Remove from all Teams
                    </div>
                  )}
                  {offboardingOptions.transferFiles && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Transfer file ownership to {offboardingOptions.newFileOwner}
                    </div>
                  )}
                  {offboardingOptions.wipeDevices && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Wipe all devices
                    </div>
                  )}
                  {offboardingOptions.retireDevices && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Retire devices
                    </div>
                  )}
                  {offboardingOptions.removeApps && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Remove app assignments
                    </div>
                  )}
                  {offboardingOptions.removeAuthMethods && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Remove authentication methods
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={executeOffboarding}
                disabled={isExecuting}
                className="btn btn-danger"
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <UserMinusIcon className="h-4 w-4 mr-2" />
                    Execute Offboarding
                  </>
                )}
              </button>
            </div>
            
            {/* Progress Display */}
            {isExecuting && executionProgress.totalSteps > 0 && (
              <div className="mt-6 card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {executionProgress.currentTask}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {executionProgress.currentStep} / {executionProgress.totalSteps}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(executionProgress.currentStep / executionProgress.totalSteps) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'results':
        const successCount = executionResults.filter(r => r.status === 'success').length;
        const errorCount = executionResults.filter(r => r.status === 'error').length;
        const skippedCount = executionResults.filter(r => r.status === 'skipped').length;
        const allSuccessful = errorCount === 0 && skippedCount === 0;
        const partialSuccess = successCount > 0 && errorCount > 0;
        
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Offboarding Results</h3>
            
            {/* Summary Card */}
            <div className={`card mb-6 border-l-4 ${
              allSuccessful 
                ? 'border-l-success-500 bg-success-50 dark:bg-success-900/20' 
                : partialSuccess
                ? 'border-l-warning-500 bg-warning-50 dark:bg-warning-900/20'
                : errorCount > 0
                ? 'border-l-danger-500 bg-danger-50 dark:bg-danger-900/20'
                : 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
            }`}>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      allSuccessful 
                        ? 'text-success-900 dark:text-success-200' 
                        : partialSuccess
                        ? 'text-warning-900 dark:text-warning-200'
                        : errorCount > 0
                        ? 'text-danger-900 dark:text-danger-200'
                        : 'text-gray-900 dark:text-gray-200'
                    }`}>
                      {allSuccessful 
                        ? '✓ Offboarding Completed Successfully' 
                        : partialSuccess
                        ? '⚠ Offboarding Completed with Issues'
                        : errorCount > 0
                        ? '✗ Offboarding Completed with Errors'
                        : 'Offboarding Summary'
                      }
                    </p>
                    <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                      {successCount} successful{errorCount > 0 ? `, ${errorCount} errors` : ''}{skippedCount > 0 ? `, ${skippedCount} skipped` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{successCount}/{executionResults.length - skippedCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tasks Completed</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detailed Results */}
            <div className="card">
              <div className="card-body">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Details</h4>
                <div className="space-y-3">
                  {executionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.status === 'success'
                          ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                          : result.status === 'error'
                          ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
                          : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {result.status === 'success' ? (
                            <div className="flex items-center justify-center w-5 h-5 bg-success-100 dark:bg-success-900/40 rounded-full">
                              <CheckCircleIcon className="h-4 w-4 text-success-600 dark:text-success-400" />
                            </div>
                          ) : result.status === 'error' ? (
                            <div className="flex items-center justify-center w-5 h-5 bg-danger-100 dark:bg-danger-900/40 rounded-full">
                              <ExclamationTriangleIcon className="h-4 w-4 text-danger-600 dark:text-danger-400" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.action}</h5>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              result.status === 'success'
                                ? 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300'
                                : result.status === 'error'
                                ? 'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {result.status === 'success' ? 'Success' : result.status === 'error' ? 'Error' : 'Skipped'}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm ${
                            result.status === 'success' 
                              ? 'text-success-700 dark:text-success-300' 
                              : result.status === 'error'
                              ? 'text-danger-700 dark:text-danger-300'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {result.message}
                          </p>
                          {result.details && (
                            <details className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              <summary className="cursor-pointer font-medium hover:text-gray-900 dark:hover:text-gray-300">Show details</summary>
                              <pre className="mt-1 p-2 bg-gray-900/50 text-gray-100 rounded text-xs overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn btn-secondary"
                  >
                    Start Another Offboarding
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-primary"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Offboarding</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Guide users through the offboarding process with customizable options
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li
                key={step.id}
                className={`${stepIdx !== steps.length - 1 ? 'flex-1' : ''} ${
                  currentStep > stepIdx ? 'step-complete' : currentStep === stepIdx ? 'step-active' : 'step-inactive'
                }`}
              >
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep > stepIdx
                      ? 'bg-success-600 border-success-600'
                      : currentStep === stepIdx
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  >
                    {currentStep > stepIdx ? (
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon
                        className={`w-6 h-6 ${
                          currentStep === stepIdx ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      />
                    )}
                  </div>
                  <span className={`ml-4 text-sm font-medium ${
                    currentStep === stepIdx ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > stepIdx ? 'bg-success-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      {currentStep < steps.length - 1 && (
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>
          
          <button
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === steps.length - 2 ? 'Confirm' : 'Next'}
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  );
};

export default OffboardingWizard;
