import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import msalGraphService from '../../services/msalGraphService';
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
} from '@heroicons/react/24/outline';

const GroupDetails = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();

  useEffect(() => {
    if (getAccessToken) {
      msalGraphService.setGetTokenFunction(getAccessToken);
    }
  }, [getAccessToken]);

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
        msalGraphService.getGroup(groupId),
        msalGraphService.getGroupMembers(groupId),
        msalGraphService.getGroupOwners(groupId),
      ]);
      
      setGroup(groupData);
      setMembers(membersData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error loading group details:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const results = await msalGraphService.searchUsers(searchTerm);
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
      await msalGraphService.addUserToGroup(groupId, user.id);
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
      await msalGraphService.removeUserFromGroup(groupId, userId);
      toast.success(`Removed ${userName} from group`);
      loadGroupDetails();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleAddOwner = async (user) => {
    try {
      await msalGraphService.addGroupOwner(groupId, user.id);
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
      await msalGraphService.removeGroupOwner(groupId, userId);
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
      await msalGraphService.deleteGroup(groupId);
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
