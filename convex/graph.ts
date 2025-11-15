"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAccessTokenFromCredentials } from "./graphUtils";

/**
 * Search for users in Microsoft Graph
 */
export const searchUsers = action({
  args: {
    sessionId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Get credentials from session
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    // Get access token
    const accessToken = await getAccessTokenFromCredentials(credentials);

    // Search users via Microsoft Graph
    const searchQuery = encodeURIComponent(args.query);
    const graphUrl = `https://graph.microsoft.com/v1.0/users?$search="displayName:${searchQuery}" OR "userPrincipalName:${searchQuery}" OR "mail:${searchQuery}"&$top=10`;

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: 'eventual',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.value;
  },
});

/**
 * Get user details from Microsoft Graph
 */
export const getUser = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  },
});

/**
 * Disable user account
 */
export const disableUser = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountEnabled: false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return { success: true };
  },
});

/**
 * Revoke user sessions
 */
export const revokeUserSessions = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}/revokeSignInSessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return { success: true };
  },
});

/**
 * Get user's group memberships
 */
export const getUserGroups = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}/memberOf`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.value;
  },
});

/**
 * Remove user from a group
 */
export const removeUserFromGroup = action({
  args: {
    sessionId: v.string(),
    groupId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/groups/${args.groupId}/members/${args.userId}/$ref`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return { success: true };
  },
});

/**
 * Get user's mailbox settings
 */
export const getMailboxSettings = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}/mailboxSettings`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  },
});

/**
 * Set automatic reply (out of office)
 */
export const setAutomaticReply = action({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const credentials = await ctx.runAction(api.authActions.getDecryptedCredentials, {
      sessionId: args.sessionId,
    });

    const accessToken = await getAccessTokenFromCredentials(credentials);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${args.userId}/mailboxSettings`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automaticRepliesSetting: {
            status: 'scheduled',
            internalReplyMessage: args.message,
            externalReplyMessage: args.message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Graph API error: ${error.error?.message || 'Unknown error'}`);
    }

    return { success: true };
  },
});
