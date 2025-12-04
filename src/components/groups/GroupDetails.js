import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMSALAuth } from '../../contexts/MSALAuthContext';
import { useAuth as useConvexAuth } from '../../contexts/ConvexAuthContext';
import { getActiveService, getAuthMode } from '../../services/serviceFactory';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  UserIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  SparklesIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const msalAuth = useMSALAuth();
  const convexAuth = useConvexAuth();
  
  // Use serviceFactory to get the correct service based on auth mode
  const authMode = getAuthMode();
  const service = getActiveService();
  
  // Determine which auth is active based on serviceFactory mode
  const isConvexAuth = authMode === 'convex';
  const isMSALAuth = authMode === 'msal';

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddOwnerModal, setShowAddOwnerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Email activity state for distribution lists
  const [emailActivity, setEmailActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [memberActivity, setMemberActivity] = useState([]);

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm && (showAddMemberModal || showAddOwnerModal)) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, showAddMemberModal, showAddOwnerModal]);

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      const [groupData, membersData, ownersData] = await Promise.all([
        service.getGroup(groupId),
        service.getGroupMembers(groupId),
        service.getGroupOwners(groupId),
      ]);
      
      setGroup(groupData);
      setMembers(membersData);
      setOwners(ownersData);
      
      // Load email activity for distribution lists
      if (groupData.mailEnabled && !groupData.groupTypes?.includes('Unified')) {
        loadEmailActivity(groupData, membersData);
      }
    } catch (error) {
      console.error('Error loading group details:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  // Load email activity for distribution list members
  const loadEmailActivity = async (groupData, membersData) => {
    setLoadingActivity(true);
    try {
      // Get email activity for all members of the distribution list
      const activityPromises = membersData.map(async (member) => {
        try {
          const activity = await service.getUserEmailActivity(member.id);
          return {
            ...member,
            emailActivity: activity,
            lastActivityDate: activity?.lastActivityDate || null,
            sendCount: activity?.sendCount || 0,
            receiveCount: activity?.receiveCount || 0,
          };
        } catch (error) {
          console.warn(`Could not get activity for ${member.displayName}:`, error.message);
          return {
            ...member,
            emailActivity: null,
            lastActivityDate: null,
            sendCount: 0,
            receiveCount: 0,
          };
        }
      });

      const activitiesResult = await Promise.all(activityPromises);
      
      // Sort by last activity date to find most/least active
      const sortedByActivity = [...activitiesResult].sort((a, b) => {
        if (!a.lastActivityDate && !b.lastActivityDate) return 0;
        if (!a.lastActivityDate) return 1;
        if (!b.lastActivityDate) return -1;
        return new Date(b.lastActivityDate) - new Date(a.lastActivityDate);
      });

      // Calculate aggregate stats
      const totalSent = activitiesResult.reduce((sum, m) => sum + (m.sendCount || 0), 0);
      const totalReceived = activitiesResult.reduce((sum, m) => sum + (m.receiveCount || 0), 0);
      const activeMembers = activitiesResult.filter(m => m.lastActivityDate).length;
      
      // Find most recent activity across all members
      const mostRecentActivity = sortedByActivity[0]?.lastActivityDate;
      
      // Find least recently active member (excluding those with no activity)
      const membersWithActivity = sortedByActivity.filter(m => m.lastActivityDate);
      const leastRecentActivity = membersWithActivity.length > 0 
        ? membersWithActivity[membersWithActivity.length - 1]?.lastActivityDate 
        : null;

      setEmailActivity({
        totalSent,
        totalReceived,
        activeMembers,
        totalMembers: membersData.length,
        mostRecentActivity,
        leastRecentActivity,
        mostActiveMembers: sortedByActivity.slice(0, 5),
        leastActiveMembers: sortedByActivity.slice(-5).reverse(),
      });
      
      setMemberActivity(sortedByActivity);
    } catch (error) {
      console.error('Error loading email activity:', error);
      // Don't show error toast - activity is supplementary info
    } finally {
      setLoadingActivity(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const results = await service.searchUsers(searchTerm);
      setSearchResults(results.value || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (user) => {
    try {
      await service.addUserToGroup(groupId, user.id);
      toast.success(`Added ${user.displayName} to group`);
      setShowAddMemberModal(false);
      setSearchTerm('');
      setSearchResults([]);
      loadGroupDetails();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this group?`)) {
      return;
    }

    try {
      await service.removeUserFromGroup(groupId, userId);
      toast.success(`Removed ${userName} from group`);
      loadGroupDetails();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleAddOwner = async (user) => {
    try {
      await service.addGroupOwner(groupId, user.id);
      toast.success(`Added ${user.displayName} as owner`);
      setShowAddOwnerModal(false);
      setSearchTerm('');
      setSearchResults([]);
      loadGroupDetails();
    } catch (error) {
      console.error('Error adding owner:', error);
      toast.error('Failed to add owner');
    }
  };

  const handleRemoveOwner = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} as owner?`)) {
      return;
    }

    try {
      await service.removeGroupOwner(groupId, userId);
      toast.success(`Removed ${userName} as owner`);
      loadGroupDetails();
    } catch (error) {
      console.error('Error removing owner:', error);
      toast.error('Failed to remove owner');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Are you sure you want to delete the group "${group.displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await service.deleteGroup(groupId);
      toast.success('Group deleted successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const getGroupTypeBadge = () => {
    if (!group) return null;

    if (group.groupTypes?.includes('Unified')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
          <SparklesIcon className="h-4 w-4 mr-1" />
          Microsoft 365
        </span>
      );
    } else if (group.mailEnabled && !group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          <EnvelopeIcon className="h-4 w-4 mr-1" />
          Distribution List
        </span>
      );
    } else if (group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <ShieldCheckIcon className="h-4 w-4 mr-1" />
          Security Group
        </span>
      );
    }
    return null;
  };

  const renderUserSearchModal = (title, onSelect, onClose) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <input
              type="text"
              className="form-input"
              placeholder="Search for user by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => onSelect(user)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-primary-600" />
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
            ) : searchTerm ? (
              <p className="text-center text-gray-500 py-8">No users found</p>
            ) : (
              <p className="text-center text-gray-500 py-8">Start typing to search for users</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Group not found</p>
        <button onClick={() => navigate('/groups')} className="btn-primary mt-4">
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/groups')}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Groups
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/groups/${groupId}/edit`)}
            className="btn-secondary inline-flex items-center"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDeleteGroup}
            className="btn-danger inline-flex items-center"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Group Info Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserGroupIcon className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{group.displayName}</h1>
                <p className="text-sm text-gray-600 mt-1">{group.mail || 'No email address'}</p>
                <div className="mt-2">{getGroupTypeBadge()}</div>
              </div>
            </div>
          </div>

          {group.description && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Members</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{members.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">Owners</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{owners.length}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-900">Created</p>
              <p className="text-sm font-semibold text-purple-600 mt-1">
                {group.createdDateTime ? new Date(group.createdDateTime).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'members'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'owners'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Owners ({owners.length})
          </button>
          {/* Activity tab for distribution lists */}
          {group?.mailEnabled && !group?.groupTypes?.includes('Unified') && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'activity'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="inline-flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Activity
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Member
            </button>
          </div>
          <div className="card-body p-0">
            {members.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No members</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a member to this group</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                        <p className="text-sm text-gray-500">{member.mail || member.userPrincipalName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id, member.displayName)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owners Tab */}
      {activeTab === 'owners' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Owners</h2>
            <button
              onClick={() => setShowAddOwnerModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Owner
            </button>
          </div>
          <div className="card-body p-0">
            {owners.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No owners</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding an owner to this group</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {owners.map((owner) => (
                  <div key={owner.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{owner.displayName}</p>
                        <p className="text-sm text-gray-500">{owner.mail || owner.userPrincipalName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveOwner(owner.id, owner.displayName)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Tab for Distribution Lists */}
      {activeTab === 'activity' && group?.mailEnabled && !group?.groupTypes?.includes('Unified') && (
        <div className="space-y-6">
          {loadingActivity ? (
            <div className="card">
              <div className="card-body flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-3 text-gray-600">Loading email activity...</span>
              </div>
            </div>
          ) : emailActivity ? (
            <>
              {/* Activity Overview */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-gray-900">Email Activity Overview</h2>
                  <p className="text-sm text-gray-500 mt-1">Last 30 days activity for distribution list members</p>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-blue-600">{emailActivity.totalSent}</p>
                          <p className="text-sm text-blue-900">Emails Sent</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-green-600">{emailActivity.totalReceived}</p>
                          <p className="text-sm text-green-900">Emails Received</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-purple-600">
                            {emailActivity.activeMembers}/{emailActivity.totalMembers}
                          </p>
                          <p className="text-sm text-purple-900">Active Members</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <div className="flex items-center">
                        <ClockIcon className="h-8 w-8 text-amber-600" />
                        <div className="ml-3">
                          <p className="text-sm font-bold text-amber-600">
                            {emailActivity.mostRecentActivity 
                              ? new Date(emailActivity.mostRecentActivity).toLocaleDateString() 
                              : 'No activity'}
                          </p>
                          <p className="text-sm text-amber-900">Last Activity</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Most Active Members */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Most Active Members</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Members with recent email activity</p>
                  </div>
                  <div className="card-body p-0">
                    {emailActivity.mostActiveMembers.filter(m => m.lastActivityDate).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent activity data available</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {emailActivity.mostActiveMembers
                          .filter(m => m.lastActivityDate)
                          .slice(0, 5)
                          .map((member, index) => (
                          <div key={member.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                    index === 0 ? 'bg-green-100' : 'bg-gray-100'
                                  }`}>
                                    <span className={`text-sm font-bold ${
                                      index === 0 ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                      #{index + 1}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                                  <p className="text-xs text-gray-500">{member.mail}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {member.sendCount} sent / {member.receiveCount} received
                                </p>
                                <p className="text-xs text-gray-500">
                                  Last active: {new Date(member.lastActivityDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Least Active Members */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center">
                      <ArrowTrendingDownIcon className="h-5 w-5 text-red-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Least Active Members</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Members with no recent email activity</p>
                  </div>
                  <div className="card-body p-0">
                    {emailActivity.leastActiveMembers.filter(m => !m.lastActivityDate || 
                      new Date(m.lastActivityDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">All members have recent activity!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {emailActivity.leastActiveMembers
                          .filter(m => !m.lastActivityDate || 
                            new Date(m.lastActivityDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          )
                          .slice(0, 5)
                          .map((member) => (
                          <div key={member.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <UserIcon className="h-6 w-6 text-red-600" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                                  <p className="text-xs text-gray-500">{member.mail}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {member.lastActivityDate 
                                    ? `Inactive since ${new Date(member.lastActivityDate).toLocaleDateString()}`
                                    : 'No activity recorded'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Member Activity Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">All Members Activity</h3>
                  <p className="text-sm text-gray-500 mt-1">Complete email activity for all distribution list members</p>
                </div>
                <div className="card-body p-0 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Emails Sent
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Emails Received
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {memberActivity.map((member) => {
                        const isInactive = !member.lastActivityDate || 
                          new Date(member.lastActivityDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        return (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-primary-600" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                                  <p className="text-xs text-gray-500">{member.mail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {member.sendCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {member.receiveCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.lastActivityDate 
                                ? new Date(member.lastActivityDate).toLocaleDateString()
                                : 'Never'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isInactive 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {isInactive ? 'Inactive' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="card-body text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No activity data available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Email activity data requires Reports.Read.All permission in Microsoft Graph.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && renderUserSearchModal(
        'Add Member',
        handleAddMember,
        () => {
          setShowAddMemberModal(false);
          setSearchTerm('');
          setSearchResults([]);
        }
      )}

      {/* Add Owner Modal */}
      {showAddOwnerModal && renderUserSearchModal(
        'Add Owner',
        handleAddOwner,
        () => {
          setShowAddOwnerModal(false);
          setSearchTerm('');
          setSearchResults([]);
        }
      )}
    </div>
  );
};

export default GroupDetails;

