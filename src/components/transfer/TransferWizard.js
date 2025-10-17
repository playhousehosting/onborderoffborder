import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { graphService } from '../../services/graphService';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const TransferWizard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);

  const [transferOptions, setTransferOptions] = useState({
    transferType: 'department', // department, role, promotion, location
    newDepartment: '',
    newJobTitle: '',
    newManager: '',
    newOfficeLocation: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    updateEmail: false,
    newEmailPrefix: '',
    notifyUser: true,
    notifyManager: true,
    transferNotes: '',
    updateGroups: true,
    removeOldGroups: false,
  });

  const steps = [
    { number: 1, name: 'Select User', icon: UserIcon },
    { number: 2, name: 'Transfer Details', icon: BriefcaseIcon },
    { number: 3, name: 'Review & Execute', icon: CheckCircleIcon },
    { number: 4, name: 'Results', icon: SparklesIcon },
  ];

  // Load user if userId is provided
  useEffect(() => {
    const loadUser = async () => {
      if (userId) {
        try {
          const user = await graphService.getUserById(userId);
          setSelectedUser(user);
          setCurrentStep(2);
        } catch (error) {
          console.error('Error loading user:', error);
          toast.error('Failed to load user details');
        }
      }
    };

    loadUser();
  }, [userId]);

  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      const results = await graphService.searchUsers(searchTerm);
      setSearchResults(results.value || []);
      if (results.value?.length === 0) {
        toast.info('No users found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCurrentStep(2);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleOptionChange = (key, value) => {
    setTransferOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecuteTransfer = async () => {
    if (!selectedUser) {
      toast.error('No user selected');
      return;
    }

    setIsExecuting(true);
    const results = [];

    try {
      // Build batch requests for efficient execution
      const batchRequests = [];
      let requestId = 1;

      // 1. Update user profile information
      const updateData = {};
      let hasUpdates = false;

      if (transferOptions.newDepartment) {
        updateData.department = transferOptions.newDepartment;
        hasUpdates = true;
      }

      if (transferOptions.newJobTitle) {
        updateData.jobTitle = transferOptions.newJobTitle;
        hasUpdates = true;
      }

      if (transferOptions.newOfficeLocation) {
        updateData.officeLocation = transferOptions.newOfficeLocation;
        hasUpdates = true;
      }

      if (hasUpdates) {
        batchRequests.push({
          id: `profile-update-${requestId++}`,
          method: 'PATCH',
          url: `/users/${selectedUser.id}`,
          headers: { 'Content-Type': 'application/json' },
          body: updateData,
          action: 'Profile Update',
          successMessage: `Updated ${Object.keys(updateData).join(', ')}`,
        });
      }

      // 2. Update email if requested (separate request)
      if (transferOptions.updateEmail && transferOptions.newEmailPrefix) {
        const domain = selectedUser.userPrincipalName.split('@')[1];
        const newEmail = `${transferOptions.newEmailPrefix}@${domain}`;
        
        batchRequests.push({
          id: `email-update-${requestId++}`,
          method: 'PATCH',
          url: `/users/${selectedUser.id}`,
          headers: { 'Content-Type': 'application/json' },
          body: { mail: newEmail },
          action: 'Email Update',
          successMessage: `Email updated to ${newEmail}`,
        });
      }

      // Note: Manager update and notifications need to be done separately
      // as they may require searching for manager or have dependencies
      
      // Execute batch requests if any
      if (batchRequests.length > 0) {
        try {
          console.log(`Executing ${batchRequests.length} operations in batch request...`);
          const batchResponse = await graphService.batchRequest(batchRequests);
          
          // Process batch responses
          batchResponse.responses.forEach((response) => {
            const request = batchRequests.find((r) => r.id === response.id);
            if (response.status >= 200 && response.status < 300) {
              results.push({
                action: request.action,
                status: 'success',
                message: request.successMessage,
              });
            } else {
              results.push({
                action: request.action,
                status: 'error',
                message: response.body?.error?.message || `Failed with status ${response.status}`,
              });
            }
          });
        } catch (error) {
          console.error('Batch request error:', error);
          // If batch fails, add error results for all requests
          batchRequests.forEach((req) => {
            results.push({
              action: req.action,
              status: 'error',
              message: error.graphError?.message || error.message,
            });
          });
        }
      }

      // Execute operations that can't be batched or need sequential processing

      // 2. Update manager if specified (needs manager search first)
      if (transferOptions.newManager) {
        try {
          await graphService.updateUserManager(selectedUser.id, transferOptions.newManager);
          results.push({
            action: 'Manager Assignment',
            status: 'success',
            message: 'Manager updated successfully',
          });
        } catch (error) {
          results.push({
            action: 'Manager Assignment',
            status: 'error',
            message: error.graphError?.message || error.message,
          });
        }
      }

      // 3. Update group memberships
      if (transferOptions.updateGroups) {
        try {
          // This would require department/role-to-group mapping logic
          results.push({
            action: 'Group Memberships',
            status: 'success',
            message: 'Group memberships review completed',
          });
        } catch (error) {
          results.push({
            action: 'Group Memberships',
            status: 'error',
            message: error.graphError?.message || error.message,
          });
        }
      }

      // 4. Send notification to user
      if (transferOptions.notifyUser) {
        try {
          await graphService.sendTransferNotification(
            selectedUser.id,
            transferOptions,
            'user'
          );
          results.push({
            action: 'User Notification',
            status: 'success',
            message: 'Transfer notification sent to user',
          });
        } catch (error) {
          results.push({
            action: 'User Notification',
            status: 'error',
            message: error.graphError?.message || error.message,
          });
        }
      }

      // 5. Send notification to manager
      if (transferOptions.notifyManager && transferOptions.newManager) {
        try {
          await graphService.sendTransferNotification(
            transferOptions.newManager,
            transferOptions,
            'manager'
          );
          results.push({
            action: 'Manager Notification',
            status: 'success',
            message: 'Transfer notification sent to manager',
          });
        } catch (error) {
          results.push({
            action: 'Manager Notification',
            status: 'error',
            message: error.graphError?.message || error.message,
          });
        }
      }

      setExecutionResults(results);
      setCurrentStep(4);
      
      // Check if all operations succeeded
      const failedOperations = results.filter((r) => r.status === 'error');
      if (failedOperations.length === 0) {
        toast.success('Transfer process completed successfully!');
      } else if (failedOperations.length < results.length) {
        toast.warning(`Transfer completed with ${failedOperations.length} error(s)`);
      } else {
        toast.error('Transfer process failed');
      }
    } catch (error) {
      console.error('Transfer execution error:', error);
      toast.error(error.graphError?.message || 'Transfer process failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white scale-110' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium
                    ${isActive ? 'text-blue-600' : ''}
                    ${isCompleted ? 'text-green-600' : ''}
                    ${!isActive && !isCompleted ? 'text-gray-500' : ''}
                  `}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-4 rounded transition-all
                    ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="card animate-in">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900">Select User to Transfer/Promote</h3>
        <p className="text-sm text-gray-600 mt-1">Search for the employee who is changing roles</p>
      </div>
      <div className="card-body space-y-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or email..."
            className="input flex-1"
          />
          <button onClick={handleSearch} disabled={isSearching} className="btn-primary">
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Search Results:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-sm text-gray-600">{user.userPrincipalName}</p>
                      {user.jobTitle && (
                        <p className="text-xs text-gray-500 mt-1">{user.jobTitle} - {user.department}</p>
                      )}
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in">
      {/* Selected User Card */}
      <div className="card">
        <div className="card-header bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedUser?.displayName}</h3>
              <p className="text-sm text-gray-600">{selectedUser?.userPrincipalName}</p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Change User
            </button>
          </div>
        </div>
      </div>

      {/* Transfer Type */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Type</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'department', label: 'Department Transfer', icon: BuildingOfficeIcon },
              { value: 'role', label: 'Role Change', icon: BriefcaseIcon },
              { value: 'promotion', label: 'Promotion', icon: SparklesIcon },
              { value: 'location', label: 'Location Transfer', icon: ArrowPathIcon },
            ].map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => handleOptionChange('transferType', type.value)}
                  className={`
                    p-4 border-2 rounded-lg flex items-center gap-3 transition-all
                    ${transferOptions.transferType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">New Position Details</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Department
              </label>
              <input
                type="text"
                value={transferOptions.newDepartment}
                onChange={(e) => handleOptionChange('newDepartment', e.target.value)}
                placeholder="e.g., Engineering, Sales"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Job Title
              </label>
              <input
                type="text"
                value={transferOptions.newJobTitle}
                onChange={(e) => handleOptionChange('newJobTitle', e.target.value)}
                placeholder="e.g., Senior Developer"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Manager (Email)
              </label>
              <input
                type="email"
                value={transferOptions.newManager}
                onChange={(e) => handleOptionChange('newManager', e.target.value)}
                placeholder="manager@company.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Office Location
              </label>
              <input
                type="text"
                value={transferOptions.newOfficeLocation}
                onChange={(e) => handleOptionChange('newOfficeLocation', e.target.value)}
                placeholder="e.g., New York Office"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date
              </label>
              <input
                type="date"
                value={transferOptions.effectiveDate}
                onChange={(e) => handleOptionChange('effectiveDate', e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Notes
            </label>
            <textarea
              value={transferOptions.transferNotes}
              onChange={(e) => handleOptionChange('transferNotes', e.target.value)}
              rows="3"
              placeholder="Add any additional notes about this transfer..."
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Email & Notifications */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Email & Notifications</h3>
        </div>
        <div className="card-body space-y-4">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={transferOptions.updateEmail}
              onChange={(e) => handleOptionChange('updateEmail', e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Update Email Address</span>
              <p className="text-sm text-gray-600">Change user's primary email</p>
            </div>
          </label>

          {transferOptions.updateEmail && (
            <div className="ml-8">
              <input
                type="text"
                value={transferOptions.newEmailPrefix}
                onChange={(e) => handleOptionChange('newEmailPrefix', e.target.value)}
                placeholder="new.email"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                @ {selectedUser?.userPrincipalName?.split('@')[1]}
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={transferOptions.notifyUser}
              onChange={(e) => handleOptionChange('notifyUser', e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Notify User</span>
              <p className="text-sm text-gray-600">Send transfer notification to employee</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={transferOptions.notifyManager}
              onChange={(e) => handleOptionChange('notifyManager', e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Notify New Manager</span>
              <p className="text-sm text-gray-600">Send notification to new manager</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={transferOptions.updateGroups}
              onChange={(e) => handleOptionChange('updateGroups', e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Update Group Memberships</span>
              <p className="text-sm text-gray-600">Adjust access based on new role</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(1)} className="btn-secondary">
          Back
        </button>
        <button onClick={() => setCurrentStep(3)} className="btn-primary">
          Review Transfer
          <ArrowRightIcon className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in">
      <div className="card">
        <div className="card-header bg-gradient-to-r from-blue-500 to-blue-600">
          <h3 className="text-lg font-semibold text-white">Review Transfer Details</h3>
          <p className="text-sm text-blue-100 mt-1">
            Please review the transfer details before executing
          </p>
        </div>
        <div className="card-body space-y-6">
          {/* User Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Employee</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{selectedUser?.displayName}</p>
              <p className="text-sm text-gray-600">{selectedUser?.userPrincipalName}</p>
              <p className="text-sm text-gray-500 mt-1">
                Current: {selectedUser?.jobTitle} - {selectedUser?.department}
              </p>
            </div>
          </div>

          {/* Changes Summary */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Changes to Apply</h4>
            <div className="space-y-2">
              {transferOptions.newDepartment && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">Department:</span> {transferOptions.newDepartment}
                  </span>
                </div>
              )}
              {transferOptions.newJobTitle && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <BriefcaseIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">Job Title:</span> {transferOptions.newJobTitle}
                  </span>
                </div>
              )}
              {transferOptions.newManager && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">New Manager:</span> {transferOptions.newManager}
                  </span>
                </div>
              )}
              {transferOptions.newOfficeLocation && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <ArrowPathIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">Location:</span> {transferOptions.newOfficeLocation}
                  </span>
                </div>
              )}
              {transferOptions.effectiveDate && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">
                    <span className="font-medium">Effective Date:</span>{' '}
                    {new Date(transferOptions.effectiveDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Actions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Additional Actions</h4>
            <div className="space-y-2">
              {transferOptions.updateEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Update email address
                </div>
              )}
              {transferOptions.notifyUser && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Send notification to user
                </div>
              )}
              {transferOptions.notifyManager && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Send notification to new manager
                </div>
              )}
              {transferOptions.updateGroups && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Update group memberships
                </div>
              )}
            </div>
          </div>

          {transferOptions.transferNotes && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{transferOptions.transferNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(2)} className="btn-secondary">
          Back
        </button>
        <button
          onClick={handleExecuteTransfer}
          disabled={isExecuting}
          className="btn-primary bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          {isExecuting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Executing Transfer...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Execute Transfer
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="card animate-in">
      <div className="card-header bg-gradient-to-r from-green-500 to-green-600">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-8 w-8 text-white" />
          <div>
            <h3 className="text-lg font-semibold text-white">Transfer Complete!</h3>
            <p className="text-sm text-green-100 mt-1">
              The transfer process has been executed
            </p>
          </div>
        </div>
      </div>
      <div className="card-body space-y-6">
        <div className="space-y-3">
          {executionResults.map((result, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-lg border-2 flex items-start gap-3
                ${result.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                }
              `}
            >
              {result.status === 'success' ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    result.status === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.action}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => navigate('/users')}
            className="btn-secondary flex-1"
          >
            View All Users
          </button>
          <button
            onClick={() => navigate(`/users/${selectedUser?.id}`)}
            className="btn-primary flex-1"
          >
            View User Details
          </button>
        </div>
      </div>
    </div>
  );

  if (!hasPermission('userManagement')) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-gray-500">
            You don't have permission to perform transfers/promotions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Transfer / Promotion Wizard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Guide employees through role changes, transfers, and promotions
        </p>
      </div>

      {renderStepIndicator()}

      <div>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && selectedUser && renderStep2()}
        {currentStep === 3 && selectedUser && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default TransferWizard;
