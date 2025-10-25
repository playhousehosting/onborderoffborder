import { graphService } from './graphService';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

// Mock data for demo mode
const mockTeams = [
  {
    id: '734c3798-b644-4b50-8f42-b3d56b6d1e35',
    displayName: 'Marketing Team',
    description: 'Collaborate on marketing campaigns and strategies',
    isArchived: false,
    webUrl: 'https://teams.microsoft.com/l/team/19:marketing...',
    visibility: 'private',
    createdDateTime: '2024-01-15T08:00:00Z',
    memberCount: 24,
    channelCount: 8,
    memberSettings: {
      allowCreateUpdateChannels: true,
      allowDeleteChannels: false,
      allowAddRemoveApps: true,
      allowCreateUpdateRemoveTabs: true,
      allowCreateUpdateRemoveConnectors: true
    },
    guestSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false
    },
    messagingSettings: {
      allowUserEditMessages: true,
      allowUserDeleteMessages: true,
      allowOwnerDeleteMessages: true,
      allowTeamMentions: true,
      allowChannelMentions: true
    },
    funSettings: {
      allowGiphy: true,
      giphyContentRating: 'moderate',
      allowStickersAndMemes: true,
      allowCustomMemes: true
    }
  },
  {
    id: 'af630fe0-04d3-4559-8cf9-91fe45e36296',
    displayName: 'Engineering Team',
    description: 'Development and technical discussions',
    isArchived: false,
    webUrl: 'https://teams.microsoft.com/l/team/19:engineering...',
    visibility: 'private',
    createdDateTime: '2024-02-01T09:30:00Z',
    memberCount: 35,
    channelCount: 12,
    memberSettings: {
      allowCreateUpdateChannels: true,
      allowDeleteChannels: true,
      allowAddRemoveApps: true,
      allowCreateUpdateRemoveTabs: true,
      allowCreateUpdateRemoveConnectors: true
    },
    guestSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false
    },
    messagingSettings: {
      allowUserEditMessages: true,
      allowUserDeleteMessages: true,
      allowOwnerDeleteMessages: true,
      allowTeamMentions: true,
      allowChannelMentions: true
    },
    funSettings: {
      allowGiphy: true,
      giphyContentRating: 'moderate',
      allowStickersAndMemes: true,
      allowCustomMemes: true
    }
  },
  {
    id: '9a7608d3-53e4-4a92-804f-ef43f1e5f5b5',
    displayName: 'Sales Team',
    description: 'Sales pipeline and customer engagement',
    isArchived: false,
    webUrl: 'https://teams.microsoft.com/l/team/19:sales...',
    visibility: 'private',
    createdDateTime: '2024-01-20T10:00:00Z',
    memberCount: 18,
    channelCount: 6,
    memberSettings: {
      allowCreateUpdateChannels: true,
      allowDeleteChannels: false,
      allowAddRemoveApps: true,
      allowCreateUpdateRemoveTabs: true,
      allowCreateUpdateRemoveConnectors: false
    },
    guestSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false
    },
    messagingSettings: {
      allowUserEditMessages: true,
      allowUserDeleteMessages: false,
      allowOwnerDeleteMessages: true,
      allowTeamMentions: true,
      allowChannelMentions: true
    },
    funSettings: {
      allowGiphy: false,
      giphyContentRating: 'strict',
      allowStickersAndMemes: false,
      allowCustomMemes: false
    }
  },
  {
    id: 'bc842d7a-2f6e-4b18-a1c7-73ef91d5c8e3',
    displayName: 'Executive Leadership',
    description: 'C-Suite and executive team communications',
    isArchived: false,
    webUrl: 'https://teams.microsoft.com/l/team/19:executive...',
    visibility: 'private',
    createdDateTime: '2024-01-10T07:00:00Z',
    memberCount: 8,
    channelCount: 4,
    memberSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false,
      allowAddRemoveApps: false,
      allowCreateUpdateRemoveTabs: false,
      allowCreateUpdateRemoveConnectors: false
    },
    guestSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false
    },
    messagingSettings: {
      allowUserEditMessages: false,
      allowUserDeleteMessages: false,
      allowOwnerDeleteMessages: true,
      allowTeamMentions: true,
      allowChannelMentions: false
    },
    funSettings: {
      allowGiphy: false,
      giphyContentRating: 'strict',
      allowStickersAndMemes: false,
      allowCustomMemes: false
    }
  },
  {
    id: 'd1aeb56e-5a25-4d91-a4f6-0f5e6a50d887',
    displayName: 'HR Operations',
    description: 'Human resources and employee support',
    isArchived: false,
    webUrl: 'https://teams.microsoft.com/l/team/19:hr...',
    visibility: 'private',
    createdDateTime: '2024-01-25T11:00:00Z',
    memberCount: 12,
    channelCount: 5,
    memberSettings: {
      allowCreateUpdateChannels: true,
      allowDeleteChannels: false,
      allowAddRemoveApps: true,
      allowCreateUpdateRemoveTabs: true,
      allowCreateUpdateRemoveConnectors: true
    },
    guestSettings: {
      allowCreateUpdateChannels: false,
      allowDeleteChannels: false
    },
    messagingSettings: {
      allowUserEditMessages: true,
      allowUserDeleteMessages: true,
      allowOwnerDeleteMessages: true,
      allowTeamMentions: true,
      allowChannelMentions: true
    },
    funSettings: {
      allowGiphy: true,
      giphyContentRating: 'moderate',
      allowStickersAndMemes: true,
      allowCustomMemes: false
    }
  }
];

