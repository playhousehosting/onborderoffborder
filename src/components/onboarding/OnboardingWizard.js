import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActiveService, getAuthMode } from '../../services/serviceFactory';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import { getGroupsForDepartment, hasMappedGroups } from '../../utils/departmentMappings';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/apiConfig';
import { exportOnboardingResultsToPDF } from '../../utils/pdfExport';
import toast from 'react-hot-toast';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

// Helper function to generate a temporary password
const generateTempPassword = () => {
  const length = 16;
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Ensure at least one of each required type
  let password = 
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const OnboardingWizard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  const convex = useConvex();
  
  // Use serviceFactory to get the correct service based on auth mode
  const authMode = getAuthMode();
  const service = getActiveService();
  
  // Determine which auth is active based on serviceFactory mode
  const isConvexAuth = authMode === 'convex';
  const isMSALAuth = authMode === 'msal';
  const hasPermission = (permission) => {
    return isConvexAuth ? convexAuth.hasPermission(permission) : msalAuth.hasPermission(permission);
  };
  
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
  
  // Onboarding mode: 'create' for new user, 'existing' for AD-synced user
  const [onboardingMode, setOnboardingMode] = useState('create');
  
  // Existing user search (for AD-synced users)
  const [existingUserSearchTerm, setExistingUserSearchTerm] = useState('');
  const [existingUserSearchResults, setExistingUserSearchResults] = useState([]);
  const [searchingExistingUsers, setSearchingExistingUsers] = useState(false);
  
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
      const response = await fetch(`${apiConfig.baseURL}/api/ad/config-status`, {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setAdConfigStatus({
        configured: data.configured,
        loading: false,
        server: data.server,
        domain: data.domain,
      });
    } catch (error) {
      // Backend not running or not configured - this is okay, just disable AD features
      console.warn('⚠️ Backend AD service not available:', error.message);
      setAdConfigStatus({ configured: false, loading: false });
    }
  };

  const fetchAvailableResources = async () => {
    try {
      logger.debug('📊 Fetching available licenses and groups...');
      
      // Fetch groups
      let groupsData = { value: [] };
      try {
        groupsData = await service.getAllGroups();
        console.log(`✅ Loaded ${groupsData.value?.length || 0} groups`);
      } catch (groupError) {
        console.error('❌ Error fetching groups:', groupError);
        toast.error('Failed to load groups. Please check permissions.');
      }
      
      // Fetch licenses
      let licensesData = { value: [] };
      try {
        licensesData = await service.getAvailableLicenses();
        logger.success(`✅ Loaded ${licensesData.value?.length || 0} licenses`);
      } catch (licenseError) {
        logger.error('❌ Error fetching licenses:', licenseError);
        toast.error('Failed to load licenses. Please check permissions.');
      }
      
      setAvailableGroups(groupsData.value || []);
      setAvailableLicenses(licensesData.value || []);
    } catch (error) {
      logger.error('❌ Error fetching available resources:', error);
      toast.error('Failed to load onboarding resources');
    }
  };

  const fetchUser = async (id) => {
    try {
      setLoading(true);
      const userData = await service.getUserById(id);
      setSelectedUser(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  // Search for existing users (AD-synced users that need M365 onboarding)
  const searchExistingUsers = async (term) => {
    if (!term.trim()) {
      setExistingUserSearchResults([]);
      return;
    }
    
    try {
      setSearchingExistingUsers(true);
      const results = await service.searchUsers(term);
      // Filter to show users - you can add filters here for specific criteria
      // e.g., users without licenses, users from on-prem sync, etc.
      setExistingUserSearchResults(results.value || []);
    } catch (error) {
      console.error('Error searching existing users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchingExistingUsers(false);
    }
  };

  // Handle selecting an existing user for onboarding
  const handleSelectExistingUser = (user) => {
    setSelectedUser(user);
    // Pre-populate the new user info from the existing user
    setNewUserInfo({
      firstName: user.givenName || '',
      lastName: user.surname || '',
      displayName: user.displayName || '',
      userPrincipalName: user.userPrincipalName || '',
      mailNickname: user.mailNickname || '',
      email: user.mail || user.userPrincipalName || '',
      createInOnPremAD: false,
    });
    // Pre-populate job details if available
    setOnboardingOptions(prev => ({
      ...prev,
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      officeLocation: user.officeLocation || '',
      businessPhone: user.businessPhones?.[0] || '',
      managerEmail: user.manager?.mail || '',
    }));
    toast.success(`Selected ${user.displayName} for onboarding`);
  };

  // Debounced search for existing users
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (existingUserSearchTerm) {
        searchExistingUsers(existingUserSearchTerm);
      } else {
        setExistingUserSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [existingUserSearchTerm]);

  // Search for users to copy groups from
  const searchCopyUsers = async (term) => {
    if (!term.trim()) {
      setCopyUserSearchResults([]);
      return;
    }
    
    try {
      setCopyingGroups(true);
      const results = await service.searchUsers(term);
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
      const userGroups = await service.getUserGroups(user.id);
      
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

  const handleOptionChange = (option, value) => {
    setOnboardingOptions(prev => {
      const updated = {
        ...prev,
        [option]: value,
      };

      // If department is changed, auto-select mapped groups
      if (option === 'department' && value) {
        const mappedGroupIds = getGroupsForDepartment(value);
        if (mappedGroupIds.length > 0) {
          updated.selectedGroups = [...new Set([...prev.selectedGroups, ...mappedGroupIds])];
          updated.addToGroups = true;
          toast.success(`Automatically selected ${mappedGroupIds.length} groups for ${value} department`);
        }
      }

      return updated;
    });
  };

  const validateStep = () => {
    switch (steps[currentStep].id) {
      case 'user-info':
        // For existing user mode, just check if a user is selected
        if (onboardingMode === 'existing') {
          if (!selectedUser) {
            toast.error('Please search and select an existing user');
            return false;
          }
          return true;
        }
        // For create mode, validate the new user fields
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
        // For existing users, password might not be required
        if (onboardingMode === 'create' && onboardingOptions.setPassword && !onboardingOptions.temporaryPassword) {
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
    
    // Determine if we need to create a user or use an existing one
    const isCreatingNewUser = onboardingMode === 'create' && !selectedUser;
    const isOnboardingExistingUser = onboardingMode === 'existing' && selectedUser;
    
    // Validate we have what we need
    if (isCreatingNewUser && !newUserInfo.firstName) {
      toast.error('Please fill in the new user information');
      setIsExecuting(false);
      return;
    }
    
    if (isOnboardingExistingUser && !selectedUser?.id) {
      toast.error('Please select an existing user to onboard');
      setIsExecuting(false);
      return;
    }

    // If neither mode is valid, show appropriate error
    if (!isCreatingNewUser && !isOnboardingExistingUser && !selectedUser) {
      toast.error('Please either create a new user or select an existing user to onboard');
      setIsExecuting(false);
      return;
    }
    
    // Calculate total steps
    let totalSteps = 0;
    if (isCreatingNewUser) totalSteps++; // User creation
    if (isOnboardingExistingUser && onboardingOptions.enableAccount) totalSteps++; // Enable account (only for existing)
    totalSteps++; // Update Information is always done
    if (onboardingOptions.assignLicenses && onboardingOptions.selectedLicenses.length > 0) totalSteps++;
    if (onboardingOptions.addToGroups && onboardingOptions.selectedGroups.length > 0) totalSteps++;
    if (onboardingOptions.createMailbox) totalSteps++;
    if (onboardingOptions.shareWelcomeKit) totalSteps++;
    if (onboardingOptions.scheduleTraining && onboardingOptions.trainingDate) totalSteps++;
    
    setExecutionProgress({ currentTask: 'Starting onboarding...', currentStep: 0, totalSteps });

    try {
      // The user ID we'll use for all operations
      let targetUserId = selectedUser?.id || null;
      let targetUserDisplayName = selectedUser?.displayName || newUserInfo.displayName;
      let didCreateUser = false;
      
      // ===== STEP: CREATE USER (if needed) =====
      if (isCreatingNewUser) {
        if (newUserInfo.createInOnPremAD) {
          // Create user in on-premises Active Directory
          setExecutionProgress(prev => ({ ...prev, currentTask: 'Creating user in On-Premises AD...', currentStep: prev.currentStep + 1 }));
          try {
            const response = await fetch(`${apiConfig.baseURL}/api/ad/create-user`, {
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
              message: `User ${newUserInfo.displayName} created in on-premises AD. Will sync to Azure AD within 30 minutes.`,
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
        } else {
          // Create user in Azure AD (cloud-only)
          setExecutionProgress(prev => ({ ...prev, currentTask: 'Creating user in Azure AD...', currentStep: prev.currentStep + 1 }));
          try {
            const newUser = await service.createUser({
              accountEnabled: onboardingOptions.enableAccount !== false,
              displayName: newUserInfo.displayName,
              givenName: newUserInfo.firstName,
              surname: newUserInfo.lastName,
              mailNickname: newUserInfo.mailNickname || newUserInfo.firstName.toLowerCase(),
              userPrincipalName: newUserInfo.userPrincipalName,
              passwordProfile: {
                forceChangePasswordNextSignIn: onboardingOptions.requirePasswordChange !== false,
                password: onboardingOptions.temporaryPassword || generateTempPassword(),
              },
              department: onboardingOptions.department || undefined,
              jobTitle: onboardingOptions.jobTitle || undefined,
              officeLocation: onboardingOptions.officeLocation || undefined,
              businessPhones: onboardingOptions.businessPhone ? [onboardingOptions.businessPhone] : undefined,
            });

            targetUserId = newUser.id;
            targetUserDisplayName = newUser.displayName;
            didCreateUser = true;
            
            results.push({
              action: 'Create Azure AD User',
              status: 'success',
              message: `User ${newUser.displayName} created successfully in Azure AD`,
              details: newUser,
            });

            logger.info('Created new Azure AD user', { userId: newUser.id, displayName: newUser.displayName });

          } catch (error) {
            results.push({
              action: 'Create Azure AD User',
              status: 'error',
              message: error.message || 'Failed to create user in Azure AD',
            });
            setExecutionResults(results);
            setCurrentStep(4);
            setIsExecuting(false);
            toast.error('Failed to create user in Azure AD');
            return;
          }
        }
      }

      // At this point, we must have a valid targetUserId
      if (!targetUserId) {
        toast.error('No user available for onboarding');
        setIsExecuting(false);
        return;
      }

      // ===== STEP: ENABLE ACCOUNT (only for existing users, new users are already enabled) =====
      if (isOnboardingExistingUser && onboardingOptions.enableAccount) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Enabling account and setting password...', currentStep: prev.currentStep + 1 }));
        try {
          await service.enableUser(targetUserId);
          if (onboardingOptions.setPassword && onboardingOptions.temporaryPassword) {
            await service.setUserPassword(
              targetUserId,
              onboardingOptions.temporaryPassword,
              onboardingOptions.requirePasswordChange
            );
          }
          results.push({
            action: 'Account Setup',
            status: 'success',
            message: 'Account enabled' + (onboardingOptions.setPassword ? ' and password set' : ''),
          });
        } catch (error) {
          results.push({
            action: 'Account Setup',
            status: 'error',
            message: error.message,
          });
        }
      }

      // ===== STEP: UPDATE USER INFORMATION =====
      // For new users, we already set this during creation, so only update if there are changes
      // For existing users, always update to apply new job details
      const shouldUpdateInfo = isOnboardingExistingUser || 
        (didCreateUser && (onboardingOptions.managerEmail)); // Update if we need to set manager
      
      if (shouldUpdateInfo) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Updating user information...', currentStep: prev.currentStep + 1 }));
        try {
          await service.updateUser(targetUserId, {
            department: onboardingOptions.department || undefined,
            jobTitle: onboardingOptions.jobTitle || undefined,
            officeLocation: onboardingOptions.officeLocation || undefined,
            businessPhones: onboardingOptions.businessPhone ? [onboardingOptions.businessPhone] : undefined,
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
      } else {
        // Mark as success for new users where info was set during creation
        results.push({
          action: 'Update Information',
          status: 'success',
          message: 'User information set during creation',
        });
      }

      // 3. Assign licenses
      if (onboardingOptions.assignLicenses && onboardingOptions.selectedLicenses.length > 0) {
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Assigning licenses...', currentStep: prev.currentStep + 1 }));
        try {
          await service.assignLicenses(targetUserId, onboardingOptions.selectedLicenses);
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
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Adding to groups...', currentStep: prev.currentStep + 1 }));
        try {
          let addedCount = 0;
          for (const groupId of onboardingOptions.selectedGroups) {
            await service.addUserToGroup(groupId, targetUserId);
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
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Setting up email...', currentStep: prev.currentStep + 1 }));
        try {
          if (onboardingOptions.emailAlias) {
            await service.setEmailAlias(targetUserId, onboardingOptions.emailAlias);
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
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Sending welcome email...', currentStep: prev.currentStep + 1 }));
        try {
          await service.sendWelcomeEmail(
            targetUserId,
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
        setExecutionProgress(prev => ({ ...prev, currentTask: 'Scheduling training...', currentStep: prev.currentStep + 1 }));
        try {
          await service.scheduleTraining(
            targetUserId,
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

      setExecutionProgress({ currentTask: 'Completed!', currentStep: totalSteps, totalSteps });
      setExecutionResults(results);
      setCurrentStep(4); // Move to results step

      // Log execution to Convex for audit trail
      const endTime = Date.now();
      const startTime = endTime - 60000; // Approximate start time
      
      try {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          // Determine overall status
          const hasErrors = results.some(r => r.status === 'error');
          const allSkipped = results.every(r => r.status === 'skipped');
          const overallStatus = hasErrors ? 'partial' : allSkipped ? 'failed' : 'completed';

          // Get user info for logging
          const userName = targetUserDisplayName || 
                          selectedUser?.displayName || 
                          newUserInfo.displayName || 
                          `${newUserInfo.firstName} ${newUserInfo.lastName}`;
          const userEmail = selectedUser?.mail || 
                           selectedUser?.userPrincipalName || 
                           newUserInfo.email ||
                           newUserInfo.userPrincipalName;

          // Log to Convex database
          await convex.mutation(api.onboarding.logExecution, {
            sessionId,
            targetUserId: targetUserId,
            targetUserName: userName,
            targetUserEmail: userEmail,
            startTime,
            endTime,
            status: overallStatus,
            actions: results.map((result, index) => ({
              action: result.action,
              status: result.status,
              message: result.message,
              timestamp: startTime + (index * 5000),
              details: result.details ? JSON.stringify(result.details) : undefined,
            })),
          });
          
          logger.info('✅ Onboarding execution logged to Convex database');
        }
      } catch (logError) {
        logger.error('Failed to log onboarding execution to Convex:', logError);
        // Don't fail the onboarding if logging fails
      }

      toast.success('Onboarding process completed');
    } catch (error) {
      console.error('Onboarding error:', error);
      
      // Log failure to Convex
      try {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          const userName = selectedUser?.displayName || 
                          newUserInfo.displayName || 
                          `${newUserInfo.firstName} ${newUserInfo.lastName}`;
          const userEmail = selectedUser?.mail || 
                           selectedUser?.userPrincipalName || 
                           newUserInfo.email;

          await convex.mutation(api.onboarding.logExecution, {
            sessionId,
            targetUserId: selectedUser?.id,
            targetUserName: userName,
            targetUserEmail: userEmail,
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">User Selection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Create a new user or onboard an existing user synced from Active Directory.
            </p>
            
            {/* Mode Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setOnboardingMode('create');
                  setSelectedUser(null);
                  setExistingUserSearchTerm('');
                  setExistingUserSearchResults([]);
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  onboardingMode === 'create'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${onboardingMode === 'create' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <UserPlusIcon className={`h-6 w-6 ${onboardingMode === 'create' ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${onboardingMode === 'create' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      Create New User
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a brand new user in Azure AD or On-Prem AD
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setOnboardingMode('existing');
                  setNewUserInfo({
                    firstName: '',
                    lastName: '',
                    displayName: '',
                    userPrincipalName: '',
                    mailNickname: '',
                    email: '',
                    createInOnPremAD: false,
                  });
                }}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  onboardingMode === 'existing'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${onboardingMode === 'existing' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <CloudArrowUpIcon className={`h-6 w-6 ${onboardingMode === 'existing' ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${onboardingMode === 'existing' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      Onboard Existing User
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Find AD-synced users and complete their M365 setup
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Existing User Search */}
            {onboardingMode === 'existing' && (
              <div className="card mb-6">
                <div className="card-header">
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Search Existing Users</h4>
                  </div>
                </div>
                <div className="card-body">
                  <div className="relative">
                    <input
                      type="text"
                      className="form-input pl-10"
                      placeholder="Search by name, email, or username..."
                      value={existingUserSearchTerm}
                      onChange={(e) => setExistingUserSearchTerm(e.target.value)}
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {searchingExistingUsers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected User Display */}
                  {selectedUser && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-100">{selectedUser.displayName}</p>
                            <p className="text-sm text-green-700 dark:text-green-300">{selectedUser.userPrincipalName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {selectedUser.department && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                                  {selectedUser.department}
                                </span>
                              )}
                              {selectedUser.jobTitle && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  {selectedUser.jobTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            setNewUserInfo({
                              firstName: '',
                              lastName: '',
                              displayName: '',
                              userPrincipalName: '',
                              mailNickname: '',
                              email: '',
                              createInOnPremAD: false,
                            });
                          }}
                          className="text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Search Results */}
                  {!selectedUser && existingUserSearchResults.length > 0 && (
                    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                      {existingUserSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectExistingUser(user)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.userPrincipalName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {user.department && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  {user.department}
                                </span>
                              )}
                              {user.onPremisesSyncEnabled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                  AD Synced
                                </span>
                              )}
                              {!user.accountEnabled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {!selectedUser && existingUserSearchTerm && existingUserSearchResults.length === 0 && !searchingExistingUsers && (
                    <div className="mt-4 text-center py-8 text-gray-500 dark:text-gray-400">
                      <UserIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No users found matching "{existingUserSearchTerm}"</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Create New User Form */}
            {onboardingMode === 'create' && (
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
            )}
          </div>
        );

      case 'basic-info':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Job Details & Contact Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configure Onboarding Options</h3>
            
            <div className="space-y-6">
              {/* Account Options */}
              <div className="card">
                <div className="card-header">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Account Settings</h4>
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
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">License Assignment</h4>
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
                    <label htmlFor="assignLicenses" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
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
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Group Membership</h4>
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
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Email Settings</h4>
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
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Training & Orientation</h4>
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
        const isNewUserOnboarding = onboardingMode === 'create' && !selectedUser;
        const isExistingUserOnboarding = onboardingMode === 'existing' && selectedUser;
        const displayUserName = selectedUser?.displayName || newUserInfo.displayName;
        const displayUserEmail = selectedUser?.userPrincipalName || newUserInfo.userPrincipalName;
        
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Confirm Onboarding Details</h3>
            
            <div className={`border rounded-md p-4 mb-6 ${
              isNewUserOnboarding 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex">
                {isNewUserOnboarding ? (
                  <UserPlusIcon className="h-5 w-5 text-blue-400" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    isNewUserOnboarding 
                      ? 'text-blue-800 dark:text-blue-300'
                      : 'text-green-800 dark:text-green-300'
                  }`}>
                    {isNewUserOnboarding 
                      ? `Ready to create new user: ${displayUserName}`
                      : `Ready to onboard existing user: ${displayUserName}`
                    }
                  </h3>
                  <div className={`mt-2 text-sm ${
                    isNewUserOnboarding 
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-green-700 dark:text-green-400'
                  }`}>
                    {isNewUserOnboarding 
                      ? `A new ${newUserInfo.createInOnPremAD ? 'On-Premises AD' : 'Azure AD'} user account will be created.`
                      : 'The existing user will be configured with the selected options.'
                    }
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card mb-6">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  {isNewUserOnboarding ? 'New User Information' : 'User Information'}
                </h4>
                {isExistingUserOnboarding && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    Existing User
                  </span>
                )}
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{displayUserName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email / Username</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{displayUserEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{onboardingOptions.department || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Title</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{onboardingOptions.jobTitle || 'Not specified'}</p>
                  </div>
                  {selectedUser?.onPremisesSyncEnabled && (
                    <div className="sm:col-span-2">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sync Status</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        ✓ Synced from On-Premises Active Directory
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Selected Actions</h4>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {isNewUserOnboarding && (
                    <div className="flex items-center text-sm">
                      <UserPlusIcon className="h-4 w-4 text-blue-500 mr-2" />
                      Create new user in {newUserInfo.createInOnPremAD ? 'On-Premises AD' : 'Azure AD'}
                    </div>
                  )}
                  {isExistingUserOnboarding && onboardingOptions.enableAccount && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Enable account and set password
                    </div>
                  )}
                  {onboardingOptions.assignLicenses && onboardingOptions.selectedLicenses.length > 0 && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Assign {onboardingOptions.selectedLicenses.length} license(s)
                    </div>
                  )}
                  {onboardingOptions.addToGroups && onboardingOptions.selectedGroups.length > 0 && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Add to {onboardingOptions.selectedGroups.length} group(s)
                    </div>
                  )}
                  {onboardingOptions.createMailbox && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Configure mailbox
                    </div>
                  )}
                  {onboardingOptions.shareWelcomeKit && (
                    <div className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-success-500 mr-2" />
                      Send welcome email
                    </div>
                  )}
                  {onboardingOptions.scheduleTraining && onboardingOptions.trainingDate && (
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
        
        const handleExportPDF = () => {
          try {
            const filename = exportOnboardingResultsToPDF({
              user: selectedUser || newUserInfo,
              results: executionResults,
              options: onboardingOptions,
              executedBy: msalAuth?.user?.name || convexAuth?.user?.name || 'System',
              executionDate: new Date(),
            });
            toast.success(`Report exported: ${filename}`);
            logger.info('PDF report exported successfully', { filename });
          } catch (error) {
            logger.error('Failed to export PDF report', { error });
            toast.error('Failed to export PDF report');
          }
        };
        
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Onboarding Results</h3>
            
            {/* Handle empty results */}
            {executionResults.length === 0 ? (
              <div className="card">
                <div className="card-body text-center py-12">
                  <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Results Available</h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    It looks like the onboarding process didn't execute or no tasks were performed.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="btn btn-secondary"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={() => navigate('/users')}
                      className="btn btn-primary"
                    >
                      Back to Users
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Banner */}
                <div className={`mb-6 p-4 rounded-lg ${
                  errorCount === 0 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {errorCount === 0 ? (
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                      )}
                      <div>
                        <h4 className={`font-semibold ${errorCount === 0 ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                          {errorCount === 0 ? 'Onboarding Completed Successfully!' : 'Onboarding Completed with Issues'}
                        </h4>
                        <p className={`text-sm ${errorCount === 0 ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                          {successCount} of {executionResults.length} tasks completed successfully
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportPDF}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      Export PDF Report
                    </button>
                  </div>
                </div>
                
                <div className="card">
                  <div className="card-body">
                    <div className="space-y-4">
                      {executionResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            result.status === 'success'
                              ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                              : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
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
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.action}</h4>
                              <p className={`mt-1 text-sm ${
                                result.status === 'success' ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'
                              }`}>
                                {result.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex justify-between items-center">
                      <button
                        onClick={handleExportPDF}
                        className="btn btn-outline-primary flex items-center gap-2"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        Download Report
                      </button>
                      <div className="flex space-x-3">
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
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Onboarding</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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

export default OnboardingWizard;


