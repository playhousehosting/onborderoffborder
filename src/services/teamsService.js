/**
 * Microsoft Teams Service
 * 
 * Provides Microsoft Teams-specific management functionality.
 * Focuses on Teams-enabled M365 groups and comprehensive Teams settings.
 * 
 * Production-only implementation - NO MOCK DATA
 * 
 * @module teamsService
 */

import { graphService } from './graphService';

/**
 * Get all Teams-enabled M365 groups in the organization
 * Uses resourceProvisioningOptions filter to get only groups with Teams provisioned
 * Enriches each team with member and channel counts
 */
export async function getTeams() {
  const response = await graphService.makeRequest(
    "/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$select=id,displayName,description,visibility,createdDateTime,mail,mailNickname",
    {}
  );
  
  // Enrich teams with counts
  if (response.value && response.value.length > 0) {
    const teamsWithCounts = await Promise.all(
      response.value.map(async (team) => {
        try {
          // Get member count from the group (not team-specific members)
          const membersResponse = await graphService.makeRequest(
            `/groups/${team.id}/members/$count`,
            {
              headers: {
                'ConsistencyLevel': 'eventual'
              }
            }
          );
          
          // Get channel count
          const channelsResponse = await graphService.makeRequest(
            `/teams/${team.id}/channels/$count`,
            {
              headers: {
                'ConsistencyLevel': 'eventual'
              }
            }
          );
          
          return {
            ...team,
            memberCount: typeof membersResponse === 'number' ? membersResponse : 0,
            channelCount: typeof channelsResponse === 'number' ? channelsResponse : 0
          };
        } catch (error) {
          console.warn(`Failed to get counts for team ${team.id}:`, error);
          return {
            ...team,
            memberCount: 0,
            channelCount: 0
          };
        }
      })
    );
    
    return { ...response, value: teamsWithCounts };
  }
  
  return response;
}

/**
 * Get specific team details including all settings
 * @param {string} teamId - The team ID
 */