const mockMembers = {
  '734c3798-b644-4b50-8f42-b3d56b6d1e35': [
    {
      id: 'mem-001',
      roles: ['owner'],
      displayName: 'Sarah Johnson',
      userId: 'user-001',
      email: 'sarah.johnson@company.com',
      membershipType: 'aadUser'
    },
    {
      id: 'mem-002',
      roles: ['member'],
      displayName: 'Michael Brown',
      userId: 'user-002',
      email: 'michael.brown@company.com',
      membershipType: 'aadUser'
    },
    {
      id: 'mem-003',
      roles: ['member'],
      displayName: 'Emily Davis',
      userId: 'user-003',
      email: 'emily.davis@company.com',
      membershipType: 'aadUser'
    }
  ],
  'af630fe0-04d3-4559-8cf9-91fe45e36296': [
    {
      id: 'mem-004',
      roles: ['owner'],
      displayName: 'David Wilson',
      userId: 'user-004',
      email: 'david.wilson@company.com',
      membershipType: 'aadUser'
    },
    {
      id: 'mem-005',
      roles: ['owner'],
      displayName: 'Lisa Chen',
      userId: 'user-005',
      email: 'lisa.chen@company.com',
      membershipType: 'aadUser'
    }
  ]
};

const mockChannels = {
  '734c3798-b644-4b50-8f42-b3d56b6d1e35': [
    {
      id: '19:marketing-general@thread.tacv2',
      displayName: 'General',
      description: 'General team discussions',
      membershipType: 'standard',
      createdDateTime: '2024-01-15T08:00:00Z',
      webUrl: 'https://teams.microsoft.com/l/channel/19:marketing-general...'
    },
    {
      id: '19:marketing-campaigns@thread.tacv2',
      displayName: 'Campaign Planning',
      description: 'Plan and coordinate marketing campaigns',
      membershipType: 'standard',
      createdDateTime: '2024-01-16T09:00:00Z',
      webUrl: 'https://teams.microsoft.com/l/channel/19:marketing-campaigns...'
    },
    {
      id: '19:marketing-analytics@thread.tacv2',
      displayName: 'Analytics',
      description: 'Marketing analytics and reporting',
      membershipType: 'private',
      createdDateTime: '2024-01-20T10:00:00Z',
      webUrl: 'https://teams.microsoft.com/l/channel/19:marketing-analytics...'
    }
  ],
  'af630fe0-04d3-4559-8cf9-91fe45e36296': [
    {
      id: '19:engineering-general@thread.tacv2',
      displayName: 'General',
      description: 'General engineering discussions',
      membershipType: 'standard',
      createdDateTime: '2024-02-01T09:30:00Z',
      webUrl: 'https://teams.microsoft.com/l/channel/19:engineering-general...'
    },
    {
      id: '19:engineering-architecture@thread.tacv2',
      displayName: 'Architecture',
      description: 'System architecture and design',
      membershipType: 'private',
      createdDateTime: '2024-02-02T10:00:00Z',
      webUrl: 'https://teams.microsoft.com/l/channel/19:engineering-architecture...'
    }
  ]
};

