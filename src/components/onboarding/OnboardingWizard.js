import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { graphService } from '../../services/graphService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
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
  CalendarIcon,
  DocumentTextIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

const OnboardingWizard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Copy groups from existing user
  const [copyGroupsFromUser, setCopyGroupsFromUser] = useState(false);
  const [copyUserSearchTerm, setCopyUserSearchTerm] = useState('');
  const [copyUserSearchResults, setCopyUserSearchResults] = useState([]);
  const [selectedCopyUser, setSelectedCopyUser] = useState(null);
  const [copyingGroups, setCopyingGroups] = useState(false);
  
  // New user information for onboarding
  const [newUserInfo, setNewUserInfo] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    userPrincipalName: '',
    mailNickname: '',
    email: '',
    createInOnPremAD: false, // Toggle between on-prem AD and Azure AD
  });
  
  // On-premises AD configuration status
  const [adConfigStatus, setAdConfigStatus] = useState({
    configured: false,
    loading: true,
  });
  
  // Onboarding options
  const [onboardingOptions, setOnboardingOptions] = useState({
    enableAccount: true,
    setPassword: true,
    temporaryPassword: '',
    requirePasswordChange: true,
    assignLicenses: true,
    selectedLicenses: [],
    addToGroups: true,
    selectedGroups: [],
    createMailbox: true,
    emailAlias: '',
    setUpDevices: false,
    deviceConfiguration: 'standard',
    shareWelcomeKit: true,
    welcomeMessage: '',
    scheduleTraining: false,
    trainingDate: '',
    managerEmail: '',
    department: '',
    jobTitle: '',
    officeLocation: '',
    businessPhone: '',
  });
  
  const [executionResults, setExecutionResults] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [availableLicenses, setAvailableLicenses] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  const steps = [
    { id: 'user-info', name: 'New User Information', icon: UserIcon },
    { id: 'basic-info', name: 'Job Details', icon: DocumentTextIcon },
    { id: 'options', name: 'Configure Options', icon: CheckCircleIcon },
    { id: 'confirmation', name: 'Confirm & Execute', icon: ShieldCheckIcon },
    { id: 'results', name: 'Results', icon: CheckCircleIcon },
  ];

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
    fetchAvailableResources();
    checkADConfigStatus();
  }, [userId]);

  const checkADConfigStatus = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/ad/config-status`);
      const data = await response.json();
      setAdConfigStatus({
        configured: data.configured,
        loading: false,
        server: data.server,
        domain: data.domain,
      });
    } catch (error) {
      console.error('Error checking AD config:', error);
      setAdConfigStatus({ configured: false, loading: false });
    }
  };

  const fetchAvailableResources = async () => {
    try {
      console.log('📊 Fetching available licenses and groups...');
      
      // Fetch groups
      let groupsData = { value: [] };
      try {
        groupsData = await graphService.getAllGroups();
        console.log(`✅ Loaded ${groupsData.value?.length || 0} groups`);
      } catch (groupError) {
        console.error('❌ Error fetching groups:', groupError);
        toast.error('Failed to load groups. Please check permissions.');
      }
      
      // Fetch licenses
      let licensesData = { value: [] };
      try {
        licensesData = await graphService.getAvailableLicenses();
        console.log(`✅ Loaded ${licensesData.value?.length || 0} licenses`);
      } catch (licenseError) {
        console.error('❌ Error fetching licenses:', licenseError);
        toast.error('Failed to load licenses. Please check permissions.');
      }
      
      setAvailableGroups(groupsData.value || []);
      setAvailableLicenses(licensesData.value || []);
    } catch (error) {
      console.error('❌ Error fetching available resources:', error);
      toast.error('Failed to load onboarding resources');
    }
  };

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

  // Search for users to copy groups from
  const searchCopyUsers = async (term) => {
    if (!term.trim()) {
      setCopyUserSearchResults([]);
      return;
    }
    
    try {
      setCopyingGroups(true);
      const results = await graphService.searchUsers(term);
      setCopyUserSearchResults(results.value || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setCopyingGroups(false);
    }
  };

  // Copy groups from selected user
  const handleCopyGroupsFromUser = async (user) => {
    try {
      setCopyingGroups(true);
      setSelectedCopyUser(user);
      
      console.log(`📋 Copying groups from ${user.displayName}...`);
      const userGroups = await graphService.getUserGroups(user.id);
      
      if (userGroups.value && userGroups.value.length > 0) {
        const groupIds = userGroups.value.map(g => g.id);
        handleOptionChange('selectedGroups', groupIds);
        toast.success(`Copied ${groupIds.length} groups from ${user.displayName}`);
        console.log(`✅ Copied ${groupIds.length} groups`);
      } else {
        toast.info(`${user.displayName} is not a member of any groups`);
      }
    } catch (error) {
      console.error('Error copying groups:', error);
      toast.error('Failed to copy groups from user');
    } finally {
      setCopyingGroups(false);
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
    setOnboardingOptions(prev => ({
      ...prev,
      [option]: value,
    }));
  };

  const validateStep = () => {
    switch (steps[currentStep].id) {
      case 'user-info':
        if (!newUserInfo.firstName || !newUserInfo.lastName || !newUserInfo.userPrincipalName) {
          toast.error('Please fill in all required fields (First Name, Last Name, Username)');
          return false;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUserInfo.userPrincipalName)) {
          toast.error('Please enter a valid email address for the username');
          return false;
        }
        return true;
      case 'basic-info':
        if (!onboardingOptions.department || !onboardingOptions.jobTitle) {
          toast.error('Please fill in all required fields');
          return false;
        }
        return true;
      case 'options':
        if (onboardingOptions.setPassword && !onboardingOptions.temporaryPassword) {
          toast.error('Please provide a temporary password');
          return false;
        }
        if (onboardingOptions.scheduleTraining && !onboardingOptions.trainingDate) {
          toast.error('Please select a training date');
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

  const executeOnboarding = async () => {
    if (!hasPermission('userManagement')) {
      toast.error('You do not have permission to perform onboarding operations');
      return;
    }

    setIsExecuting(true);
    const results = [];

    try {
      // Step 0: Create user (if creating new user in on-prem AD or Azure AD)
      let createdUserId = selectedUser?.id;
      
      if (!selectedUser && newUserInfo.createInOnPremAD) {
        // Create user in on-premises Active Directory
        try {
          const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
          const response = await fetch(`${API_BASE_URL}/api/ad/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              firstName: newUserInfo.firstName,
              lastName: newUserInfo.lastName,
              displayName: newUserInfo.displayName,
              email: newUserInfo.email,
              userPrincipalName: newUserInfo.userPrincipalName,
              samAccountName: newUserInfo.mailNickname,
              password: onboardingOptions.temporaryPassword,
              department: onboardingOptions.department,
              jobTitle: onboardingOptions.jobTitle,
              officeLocation: onboardingOptions.officeLocation,
              phoneNumber: onboardingOptions.businessPhone,
              changePasswordAtLogon: onboardingOptions.requirePasswordChange,
              enabled: onboardingOptions.enableAccount,
            }),
          });

          const data = await response.json();
          
          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to create user in on-premises AD');
          }

          results.push({
            action: 'Create On-Prem AD User',
            status: 'success',
            message: `User created in on-premises AD. Will sync to Azure AD within 30 minutes.`,
            details: data.user,
          });

          // Note: We cannot continue with Azure AD operations until sync completes
          toast.success('User created in on-premises AD! Azure AD sync will take ~30 minutes.');
          setExecutionResults(results);
          setCurrentStep(4); // Move to results step
          setIsExecuting(false);
          return; // Exit early - user must wait for sync

        } catch (error) {
          results.push({
            action: 'Create On-Prem AD User',
            status: 'error',
            message: error.message,
          });
          setExecutionResults(results);
          setCurrentStep(4);
          setIsExecuting(false);
          toast.error('Failed to create user in on-premises AD');
          return;
        }
      }

      // If no selected user and not creating in on-prem AD, user should be searched/selected first
      if (!selectedUser) {
        toast.error('Please select a user to onboard');
        setIsExecuting(false);
        return;
      }
      // 1. Enable account and set password
      if (onboardingOptions.enableAccount) {
        try {
          await graphService.enableUser(selectedUser.id);
          if (onboardingOptions.setPassword) {
            await graphService.setUserPassword(
              selectedUser.id,
              onboardingOptions.temporaryPassword,
              onboardingOptions.requirePasswordChange
            );
          }
          results.push({
            action: 'Account Setup',
            status: 'success',
            message: 'Account enabled and password set',
          });
        } catch (error) {
          results.push({
            action: 'Account Setup',
            status: 'error',
            message: error.message,
          });
        }
      }

      // 2. Update user information
      try {
        await graphService.updateUser(selectedUser.id, {
          department: onboardingOptions.department,
          jobTitle: onboardingOptions.jobTitle,
          officeLocation: onboardingOptions.officeLocation,
          businessPhones: onboardingOptions.businessPhone ? [onboardingOptions.businessPhone] : [],
        });
        results.push({
          action: 'Update Information',
          status: 'success',
          message: 'User information updated',
        });
      } catch (error) {
        results.push({
          action: 'Update Information',
          status: 'error',
          message: error.message,
        });
      }

      // 3. Assign licenses
      if (onboardingOptions.assignLicenses && onboardingOptions.selectedLicenses.length > 0) {
        try {
          await graphService.assignLicenses(selectedUser.id, onboardingOptions.selectedLicenses);
          results.push({
            action: 'License Assignment',
            status: 'success',
            message: `Assigned ${onboardingOptions.selectedLicenses.length} licenses`,
          });
        } catch (error) {
          results.push({
            action: 'License Assignment',
            status: 'error',
            message: error.message,
          });
        }
      }

      // 4. Add to groups
      if (onboardingOptions.addToGroups && onboardingOptions.selectedGroups.length > 0) {
        try {
          let addedCount = 0;
          for (const groupId of onboardingOptions.selectedGroups) {
            await graphService.addUserToGroup(groupId, selectedUser.id);
            addedCount++;
          }
          results.push({
            action: 'Group Membership',
            status: 'success',
            message: `Added to ${addedCount} groups`,
          });
        } catch (error) {
          results.push({
            action: 'Group Membership',
            status: 'error',
            message: error.message,
          });
        }
      }

      // 5. Set up email
      if (onboardingOptions.createMailbox) {
        try {
          if (onboardingOptions.emailAlias) {
            await graphService.setEmailAlias(selectedUser.id, onboardingOptions.emailAlias);
          }
          results.push({
            action: 'Email Setup',
            status: 'success',
            message: 'Mailbox configured successfully',
          });
        } catch (error) {
          results.push({
            action: 'Email Setup',
            status: 'error',
            message: error.message,
          });
        }
      }

      // 6. Send welcome email
      if (onboardingOptions.shareWelcomeKit) {
        try {
          await graphService.sendWelcomeEmail(
            selectedUser.id,
            onboardingOptions.welcomeMessage || 'Welcome to the team!',
            onboardingOptions.managerEmail
          );
          results.push({
            action: 'Welcome Email',
            status: 'success',
            message: 'Welcome email sent successfully',
          });
        } catch (error) {
          results.push({
            action: 'Welcome Email',
            status: 'error',
            message: error.message,
          });
        }
      }

      // 7. Schedule training
      if (onboardingOptions.scheduleTraining && onboardingOptions.trainingDate) {
        try {
          await graphService.scheduleTraining(
            selectedUser.id,
            onboardingOptions.trainingDate,
            onboardingOptions.managerEmail
          );
          results.push({
            action: 'Training Schedule',
            status: 'success',
            message: `Training scheduled for ${onboardingOptions.trainingDate}`,
          });
        } catch (error) {
          results.push({
            action: 'Training Schedule',
            status: 'error',
            message: error.message,
          });
        }
      }

      setExecutionResults(results);
      setCurrentStep(4); // Move to results step
      toast.success('Onboarding process completed');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Onboarding process failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleOptionChange('temporaryPassword', password);
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'user-info':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">New User Information</h3>
            <p className="text-sm text-gray-600 mb-6">
              Enter the details for the new employee you want to onboard.
            </p>
            
            <div className="card">
              <div className="card-body">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="John"
                      value={newUserInfo.firstName}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        setNewUserInfo(prev => ({
                          ...prev,
                          firstName,
                          displayName: `${firstName} ${prev.lastName}`.trim(),
                        }));
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Doe"
                      value={newUserInfo.lastName}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        setNewUserInfo(prev => ({
                          ...prev,
                          lastName,
                          displayName: `${prev.firstName} ${lastName}`.trim(),
                        }));
                      }}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="form-label">Display Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                      value={newUserInfo.displayName}
                      onChange={(e) => setNewUserInfo(prev => ({ ...prev, displayName: e.target.value }))}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Auto-filled from first and last name, but you can customize it
                    </p>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="form-label">Username / Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="john.doe@company.com"
                      value={newUserInfo.userPrincipalName}
                      onChange={(e) => {
                        const email = e.target.value;
                        // Extract mail nickname from email
                        const mailNickname = email.split('@')[0];
                        setNewUserInfo(prev => ({
                          ...prev,
                          userPrincipalName: email,
                          email: email,
                          mailNickname: mailNickname,
                        }));
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will be the user's login email address
                    </p>
                  </div>
                </div>
                
                {/* On-Premises AD Option */}
                {!adConfigStatus.loading && adConfigStatus.configured && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="createInOnPremAD"
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={newUserInfo.createInOnPremAD}
                        onChange={(e) => setNewUserInfo(prev => ({ ...prev, createInOnPremAD: e.target.checked }))}
                      />
                      <label htmlFor="createInOnPremAD" className="ml-3 flex-1">
                        <div className="flex items-center">
                          <ComputerDesktopIcon className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-900">
                            Create user in On-Premises Active Directory
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-green-700">
                          User will be created in on-premises AD ({adConfigStatus.domain}) and automatically 
                          synced to Azure AD via Azure AD Connect within 30 minutes. 
                          <strong className="block mt-1">Note:</strong> Azure AD features (licenses, groups, email) 
                          can only be configured after sync completes.
                        </p>
                      </label>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <UserPlusIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        {newUserInfo.createInOnPremAD ? 'Creating On-Premises User' : 'Creating Cloud User'}
                      </h4>
                      <p className="mt-1 text-sm text-blue-700">
                        {newUserInfo.createInOnPremAD
                          ? 'This wizard will create a new user account in your on-premises Active Directory. The user will sync to Azure AD automatically.'
                          : 'This wizard will create a new user account in your Azure AD with the information provided.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'basic-info':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Job Details & Contact Information</h3>
            <p className="text-sm text-gray-600 mb-6">
              Provide job-related information for {newUserInfo.displayName || 'the new employee'}.
            </p>
            
            <div className="card">
              <div className="card-body">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="form-label">Department *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Engineering, HR, Finance"
                      value={onboardingOptions.department}
                      onChange={(e) => handleOptionChange('department', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Job Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Software Engineer, HR Manager"
                      value={onboardingOptions.jobTitle}
                      onChange={(e) => handleOptionChange('jobTitle', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Office Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., New York, London, Remote"
                      value={onboardingOptions.officeLocation}
                      onChange={(e) => handleOptionChange('officeLocation', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Business Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+1 (555) 123-4567"
                      value={onboardingOptions.businessPhone}
                      onChange={(e) => handleOptionChange('businessPhone', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Manager Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="manager@company.com"
                      value={onboardingOptions.managerEmail}
                      onChange={(e) => handleOptionChange('managerEmail', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'options':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Onboarding Options</h3>
            
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
                      id="enableAccount"
                      className="form-checkbox"
                      checked={onboardingOptions.enableAccount}
                      onChange={(e) => handleOptionChange('enableAccount', e.target.checked)}
                    />
                    <label htmlFor="enableAccount" className="ml-2 text-sm text-gray-700">
                      Enable user account
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="setPassword"
                      className="form-checkbox"
                      checked={onboardingOptions.setPassword}
                      onChange={(e) => handleOptionChange('setPassword', e.target.checked)}
                    />
                    <label htmlFor="setPassword" className="ml-2 text-sm text-gray-700">
                      Set temporary password
                    </label>
                  </div>
                  
                  {onboardingOptions.setPassword && (
                    <div className="ml-6 space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="password"
                          className="form-input flex-1"
                          placeholder="Temporary password"
                          value={onboardingOptions.temporaryPassword}
                          onChange={(e) => handleOptionChange('temporaryPassword', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={generateTemporaryPassword}
                          className="btn btn-secondary"
                        >
                          <KeyIcon className="h-4 w-4 mr-1" />
                          Generate
                        </button>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="requirePasswordChange"
                          className="form-checkbox"
                          checked={onboardingOptions.requirePasswordChange}
                          onChange={(e) => handleOptionChange('requirePasswordChange', e.target.checked)}
                        />
                        <label htmlFor="requirePasswordChange" className="ml-2 text-sm text-gray-700">
                          Require password change on first login
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* License Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">License Assignment</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="assignLicenses"
                      className="form-checkbox"
                      checked={onboardingOptions.assignLicenses}
                      onChange={(e) => handleOptionChange('assignLicenses', e.target.checked)}
                    />
                    <label htmlFor="assignLicenses" className="ml-2 text-sm text-gray-700">
                      Assign licenses
                    </label>
                  </div>
                  
                  {onboardingOptions.assignLicenses && (
                    <div className="ml-6">
                      <label className="form-label">Select Licenses</label>
                      {availableLicenses.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">Loading available licenses...</div>
                      ) : (
                        <select
                          multiple
                          className="form-input min-h-[120px]"
                          value={onboardingOptions.selectedLicenses}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            handleOptionChange('selectedLicenses', selected);
                          }}
                        >
                          {availableLicenses.map((license) => (
                            <option key={license.skuId} value={license.skuId}>
                              {license.displayName || license.skuPartNumber}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Hold Ctrl/Cmd to select multiple licenses
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Group Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Group Membership</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="addToGroups"
                      className="form-checkbox"
                      checked={onboardingOptions.addToGroups}
                      onChange={(e) => handleOptionChange('addToGroups', e.target.checked)}
                    />
                    <label htmlFor="addToGroups" className="ml-2 text-sm text-gray-700">
                      Add to groups
                    </label>
                  </div>
                  
                  {onboardingOptions.addToGroups && (
                    <div className="ml-6 space-y-4">
                      {/* Copy from existing user option */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <input
                            type="checkbox"
                            id="copyGroupsFromUser"
                            className="form-checkbox"
                            checked={copyGroupsFromUser}
                            onChange={(e) => {
                              setCopyGroupsFromUser(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedCopyUser(null);
                                setCopyUserSearchTerm('');
                                setCopyUserSearchResults([]);
                              }
                            }}
                          />
                          <label htmlFor="copyGroupsFromUser" className="ml-2 text-sm font-medium text-blue-900">
                            Copy groups from an existing user
                          </label>
                        </div>
                        
                        {copyGroupsFromUser && (
                          <div className="space-y-3">
                            {selectedCopyUser ? (
                              <div className="p-3 bg-white border border-blue-300 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <UserIcon className="h-8 w-8 text-blue-600 mr-2" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{selectedCopyUser.displayName}</p>
                                      <p className="text-xs text-gray-500">{selectedCopyUser.mail || selectedCopyUser.userPrincipalName}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedCopyUser(null);
                                      setCopyUserSearchTerm('');
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    Change
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="relative">
                                  <input
                                    type="text"
                                    className="form-input text-sm"
                                    placeholder="Search for user by name or email..."
                                    value={copyUserSearchTerm}
                                    onChange={(e) => {
                                      setCopyUserSearchTerm(e.target.value);
                                      searchCopyUsers(e.target.value);
                                    }}
                                  />
                                  {copyingGroups && (
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                  )}
                                </div>
                                
                                {copyUserSearchResults.length > 0 && (
                                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-white">
                                    {copyUserSearchResults.map((user) => (
                                      <div
                                        key={user.id}
                                        onClick={() => handleCopyGroupsFromUser(user)}
                                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="flex items-center">
                                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                                          <div>
                                            <p className="text-xs font-medium text-gray-900">{user.displayName}</p>
                                            <p className="text-xs text-gray-500">{user.mail || user.userPrincipalName}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Manual group selection */}
                      <div>
                        <label className="form-label">
                          {selectedCopyUser ? 'Or manually adjust groups' : 'Select Groups'}
                        </label>
                        {availableGroups.length === 0 ? (
                          <div className="text-sm text-gray-500 italic">Loading available groups...</div>
                        ) : (
                          <select
                            multiple
                            className="form-input min-h-[120px]"
                            value={onboardingOptions.selectedGroups}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              handleOptionChange('selectedGroups', selected);
                            }}
                          >
                            {availableGroups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.displayName}
                              </option>
                            ))}
                          </select>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Hold Ctrl/Cmd to select multiple groups
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Settings */}

              {/* Email Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Email Settings</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="createMailbox"
                      className="form-checkbox"
                      checked={onboardingOptions.createMailbox}
                      onChange={(e) => handleOptionChange('createMailbox', e.target.checked)}
                    />
                    <label htmlFor="createMailbox" className="ml-2 text-sm text-gray-700">
                      Create mailbox
                    </label>
                  </div>
                  
                  {onboardingOptions.createMailbox && (
                    <div className="ml-6">
                      <label className="form-label">Email Alias (optional)</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="alias@company.com"
                        value={onboardingOptions.emailAlias}
                        onChange={(e) => handleOptionChange('emailAlias', e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="shareWelcomeKit"
                      className="form-checkbox"
                      checked={onboardingOptions.shareWelcomeKit}
                      onChange={(e) => handleOptionChange('shareWelcomeKit', e.target.checked)}
                    />
                    <label htmlFor="shareWelcomeKit" className="ml-2 text-sm text-gray-700">
                      Send welcome email
                    </label>
                  </div>
                  
                  {onboardingOptions.shareWelcomeKit && (
                    <div className="ml-6">
                      <label className="form-label">Welcome Message</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Welcome to the team! We're excited to have you join us..."
                        value={onboardingOptions.welcomeMessage}
                        onChange={(e) => handleOptionChange('welcomeMessage', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Training Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900">Training & Orientation</h4>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="scheduleTraining"
                      className="form-checkbox"
                      checked={onboardingOptions.scheduleTraining}
                      onChange={(e) => handleOptionChange('scheduleTraining', e.target.checked)}
                    />
                    <label htmlFor="scheduleTraining" className="ml-2 text-sm text-gray-700">
                      Schedule orientation session
                    </label>
                  </div>
                  
                  {onboardingOptions.scheduleTraining && (
                    <div className="ml-6">
                      <label className="form-label">Training Date</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={onboardingOptions.trainingDate}
                        onChange={(e) => handleOptionChange('trainingDate', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Onboarding Details</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Ready to onboard {newUserInfo.displayName}
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    Review the information below before creating the new user account.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card mb-6">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900">New User Information</h4>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{newUserInfo.displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email / Username</p>
                    <p className="text-sm text-gray-900">{newUserInfo.userPrincipalName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Department</p>
                    <p className="text-sm text-gray-900">{onboardingOptions.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Job Title</p>
                    <p className="text-sm text-gray-900">{onboardingOptions.jobTitle}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900">Selected Actions</h4>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {onboardingOptions.enableAccount && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Create and enable user account
                    </div>
                  )}
                  {onboardingOptions.setPassword && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Set temporary password
                    </div>
                  )}
                  {onboardingOptions.assignLicenses && onboardingOptions.selectedLicenses.length > 0 && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Assign {onboardingOptions.selectedLicenses.length} licenses
                    </div>
                  )}
                  {onboardingOptions.addToGroups && onboardingOptions.selectedGroups.length > 0 && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Add to {onboardingOptions.selectedGroups.length} groups
                    </div>
                  )}
                  {onboardingOptions.createMailbox && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Create mailbox
                    </div>
                  )}
                  {onboardingOptions.shareWelcomeKit && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Send welcome email
                    </div>
                  )}
                  {onboardingOptions.scheduleTraining && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Schedule training for {onboardingOptions.trainingDate}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={executeOnboarding}
                disabled={isExecuting}
                className="btn btn-primary"
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Execute Onboarding
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'results':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Onboarding Results</h3>
            
            <div className="card">
              <div className="card-body">
                <div className="space-y-4">
                  {executionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.status === 'success'
                          ? 'bg-success-50 border-success-200'
                          : 'bg-danger-50 border-danger-200'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {result.status === 'success' ? (
                            <CheckCircleIcon className="h-5 w-5 text-success-400" />
                          ) : (
                            <ExclamationTriangleIcon className="h-5 w-5 text-danger-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">{result.action}</h4>
                          <p className={`mt-1 text-sm ${
                            result.status === 'success' ? 'text-success-700' : 'text-danger-700'
                          }`}>
                            {result.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => navigate('/users')}
                    className="btn btn-secondary"
                  >
                    Back to Users
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
        <h1 className="text-2xl font-bold text-gray-900">Employee Onboarding</h1>
        <p className="mt-1 text-sm text-gray-600">
          Set up new employees with their accounts, licenses, and resources
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
                      : 'border-gray-300'
                  }`}
                  >
                    {currentStep > stepIdx ? (
                      <CheckCircleIcon className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon
                        className={`w-6 h-6 ${
                          currentStep === stepIdx ? 'text-primary-600' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </div>
                  <span className={`ml-4 text-sm font-medium ${
                    currentStep === stepIdx ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > stepIdx ? 'bg-success-600' : 'bg-gray-300'
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

export default OnboardingWizard;