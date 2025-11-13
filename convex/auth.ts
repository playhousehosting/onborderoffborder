"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";

/**
 * Encrypt credentials for secure storage
 */
function encryptCredentials(credentials: any): string {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(credentials), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt credentials from storage
 */
function decryptCredentials(encryptedData: string): any {
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const parts = encryptedData.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return JSON.parse(decrypted);
}

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