const mockInstalledApps = {
  '734c3798-b644-4b50-8f42-b3d56b6d1e35': [
    {
      id: 'app-001',
      teamsApp: {
        id: 'com.microsoft.teamspace.tab.planner',
        displayName: 'Planner',
        distributionMethod: 'store'
      },
      teamsAppDefinition: {
        displayName: 'Planner',
        version: '1.0.0'
      }
    },
    {
      id: 'app-002',
      teamsApp: {
        id: 'com.microsoft.teamspace.tab.powerbi',
        displayName: 'Power BI',
        distributionMethod: 'store'
      },
      teamsAppDefinition: {
        displayName: 'Power BI',
        version: '2.1.0'
      }
    }
  ]
};

/**
 * Get all teams in the organization
 */
export async function getTeams() {
  if (isDemoMode) {
    return { value: mockTeams };
  }

  // Get groups that are teams
  const response = await graphService.makeRequest(
    "/v1.0/groups?$filter=resourceProvisioningOptions/Any(x:x eq 'Team')&$select=id,displayName,description,visibility,createdDateTime",
    {}
  );
  
  return response;
}

/**
 * Get specific team details including settings
 */
export async function getTeam(teamId) {
  if (isDemoMode) {
    const team = mockTeams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');
    return team;
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}`,
    {}
  );
  
  return response;
}

/**
 * Create a new team (4-step process as per Microsoft documentation)
 * Step 1: Create M365 group
 * Step 2: Add owners (minimum 2)
 * Step 3: Add members (with 1 second delay between adds)
 * Step 4: Convert group to team
 */
export async function createTeam(teamData) {
  if (isDemoMode) {
    const newTeam = {
      id: `team-${Date.now()}`,
      displayName: teamData.displayName,
      description: teamData.description,
      isArchived: false,
      webUrl: `https://teams.microsoft.com/l/team/19:${Date.now()}...`,
      visibility: teamData.visibility || 'private',
      createdDateTime: new Date().toISOString(),
      memberCount: 1,
      channelCount: 1,
      memberSettings: {
        allowCreateUpdateChannels: true,
        allowDeleteChannels: false,
        allowAddRemoveApps: true,
        allowCreateUpdateRemoveTabs: true,
        allowCreateUpdateRemoveConnectors: true
      },
      guestSettings: {
        allowCreateUpdateChannels: false,
        allowDeleteChannels: false
      },
      messagingSettings: {
        allowUserEditMessages: true,
        allowUserDeleteMessages: true,
        allowOwnerDeleteMessages: true,
        allowTeamMentions: true,
        allowChannelMentions: true
      },
      funSettings: {
        allowGiphy: true,
        giphyContentRating: 'moderate',
        allowStickersAndMemes: true,
        allowCustomMemes: true
      }
    };
    mockTeams.push(newTeam);
    return newTeam;
  }

  // Step 1: Create M365 group
  const groupData = {
    displayName: teamData.displayName,
    description: teamData.description,
    groupTypes: ['Unified'],
    mailEnabled: true,
    mailNickname: teamData.displayName.toLowerCase().replace(/\s+/g, '-'),
    securityEnabled: false,
    visibility: teamData.visibility || 'Private'
  };

  const group = await graphService.makeRequest(
    '/v1.0/groups',
    {
      method: 'POST',
      body: JSON.stringify(groupData)
    }
  );

  // Steps 2-4 would happen here with proper delays
  // For now, convert to team immediately
  const teamPayload = {
    'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
    'group@odata.bind': `https://graph.microsoft.com/v1.0/groups('${group.id}')`
  };

  const team = await graphService.makeRequest(
    '/v1.0/teams',
    {
      method: 'POST',
      body: JSON.stringify(teamPayload)
    }
  );

  return team;
}

