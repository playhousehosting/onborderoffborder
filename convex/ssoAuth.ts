import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

/**
 * Create or update session after SSO login
 * Links Convex Auth user to application session
 */
export const createSSOSession = mutation({
  args: {
    convexAuthUserId: v.id("users"),
    email: v.string(),
    displayName: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if session already exists for this Convex Auth user
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_convex_auth_user", (q) => 
        q.eq("convexAuthUserId", args.convexAuthUserId)
      )
      .first();

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    const sessionId = crypto.randomUUID();

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        email: args.email,
        displayName: args.displayName,
        updatedAt: now,
        expiresAt: expiresAt,
      });

      return {
        sessionId: existingSession.sessionId,
        tenantId: existingSession.tenantId,
        email: args.email,
        displayName: args.displayName,
        authMode: "sso" as const,
      };
    }

    // Create new session
    await ctx.db.insert("sessions", {
      tenantId: args.tenantId,
      sessionId: sessionId,
      userId: args.convexAuthUserId,
      email: args.email,
      displayName: args.displayName,
      authMode: "sso",
      roles: ["user"], // Default role, can be enhanced
      convexAuthUserId: args.convexAuthUserId,
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      sessionId: sessionId,
      tenantId: args.tenantId,
      email: args.email,
      displayName: args.displayName,
      authMode: "sso" as const,
    };
  },
});

/**
 * Get session by Convex Auth user ID
 */
export const getSessionByAuthUser = query({
  args: {
    convexAuthUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_convex_auth_user", (q) => 
        q.eq("convexAuthUserId", args.convexAuthUserId)
      )
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      email: session.email,
      displayName: session.displayName,
      authMode: session.authMode,
      roles: session.roles,
    };
  },
});

/**
 * Get current authenticated user from Convex Auth
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await auth.getUserId(ctx);
      console.log('getCurrentUser - userId:', userId);
      
      if (!userId) {
        console.log('getCurrentUser - No userId found');
        return null;
      }

      // Get the user from Convex Auth tables
      const user = await ctx.db.get(userId);
      console.log('getCurrentUser - user from db:', user);

      if (!user) {
        console.log('getCurrentUser - No user in database');
        return null;
      }

      return {
        _id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    } catch (error) {
      console.error('getCurrentUser error:', error);
      return null;
    }
  },
});

/**
 * Check if user has valid SSO session
 */
export const hasValidSSOSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return false;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return false;
    }

    // Check if SSO mode
    if (session.authMode !== "sso") {
      return false;
    }

    return true;
  },
});
