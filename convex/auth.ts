import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Configure Azure credentials and create a session
 */
export const configure = mutation({
  args: {
    clientId: v.string(),
    tenantId: v.string(),
    clientSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.clientId || !args.tenantId) {
      throw new Error("Client ID and Tenant ID are required");
    }

    // Generate session ID
    const sessionId = generateSessionId();
    
    // Encrypt credentials
    const encryptedCredentials = encryptCredentials({
      clientId: args.clientId,
      tenantId: args.tenantId,
      clientSecret: args.clientSecret || null,
    });

    const now = Date.now();
    const expiresAt = now + SESSION_DURATION;

    // Create session record
    const sessionDocId = await ctx.db.insert("sessions", {
      tenantId: args.tenantId,
      sessionId,
      userId: `temp-${sessionId}`, // Will be updated after authentication
      authMode: args.clientSecret ? "app-only" : "oauth2",
      roles: [],
      credentials: encryptedCredentials,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      sessionId,
      message: "Credentials saved securely",
      hasSecret: !!args.clientSecret,
    };
  },
});

/**
 * Login with app-only (client credentials) authentication
 */
export const loginAppOnly = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session by sessionId
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("No session found. Please configure credentials first.");
    }

    if (!session.credentials) {
      throw new Error("No credentials configured");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired. Please re-authenticate.");
    }

    // Decrypt credentials to validate
    const creds = decryptCredentials(session.credentials);
    
    if (!creds.clientSecret) {
      throw new Error("Client secret required for app-only authentication");
    }

    // Update session with authenticated user info
    const now = Date.now();
    await ctx.db.patch(session._id, {
      userId: `app-${creds.tenantId}`,
      email: "app@system",
      displayName: "Application Admin",
      authMode: "app-only",
      roles: ["admin"],
      updatedAt: now,
    });

    return {
      success: true,
      authMode: "app-only",
      user: {
        id: `app-${creds.tenantId}`,
        tenantId: creds.tenantId,
        displayName: "Application Admin",
        email: "app@system",
        roles: ["admin"],
      },
    };
  },
});

/**
 * Login with OAuth2 (delegated) authentication
 */
export const loginOAuth2 = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    email: v.string(),
    displayName: v.string(),
    tenantId: v.string(),
    roles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Find session by sessionId
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("No session found. Please configure credentials first.");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired. Please re-authenticate.");
    }

    // Update session with OAuth2 user info
    const now = Date.now();
    await ctx.db.patch(session._id, {
      tenantId: args.tenantId,
      userId: args.userId,
      email: args.email,
      displayName: args.displayName,
      authMode: "oauth2",
      roles: args.roles || ["user"],
      updatedAt: now,
    });

    return {
      success: true,
      authMode: "oauth2",
      user: {
        id: args.userId,
        tenantId: args.tenantId,
        displayName: args.displayName,
        email: args.email,
        roles: args.roles || ["user"],
      },
    };
  },
});

/**
 * Get session status
 */
export const getStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return { authenticated: false };
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      return { authenticated: false, reason: "Session expired" };
    }

    return {
      authenticated: true,
      authMode: session.authMode,
      user: {
        id: session.userId,
        tenantId: session.tenantId,
        displayName: session.displayName,
        email: session.email,
        roles: session.roles,
      },
    };
  },
});

/**
 * Get decrypted credentials for a session
 */
export const getCredentials = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || !session.credentials) {
      throw new Error("No credentials found");
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    return decryptCredentials(session.credentials);
  },
});

/**
 * Logout - delete session
 */
export const logout = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Cleanup expired sessions (run periodically)
 */
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: expiredSessions.length };
  },
});