/**
 * Archive a team
 */
export async function archiveTeam(teamId) {
  if (isDemoMode) {
    const team = mockTeams.find(t => t.id === teamId);
    if (team) {
      team.isArchived = true;
    }
    return { success: true };
  }

  await graphService.makeRequest(
    `/v1.0/teams/${teamId}/archive`,
    {
      method: 'POST',
      body: JSON.stringify({ shouldSetSpoSiteReadOnlyForMembers: false })
    }
  );

  return { success: true };
}

/**
 * Delete a team (deletes the backing Microsoft 365 group)
 */
export async function deleteTeam(groupId) {
  if (isDemoMode) {
    const index = mockTeams.findIndex(t => t.id === groupId);
    if (index !== -1) {
      mockTeams.splice(index, 1);
    }
    return { success: true };
  }

  await graphService.makeRequest(
    `/v1.0/groups/${groupId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team members
 */
export async function getMembers(teamId) {
  if (isDemoMode) {
    return { value: mockMembers[teamId] || [] };
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/members`,
    {}
  );

  return response;
}

/**
 * Add member to team (uses group endpoint with $ref binding)
 */
export async function addMember(groupId, userId) {
  if (isDemoMode) {
    const newMember = {
      id: `mem-${Date.now()}`,
      roles: ['member'],
      displayName: 'New Member',
      userId: userId,
      email: `${userId}@company.com`,
      membershipType: 'aadUser'
    };
    if (!mockMembers[groupId]) {
      mockMembers[groupId] = [];
    }
    mockMembers[groupId].push(newMember);
    return newMember;
  }

  const memberData = {
    '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`
  };

  await graphService.makeRequest(
    `/v1.0/groups/${groupId}/members/$ref`,
    {
      method: 'POST',
      body: JSON.stringify(memberData)
    }
  );

  return { success: true };
}

/**
 * Remove member from team
 */
