import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';
import msalGraphService from '../../services/msalGraphService';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  UsersIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const GroupManagement = () => {
  const navigate = useNavigate();
  const { hasPermission, getAccessToken } = useAuth();
  
  // Initialize MSAL graph service with token function
  useEffect(() => {
    if (getAccessToken) {
      msalGraphService.setGetTokenFunction(getAccessToken);
    }
  }, [getAccessToken]);

  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupType, setSelectedGroupType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const groupTypes = [
    { value: 'all', label: 'All Groups', icon: UserGroupIcon },
    { value: 'distribution', label: 'Distribution Lists', icon: EnvelopeIcon },
    { value: 'security', label: 'Security Groups', icon: ShieldCheckIcon },
    { value: 'microsoft365', label: 'Microsoft 365', icon: SparklesIcon },
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [searchTerm, selectedGroupType, groups]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await msalGraphService.getAllGroups({
        select: 'id,displayName,mail,mailEnabled,securityEnabled,groupTypes,description,createdDateTime,memberCount',
      });
      setGroups(response || []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    let filtered = [...groups];

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.displayName?.toLowerCase().includes(searchLower) ||
          group.mail?.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by group type
    if (selectedGroupType !== 'all') {
      filtered = filtered.filter((group) => {
        if (selectedGroupType === 'distribution') {
          return group.mailEnabled && !group.securityEnabled;
        } else if (selectedGroupType === 'security') {
          return group.securityEnabled;
        } else if (selectedGroupType === 'microsoft365') {
          return group.groupTypes?.includes('Unified');
        }
        return true;
      });
    }

    setFilteredGroups(filtered);
  };

  const getGroupTypeBadge = (group) => {
    if (group.groupTypes?.includes('Unified')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <SparklesIcon className="h-3 w-3 mr-1" />
          M365
        </span>
      );
    } else if (group.mailEnabled && !group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <EnvelopeIcon className="h-3 w-3 mr-1" />
          Distribution
        </span>
      );
    } else if (group.securityEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <ShieldCheckIcon className="h-3 w-3 mr-1" />
          Security
        </span>
      );
    }
    return null;
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      return;
    }

    try {
      await msalGraphService.deleteGroup(groupId);
      toast.success('Group deleted successfully');
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Group Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage distribution lists, security groups, and Microsoft 365 groups
          </p>
        </div>
        <button
          onClick={() => navigate('/groups/create')}
          className="btn-primary inline-flex items-center justify-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groupTypes.map((type) => {
          const Icon = type.icon;
          let count = groups.length;
          if (type.value === 'distribution') {
            count = groups.filter(g => g.mailEnabled && !g.securityEnabled).length;
          } else if (type.value === 'security') {
            count = groups.filter(g => g.securityEnabled).length;
          } else if (type.value === 'microsoft365') {
            count = groups.filter(g => g.groupTypes?.includes('Unified')).length;
          }

          return (
            <div
              key={type.value}
              onClick={() => setSelectedGroupType(type.value)}
              className={`card cursor-pointer transition-all ${
                selectedGroupType === type.value
                  ? 'ring-2 ring-primary-500 bg-primary-50'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{type.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <Icon className={`h-10 w-10 ${
                    selectedGroupType === type.value ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups by name, email, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <button
              onClick={loadGroups}
              className="btn-secondary inline-flex items-center justify-center whitespace-nowrap"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Groups ({filteredGroups.length})
          </h2>
        </div>
        <div className="card-body p-0">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedGroupType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating a new group'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.map((group) => (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <UserGroupIcon className="h-6 w-6 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {group.displayName}
                            </div>
                            <div className="text-sm text-gray-500 sm:hidden">
                              {getGroupTypeBadge(group)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        {getGroupTypeBadge(group)}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{group.mail || '-'}</div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {group.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/groups/${group.id}/edit`);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id, group.displayName);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManagement;
