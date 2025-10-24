import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { graphService } from '../../services/graphService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
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
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
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
    transferFiles: false,
    newFileOwner: '',
    wipeDevices: true,
    retireDevices: false,
    removeApps: true,
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
      console.error('Error fetching user:', error);
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

  const handleOptionChange = (option, value) => {
    setOffboardingOptions(prev => ({
      ...prev,
      [option]: value,
    }));
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
    if (!hasPermission('userManagement')) {
      toast.error('You do not have permission to perform offboarding operations');
      return;
    }

    setIsExecuting(true);
    const results = [];

    try {
      // 1. Disable account
      if (offboardingOptions.disableAccount) {
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
      }

      // 2. Reset password
      if (offboardingOptions.resetPassword) {
        try {
          const newPassword = generateRandomPassword();
          await graphService.setUserPassword(selectedUser.id, newPassword, false);
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
      }

      // 3. Revoke licenses
      if (offboardingOptions.revokeLicenses) {
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
      }

      // 4. Convert mailbox
      if (offboardingOptions.convertMailbox) {
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
      }

      // 5. Set email forwarding
      if (offboardingOptions.setEmailForwarding) {
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
      }

      // 6. Set auto-reply
      if (offboardingOptions.setAutoReply) {
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
      }

      // 7. Backup data
      if (offboardingOptions.backupData) {
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
      }

      // 8. Remove from groups
      if (offboardingOptions.removeFromGroups) {
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
                console.warn(`Failed to remove from group ${group.displayName}:`, error);
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
      }

      // 9. Remove from Teams
      if (offboardingOptions.removeFromTeams) {
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
                console.warn(`Failed to remove from team ${team.displayName}:`, error);
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
      }

      // 10. Handle devices
      if (hasPermission('deviceManagement') && (offboardingOptions.wipeDevices || offboardingOptions.retireDevices)) {
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
                console.warn(`Failed to process device ${device.deviceName}:`, error);
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
      }

      setExecutionResults(results);
      setCurrentStep(3); // Move to results step
      toast.success('Offboarding process completed');
    } catch (error) {
      console.error('Offboarding error:', error);
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
                  {offboardingOptions.revokeLicenses && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Revoke all licenses
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
          </div>
        );

      case 'results':
        const successCount = executionResults.filter(r => r.status === 'success').length;
        const errorCount = executionResults.filter(r => r.status === 'error').length;
        const allSuccessful = errorCount === 0;
        
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Offboarding Results</h3>
            
            {/* Summary Card */}
            <div className={`card mb-6 border-l-4 ${
              allSuccessful 
                ? 'border-l-success-500 bg-success-50 dark:bg-success-900/20' 
                : 'border-l-warning-500 bg-warning-50 dark:bg-warning-900/20'
            }`}>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      allSuccessful 
                        ? 'text-success-900 dark:text-success-200' 
                        : 'text-warning-900 dark:text-warning-200'
                    }`}>
                      {allSuccessful ? '✓ Offboarding Completed Successfully' : '⚠ Offboarding Completed with Issues'}
                    </p>
                    <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                      {successCount} successful, {errorCount} errors
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{successCount}/{executionResults.length}</p>
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
                          : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {result.status === 'success' ? (
                            <div className="flex items-center justify-center w-5 h-5 bg-success-100 dark:bg-success-900/40 rounded-full">
                              <CheckCircleIcon className="h-4 w-4 text-success-600 dark:text-success-400" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-5 h-5 bg-danger-100 dark:bg-danger-900/40 rounded-full">
                              <ExclamationTriangleIcon className="h-4 w-4 text-danger-600 dark:text-danger-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{result.action}</h5>
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              result.status === 'success'
                                ? 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300'
                                : 'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300'
                            }`}>
                              {result.status === 'success' ? 'Success' : 'Error'}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm ${
                            result.status === 'success' 
                              ? 'text-success-700 dark:text-success-300' 
                              : 'text-danger-700 dark:text-danger-300'
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