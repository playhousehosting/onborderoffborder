import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  PuzzlePieceIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArchiveBoxIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { teamsService } from '../../services/teamsService';

export default function TeamsManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('teams');
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [teamSettings, setTeamSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ displayName: '', description: '', visibility: 'Private' });
  const [newChannel, setNewChannel] = useState({ displayName: '', description: '', membershipType: 'standard' });

  const tabs = [
    { id: 'teams', label: 'Teams', icon: UserGroupIcon },
    { id: 'members', label: 'Members', icon: UsersIcon },
    { id: 'channels', label: 'Channels', icon: ChatBubbleLeftIcon },
    { id: 'apps', label: 'Apps', icon: PuzzlePieceIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
    { id: 'policies', label: 'Policies', icon: ShieldCheckIcon }
  ];

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      if (activeTab === 'members') loadMembers();
      if (activeTab === 'channels') loadChannels();
      if (activeTab === 'apps') loadApps();
      if (activeTab === 'settings') loadSettings();
    }
  }, [activeTab, selectedTeam]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await teamsService.getTeams();
      setTeams(response.value || []);
    } catch (error) {
      toast.error('Failed to load teams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const response = await teamsService.getMembers(selectedTeam.id);
      setMembers(response.value || []);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const response = await teamsService.getChannels(selectedTeam.id);
      setChannels(response.value || []);
    } catch (error) {
      toast.error('Failed to load channels');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadApps = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const response = await teamsService.getInstalledApps(selectedTeam.id);
      setInstalledApps(response.value || []);
    } catch (error) {
      toast.error('Failed to load apps');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const response = await teamsService.getTeamSettings(selectedTeam.id);
      setTeamSettings(response);
    } catch (error) {
      toast.error('Failed to load settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.displayName.trim()) {
      toast.error('Team name is required');
      return;
    }

    setLoading(true);
    try {
      await teamsService.createTeam(newTeam);
      toast.success('Team created successfully');
      setShowCreateModal(false);
      setNewTeam({ displayName: '', description: '', visibility: 'Private' });
      loadTeams();
    } catch (error) {
      toast.error('Failed to create team');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to archive this team?')) return;

    setLoading(true);
    try {
      await teamsService.archiveTeam(teamId);
      toast.success('Team archived successfully');
      loadTeams();
    } catch (error) {
      toast.error('Failed to archive team');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    setLoading(true);
    try {
      await teamsService.deleteTeam(teamId);
      toast.success('Team deleted successfully');
      setSelectedTeam(null);
      loadTeams();
    } catch (error) {
      toast.error('Failed to delete team');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.displayName.trim()) {
      toast.error('Channel name is required');
      return;
    }

    setLoading(true);
    try {
      await teamsService.createChannel(selectedTeam.id, newChannel);
      toast.success('Channel created successfully');
      setShowChannelModal(false);
      setNewChannel({ displayName: '', description: '', membershipType: 'standard' });
      loadChannels();
    } catch (error) {
      toast.error('Failed to create channel');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;

    setLoading(true);
    try {
      await teamsService.deleteChannel(selectedTeam.id, channelId);
      toast.success('Channel deleted successfully');
      loadChannels();
    } catch (error) {
      toast.error('Failed to delete channel');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderTeamsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 ${
              selectedTeam?.id === team.id ? 'border-blue-500' : 'border-transparent'
            } hover:border-blue-300 transition-colors`}
            onClick={() => setSelectedTeam(team)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{team.displayName}</h3>
                  {team.isArchived && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      <ArchiveBoxIcon className="h-3 w-3 mr-1" />
                      Archived
                    </span>
                  )}
                </div>
              </div>
              {!team.isArchived && (
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveTeam(team.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Archive team"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(team.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete team"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{team.description || 'No description'}</p>
            <div className="flex items-center text-xs text-gray-500 space-x-4">
              <span className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-1" />
                {team.memberCount || 0} members
              </span>
              <span className="flex items-center">
                <ChatBubbleLeftIcon className="h-4 w-4 mr-1" />
                {team.channelCount || 0} channels
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMembersTab = () => {
    if (!selectedTeam) {
      return (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Select a team to view members</p>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {selectedTeam.displayName} - Members
        </h3>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li key={member.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {member.displayName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{member.displayName}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {member.roles?.includes('owner') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Owner
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="text-gray-400 hover:text-red-600"
                    title="Remove member"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    setLoading(true);
    try {
      await teamsService.removeMember(selectedTeam.id, userId);
      toast.success('Member removed successfully');
      loadMembers();
    } catch (error) {
      toast.error('Failed to remove member');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderChannelsTab = () => {
    if (!selectedTeam) {
      return (
        <div className="text-center py-12">
          <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Select a team to view channels</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedTeam.displayName} - Channels
          </h3>
          <button
            onClick={() => setShowChannelModal(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Channel
          </button>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {channels.map((channel) => (
              <li key={channel.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-gray-900">{channel.displayName}</p>
                      {channel.membershipType === 'private' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Private
                        </span>
                      )}
                      {channel.membershipType === 'shared' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-600">
                          Shared
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="mt-1 text-sm text-gray-500">{channel.description}</p>
                    )}
                  </div>
                  {channel.displayName !== 'General' && (
                    <button
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="ml-4 text-gray-400 hover:text-red-600"
                      title="Delete channel"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderAppsTab = () => {
    if (!selectedTeam) {
      return (
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Select a team to view installed apps</p>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {selectedTeam.displayName} - Installed Apps
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {installedApps.map((app) => (
            <div key={app.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <PuzzlePieceIcon className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {app.teamsAppDefinition?.displayName || app.teamsApp?.displayName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      v{app.teamsAppDefinition?.version || '1.0.0'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUninstallApp(app.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Uninstall app"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleUninstallApp = async (installationId) => {
    if (!window.confirm('Are you sure you want to uninstall this app?')) return;

    setLoading(true);
    try {
      await teamsService.uninstallApp(selectedTeam.id, installationId);
      toast.success('App uninstalled successfully');
      loadApps();
    } catch (error) {
      toast.error('Failed to uninstall app');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderSettingsTab = () => {
    if (!selectedTeam) {
      return (
        <div className="text-center py-12">
          <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Select a team to view settings</p>
        </div>
      );
    }

    if (!teamSettings) {
      return <div className="text-center py-12">Loading settings...</div>;
    }

    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {selectedTeam.displayName} - Settings
        </h3>
        <div className="space-y-6">
          {/* Member Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Member Settings</h4>
            <div className="space-y-3">
              <SettingRow
                label="Allow members to create and update channels"
                value={teamSettings.memberSettings?.allowCreateUpdateChannels}
              />
              <SettingRow
                label="Allow members to delete channels"
                value={teamSettings.memberSettings?.allowDeleteChannels}
              />
              <SettingRow
                label="Allow members to add and remove apps"
                value={teamSettings.memberSettings?.allowAddRemoveApps}
              />
            </div>
          </div>

          {/* Guest Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Guest Settings</h4>
            <div className="space-y-3">
              <SettingRow
                label="Allow guests to create and update channels"
                value={teamSettings.guestSettings?.allowCreateUpdateChannels}
              />
              <SettingRow
                label="Allow guests to delete channels"
                value={teamSettings.guestSettings?.allowDeleteChannels}
              />
            </div>
          </div>

          {/* Messaging Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Messaging Settings</h4>
            <div className="space-y-3">
              <SettingRow
                label="Allow users to edit their messages"
                value={teamSettings.messagingSettings?.allowUserEditMessages}
              />
              <SettingRow
                label="Allow users to delete their messages"
                value={teamSettings.messagingSettings?.allowUserDeleteMessages}
              />
              <SettingRow
                label="Allow team mentions"
                value={teamSettings.messagingSettings?.allowTeamMentions}
              />
              <SettingRow
                label="Allow channel mentions"
                value={teamSettings.messagingSettings?.allowChannelMentions}
              />
            </div>
          </div>

          {/* Fun Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Fun Settings</h4>
            <div className="space-y-3">
              <SettingRow
                label="Allow Giphy"
                value={teamSettings.funSettings?.allowGiphy}
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Giphy content rating</span>
                <span className="text-gray-900 font-medium">
                  {teamSettings.funSettings?.giphyContentRating || 'moderate'}
                </span>
              </div>
              <SettingRow
                label="Allow stickers and memes"
                value={teamSettings.funSettings?.allowStickersAndMemes}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SettingRow = ({ label, value }) => (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-700">{label}</span>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {value ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  );

  const renderPoliciesTab = () => (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Teams Policies</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Teams policies are managed through the Teams Admin Center.
          Policy changes can take up to 24 hours to take effect.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Channel Policies</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Create private channels</li>
            <li>• Create shared channels</li>
            <li>• Invite external users to shared channels</li>
            <li>• Join external shared channels</li>
          </ul>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Team Policies</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Manage teams settings</li>
            <li>• Member permissions</li>
            <li>• Guest access controls</li>
            <li>• App installation policies</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Teams Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage Microsoft Teams, channels, members, and settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'teams' && renderTeamsTab()}
            {activeTab === 'members' && renderMembersTab()}
            {activeTab === 'channels' && renderChannelsTab()}
            {activeTab === 'apps' && renderAppsTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'policies' && renderPoliciesTab()}
          </>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={newTeam.displayName}
                  onChange={(e) => setNewTeam({ ...newTeam, displayName: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter team description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privacy
                </label>
                <select
                  value={newTeam.visibility}
                  onChange={(e) => setNewTeam({ ...newTeam, visibility: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Private">Private</option>
                  <option value="Public">Public</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeam({ displayName: '', description: '', visibility: 'Private' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name *
                </label>
                <input
                  type="text"
                  value={newChannel.displayName}
                  onChange={(e) => setNewChannel({ ...newChannel, displayName: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter channel name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter channel description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privacy
                </label>
                <select
                  value={newChannel.membershipType}
                  onChange={(e) => setNewChannel({ ...newChannel, membershipType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowChannelModal(false);
                  setNewChannel({ displayName: '', description: '', membershipType: 'standard' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