export async function getTeam(teamId) {
  const response = await graphService.makeRequest(
    /teams/${teamId}`,
    {}
  );
  
  return response;
}

/**
 * Create a new team (4-step process as per Microsoft documentation)
 * Step 1: Create M365 group
 * Step 2: Add owners (minimum 2 required)
 * Step 3: Add members (with 1 second delay between adds)
 * Step 4: Convert group to team
 * 
 * @param {Object} teamData - Team creation data
 * @param {string} teamData.displayName - Team display name
 * @param {string} teamData.description - Team description
 * @param {string} teamData.visibility - Team visibility (Private or Public)
 * @param {Array<string>} teamData.ownerIds - Array of owner user IDs (minimum 2)
 * @param {Array<string>} teamData.memberIds - Optional array of member user IDs
 */
export async function createTeam(teamData) {
  // Step 1: Create M365 group
  const groupData = {
    displayName: teamData.displayName,
    description: teamData.description,
    groupTypes: ['Unified'],
    mailEnabled: true,
    mailNickname: teamData.displayName.toLowerCase().replace(/\s+/g, '-').substring(0, 64),
    securityEnabled: false,
    visibility: teamData.visibility || 'Private',
    'owners@odata.bind': teamData.ownerIds?.slice(0, 1).map(id => 
      `https://graph.microsoft.com/v1.0/users/${id}`
    ) || []
  };

  const group = await graphService.makeRequest(
    '/v1.0/groups',
    {
      method: 'POST',
      body: JSON.stringify(groupData)
    }
  );

  // Step 2: Add additional owners (if more than 1)
  if (teamData.ownerIds && teamData.ownerIds.length > 1) {
    for (let i = 1; i < teamData.ownerIds.length; i++) {
      await addOwner(group.id, teamData.ownerIds[i]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Step 3: Add members (with delay)
  if (teamData.memberIds && teamData.memberIds.length > 0) {
    for (const memberId of teamData.memberIds) {
      await addMember(group.id, memberId);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Step 4: Convert group to team
  const teamSettings = {
    'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
    memberSettings: {
      allowCreateUpdateChannels: teamData.memberSettings?.allowCreateUpdateChannels ?? true,
      allowDeleteChannels: teamData.memberSettings?.allowDeleteChannels ?? false,
      allowAddRemoveApps: teamData.memberSettings?.allowAddRemoveApps ?? true,
      allowCreateUpdateRemoveTabs: teamData.memberSettings?.allowCreateUpdateRemoveTabs ?? true,
      allowCreateUpdateRemoveConnectors: teamData.memberSettings?.allowCreateUpdateRemoveConnectors ?? true
    },
    guestSettings: {
      allowCreateUpdateChannels: teamData.guestSettings?.allowCreateUpdateChannels ?? false,
      allowDeleteChannels: teamData.guestSettings?.allowDeleteChannels ?? false
    },
    messagingSettings: {
      allowUserEditMessages: teamData.messagingSettings?.allowUserEditMessages ?? true,
      allowUserDeleteMessages: teamData.messagingSettings?.allowUserDeleteMessages ?? true,
      allowOwnerDeleteMessages: teamData.messagingSettings?.allowOwnerDeleteMessages ?? true,
      allowTeamMentions: teamData.messagingSettings?.allowTeamMentions ?? true,
      allowChannelMentions: teamData.messagingSettings?.allowChannelMentions ?? true
    },
    funSettings: {
      allowGiphy: teamData.funSettings?.allowGiphy ?? true,
      giphyContentRating: teamData.funSettings?.giphyContentRating ?? 'moderate',
      allowStickersAndMemes: teamData.funSettings?.allowStickersAndMemes ?? true,
      allowCustomMemes: teamData.funSettings?.allowCustomMemes ?? true
    }
  };

  await graphService.makeRequest(
    /groups/${group.id}/team`,
    {
      method: 'PUT',
      body: JSON.stringify(teamSettings)
    }
  );

  return group;
}

/**
 * Archive a team (preserves data but makes read-only)
 * @param {string} teamId - The team ID
 */
export async function archiveTeam(teamId) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/archive`,
    {
      method: 'POST',
      body: JSON.stringify({
        shouldSetSpoSiteReadOnlyForMembers: true
      })
    }
  );

  return response;
}

/**
 * Delete a team (deletes the underlying M365 group)
 * @param {string} groupId - The group/team ID
 */
export async function deleteTeam(groupId) {
  await graphService.makeRequest(
    /groups/${groupId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team members
 * @param {string} teamId - The team ID
 */
export async function getMembers(teamId) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/members`,
    {}
  );

  return response;
}

/**
 * Add a member to the team's underlying M365 group
 * @param {string} groupId - The group/team ID
 * @param {string} userId - The user ID to add
 */
export async function addMember(groupId, userId) {
  const memberData = {
    '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
  };

  const response = await graphService.makeRequest(
    /groups/${groupId}/members/$ref`,
    {
      method: 'POST',
      body: JSON.stringify(memberData)
    }
  );

  return response;
}

/**
 * Remove a member from the team's underlying M365 group
 * @param {string} groupId - The group/team ID
 * @param {string} userId - The user ID to remove
 */
export async function removeMember(groupId, userId) {
  await graphService.makeRequest(
    /groups/${groupId}/members/${userId}/$ref`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team owners from the underlying M365 group
 * @param {string} groupId - The group/team ID
 */
export async function getOwners(groupId) {
  const response = await graphService.makeRequest(
    /groups/${groupId}/owners`,
    {}
  );

  return response;
}

/**
 * Add an owner to the team's underlying M365 group
 * @param {string} groupId - The group/team ID
 * @param {string} userId - The user ID to add as owner
 */
export async function addOwner(groupId, userId) {
  const ownerData = {
    '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`
  };

  const response = await graphService.makeRequest(
    /groups/${groupId}/owners/$ref`,
    {
      method: 'POST',
      body: JSON.stringify(ownerData)
    }
  );

  return response;
}

/**
 * Get team channels
 * @param {string} teamId - The team ID
 */
export async function getChannels(teamId) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/channels`,
    {}
  );

  return response;
}

/**
 * Create a new channel in a team
 * @param {string} teamId - The team ID
 * @param {Object} channelData - Channel creation data
 * @param {string} channelData.displayName - Channel display name
 * @param {string} channelData.description - Channel description
 * @param {string} channelData.membershipType - Channel type (standard, private, shared)
 */
export async function createChannel(teamId, channelData) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/channels`,
    {
      method: 'POST',
      body: JSON.stringify({
        displayName: channelData.displayName,
        description: channelData.description,
        membershipType: channelData.membershipType || 'standard'
      })
    }
  );

  return response;
}

/**
 * Update channel properties
 * @param {string} teamId - The team ID
 * @param {string} channelId - The channel ID
 * @param {Object} updates - Properties to update
 */
export async function updateChannel(teamId, channelId, updates) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/channels/${channelId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  );

  return response;
}

/**
 * Delete a channel
 * @param {string} teamId - The team ID
 * @param {string} channelId - The channel ID
 */
export async function deleteChannel(teamId, channelId) {
  await graphService.makeRequest(
    /teams/${teamId}/channels/${channelId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team settings (wrapper around getTeam)
 * @param {string} teamId - The team ID
 */
export async function getTeamSettings(teamId) {
  return getTeam(teamId);
}

/**
 * Update team settings
 * @param {string} teamId - The team ID
 * @param {Object} settings - Settings to update (memberSettings, guestSettings, messagingSettings, funSettings)
 */
export async function updateTeamSettings(teamId, settings) {
  const response = await graphService.makeRequest(
    /teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }
  );

  return response;
}

/**
 * Get installed apps in a team
 * @param {string} teamId - The team ID
 */
export async function getInstalledApps(teamId) {
  const response = await graphService.makeRequest(
    /teams/${teamId}/installedApps?$expand=teamsAppDefinition`,
    {}
  );

  return response;
}

/**
 * Install an app in a team
 * @param {string} teamId - The team ID
 * @param {string} appId - The Teams app ID from the app catalog
 */
export async function installApp(teamId, appId) {
  const appData = {
    'teamsApp@odata.bind': `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/${appId}`
  };

  const response = await graphService.makeRequest(
    /teams/${teamId}/installedApps`,
    {
      method: 'POST',
      body: JSON.stringify(appData)
    }
  );

  return response;
}

/**
 * Uninstall an app from a team
 * @param {string} teamId - The team ID
 * @param {string} installationId - The installation ID
 */
export async function uninstallApp(teamId, installationId) {
  await graphService.makeRequest(
    /teams/${teamId}/installedApps/${installationId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get M365 group settings templates
 * Used to understand available group policy settings
 */
export async function getGroupSettingTemplates() {
  const response = await graphService.makeRequest(
    '/v1.0/groupSettingTemplates',
    {}
  );

  return response;
}

/**
 * Get specific M365 group settings
 * @param {string} groupId - The group/team ID
 */
export async function getGroupSettings(groupId) {
  const response = await graphService.makeRequest(
    /groups/${groupId}/settings`,
    {}
  );

  return response;
}

/**
 * Create or update M365 group settings
 * @param {string} groupId - The group/team ID
 * @param {string} templateId - The settings template ID
 * @param {Array} values - Array of name/value pairs for settings
 */
export async function updateGroupSettings(groupId, templateId, values) {
  const settingsData = {
    templateId: templateId,
    values: values
  };

  const response = await graphService.makeRequest(
    /groups/${groupId}/settings`,
    {
      method: 'POST',
      body: JSON.stringify(settingsData)
    }
  );

  return response;
}

/**
 * Get tenant-wide group settings
 * Shows organization-level M365 group policies
 */
export async function getTenantGroupSettings() {
  const response = await graphService.makeRequest(
    '/v1.0/groupSettings',
    {}
  );

  return response;
}

export const teamsService = {
  getTeams,
  getTeam,
  createTeam,
  archiveTeam,
  deleteTeam,
  getMembers,
  addMember,
  removeMember,
  getOwners,
  addOwner,
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getTeamSettings,
  updateTeamSettings,
  getInstalledApps,
  installApp,
  uninstallApp,
  getGroupSettingTemplates,
  getGroupSettings,
  updateGroupSettings,
  getTenantGroupSettings
};
