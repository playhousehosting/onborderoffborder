import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Configure Azure credentials and create a session
 */
export const configure = mutation({
  args: {
    clientId: v.string(),
    tenantId: v.string(),
    clientSecret: v.optional(v.string()),
    encryptedCredentials: v.string(), // Pre-encrypted from client
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.clientId || !args.tenantId) {
      throw new Error("Client ID and Tenant ID are required");
    }

    // Generate session ID
    const sessionId = generateSessionId();

    const now = Date.now();
    const expiresAt = now + SESSION_DURATION;

    // Create session record
    await ctx.db.insert("sessions", {
      tenantId: args.tenantId,
      sessionId,
      userId: `temp-${sessionId}`, // Will be updated after authentication
      authMode: args.clientSecret ? "app-only" : "oauth2",
      roles: [],
      credentials: args.encryptedCredentials,
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
    tenantId: v.string(),
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

    // Update session with authenticated user info
    const now = Date.now();
    await ctx.db.patch(session._id, {
      userId: `app-${args.tenantId}`,
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
        id: `app-${args.tenantId}`,
        tenantId: args.tenantId,
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
    console.log('🔍 getStatus called with sessionId:', args.sessionId);
    
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    console.log('🔍 Found session:', session ? 'YES' : 'NO', session);

    if (!session) {
      console.log('❌ No session found');
      return { authenticated: false };
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      console.log('⏰ Session expired');
      return { authenticated: false, reason: "Session expired" };
    }

    console.log('✅ Session authenticated:', {
      authMode: session.authMode,
      userId: session.userId,
      displayName: session.displayName,
    });

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
 * Internal query to get credentials (for use by actions)
 */
export const getCredentialsInternal = internalQuery({
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

    return { encryptedCredentials: session.credentials, tenantId: session.tenantId };
  },
});

/**
 * Get credentials (encrypted) for a session - public query
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

    return { encryptedCredentials: session.credentials, tenantId: session.tenantId };
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
 * Create or update MSAL session (for Microsoft SSO via MSAL)
 */
export const createMSALSession = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    email: v.string(),
    displayName: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('🔵 createMSALSession called with:', {
      sessionId: args.sessionId,
      userId: args.userId,
      email: args.email,
      tenantId: args.tenantId,
    });

    // Validate required fields
    if (!args.sessionId || !args.userId || !args.email || !args.tenantId) {
      throw new Error('Missing required fields for MSAL session creation');
    }

    try {
      // Check if session already exists
      const existingSession = await ctx.db
        .query("sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
        .first();

      const now = Date.now();
      const expiresAt = now + SESSION_DURATION;

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        email: args.email,
        displayName: args.displayName,
        updatedAt: now,
        expiresAt: expiresAt,
      });

      return {
        success: true,
        sessionId: args.sessionId,
        message: "Session updated",
      };
    }

      // Create new session
      const sessionData = {
        tenantId: args.tenantId,
        sessionId: args.sessionId,
        userId: args.userId,
        email: args.email,
        displayName: args.displayName,
        authMode: "oauth2" as const, // MSAL uses OAuth2 delegated permissions
        roles: ["admin"], // Microsoft SSO users get admin role
        expiresAt: expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      console.log('🔵 Inserting new session:', sessionData);
      await ctx.db.insert("sessions", sessionData);
      console.log('✅ Session created successfully');

      return {
        success: true,
        sessionId: args.sessionId,
        message: "Session created",
      };
    } catch (error) {
      console.error('❌ Error in createMSALSession:', error);
      throw error;
    }
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
