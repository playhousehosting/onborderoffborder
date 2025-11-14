"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { encryptCredentials, decryptCredentials } from "./credentialUtils";

// Re-export Convex Auth SSO functions to make them available as public functions
export { signIn, signOut, auth } from "./authInit.js";

/**
 * Configure credentials (encrypts on server-side)
 */
export const configure = action({
  args: {
    clientId: v.string(),
    tenantId: v.string(),
    clientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Encrypt credentials server-side
    const encryptedCredentials = encryptCredentials({
      clientId: args.clientId,
      tenantId: args.tenantId,
      clientSecret: args.clientSecret || null,
    });

    // Call mutation to store
    const result = await ctx.runMutation(api.authMutations.configure, {
      clientId: args.clientId,
      tenantId: args.tenantId,
      clientSecret: args.clientSecret,
      encryptedCredentials,
    });

    return result;
  },
});

/**
 * Login with app-only mode
 */
export const loginAppOnly = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get encrypted credentials
    const credsData = await ctx.runQuery(api.authMutations.getCredentials, {
      sessionId: args.sessionId,
    });

    // Decrypt
    const creds = decryptCredentials(credsData.encryptedCredentials);

    if (!creds.clientSecret) {
      throw new Error("Client secret required for app-only authentication");
    }

    // Validate by getting a token (this proves credentials work)
    const tokenEndpoint = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', creds.clientId);
    params.append('client_secret', creds.clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${error.error_description || error.error}`);
    }

    // Token validated, update session
    return await ctx.runMutation(api.authMutations.loginAppOnly, {
      sessionId: args.sessionId,
      tenantId: creds.tenantId,
    });
  },
});

/**
 * Get decrypted credentials (for Graph API calls)
 */
export const getDecryptedCredentials = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const credsData = await ctx.runQuery(api.authMutations.getCredentials, {
      sessionId: args.sessionId,
    });

    return decryptCredentials(credsData.encryptedCredentials);
  },
});

/**
 * Get app-only access token (called from frontend to avoid CORS)
 */
export const getAppOnlyToken = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get encrypted credentials
    const credsData = await ctx.runQuery(api.authMutations.getCredentials, {
      sessionId: args.sessionId,
    });

    // Decrypt
    const creds = decryptCredentials(credsData.encryptedCredentials);

    if (!creds.clientSecret) {
      throw new Error("Client secret required for app-only authentication");
    }

    // Get token from Microsoft Identity Platform
    const tokenEndpoint = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', creds.clientId);
    params.append('client_secret', creds.clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token acquisition failed: ${error.error_description || error.error}`);
    }

    const tokenData = await response.json();
    
    return {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    };
  },
});