export async function removeMember(groupId, userId) {
  if (isDemoMode) {
    if (mockMembers[groupId]) {
      mockMembers[groupId] = mockMembers[groupId].filter(m => m.userId !== userId);
    }
    return { success: true };
  }

  await graphService.makeRequest(
    `/v1.0/groups/${groupId}/members/${userId}/$ref`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team owners
 */
export async function getOwners(groupId) {
  if (isDemoMode) {
    const members = mockMembers[groupId] || [];
    return { value: members.filter(m => m.roles.includes('owner')) };
  }

  const response = await graphService.makeRequest(
    `/v1.0/groups/${groupId}/owners`,
    {}
  );

  return response;
}

/**
 * Add owner to team
 */
export async function addOwner(groupId, userId) {
  if (isDemoMode) {
    const newOwner = {
      id: `own-${Date.now()}`,
      roles: ['owner'],
      displayName: 'New Owner',
      userId: userId,
      email: `${userId}@company.com`,
      membershipType: 'aadUser'
    };
    if (!mockMembers[groupId]) {
      mockMembers[groupId] = [];
    }
    mockMembers[groupId].push(newOwner);
    return newOwner;
  }

  const ownerData = {
    '@odata.id': `https://graph.microsoft.com/v1.0/users/${userId}`
  };

  await graphService.makeRequest(
    `/v1.0/groups/${groupId}/owners/$ref`,
    {
      method: 'POST',
      body: JSON.stringify(ownerData)
    }
  );

  return { success: true };
}

/**
 * Get team channels
 */
export async function getChannels(teamId) {
  if (isDemoMode) {
    return { value: mockChannels[teamId] || [] };
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/channels`,
    {}
  );

  return response;
}

/**
 * Create a channel
 */
export async function createChannel(teamId, channelData) {
  if (isDemoMode) {
    const newChannel = {
      id: `19:channel-${Date.now()}@thread.tacv2`,
      displayName: channelData.displayName,
      description: channelData.description,
      membershipType: channelData.membershipType || 'standard',
      createdDateTime: new Date().toISOString(),
      webUrl: `https://teams.microsoft.com/l/channel/19:channel-${Date.now()}...`
    };
    if (!mockChannels[teamId]) {
      mockChannels[teamId] = [];
    }
    mockChannels[teamId].push(newChannel);
    return newChannel;
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/channels`,
    {
      method: 'POST',
      body: JSON.stringify(channelData)
    }
  );

  return response;
}

/**
 * Update channel
 */
export async function updateChannel(teamId, channelId, updates) {
  if (isDemoMode) {
    const channels = mockChannels[teamId] || [];
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      Object.assign(channel, updates);
    }
    return channel;
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/channels/${channelId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  );

  return response;
}

/**
 * Delete channel
 */
export async function deleteChannel(teamId, channelId) {
  if (isDemoMode) {
    if (mockChannels[teamId]) {
      mockChannels[teamId] = mockChannels[teamId].filter(c => c.id !== channelId);
    }
    return { success: true };
  }

  await graphService.makeRequest(
    `/v1.0/teams/${teamId}/channels/${channelId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
}

/**
 * Get team settings (included in getTeam response)
 */
export async function getTeamSettings(teamId) {
  return getTeam(teamId);
}

/**
 * Update team settings
 */
export async function updateTeamSettings(teamId, settings) {
  if (isDemoMode) {
    const team = mockTeams.find(t => t.id === teamId);
    if (team) {
      Object.assign(team, settings);
    }
    return team;
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }
  );

  return response;
}

/**
 * Get installed apps
 */
export async function getInstalledApps(teamId) {
  if (isDemoMode) {
    return { value: mockInstalledApps[teamId] || [] };
  }

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/installedApps?$expand=teamsAppDefinition`,
    {}
  );

  return response;
}

/**
 * Install app in team
 */
export async function installApp(teamId, appId) {
  if (isDemoMode) {
    const newApp = {
      id: `app-${Date.now()}`,
      teamsApp: {
        id: appId,
        displayName: 'New App',
        distributionMethod: 'store'
      },
      teamsAppDefinition: {
        displayName: 'New App',
        version: '1.0.0'
      }
    };
    if (!mockInstalledApps[teamId]) {
      mockInstalledApps[teamId] = [];
    }
    mockInstalledApps[teamId].push(newApp);
    return newApp;
  }

  const appData = {
    'teamsApp@odata.bind': `https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/${appId}`
  };

  const response = await graphService.makeRequest(
    `/v1.0/teams/${teamId}/installedApps`,
    {
      method: 'POST',
      body: JSON.stringify(appData)
    }
  );

  return response;
}

/**
 * Uninstall app from team
 */
export async function uninstallApp(teamId, installationId) {
  if (isDemoMode) {
    if (mockInstalledApps[teamId]) {
      mockInstalledApps[teamId] = mockInstalledApps[teamId].filter(a => a.id !== installationId);
    }
    return { success: true };
  }

  await graphService.makeRequest(
    `/v1.0/teams/${teamId}/installedApps/${installationId}`,
    {
      method: 'DELETE'
    }
  );

  return { success: true };
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
  uninstallApp
};
