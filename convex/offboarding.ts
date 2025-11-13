import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Validate session and extract tenant context
 */
async function validateSession(ctx: any, sessionId: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", sessionId))
    .first();

  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  if (session.expiresAt < Date.now()) {
    throw new Error("Unauthorized: Session expired");
  }

  return session;
}

/**
 * List scheduled offboarding records for a tenant
 */
export const list = query({
  args: {
    sessionId: v.string(),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    // Query offboarding records for this tenant
    let query = ctx.db
      .query("scheduled_offboarding")
      .withIndex("by_tenant", (q: any) => q.eq("tenantId", session.tenantId));

    const records = await query.collect();

    // Filter by session or creator (multi-session support)
    const filtered = records.filter(
      (record: any) =>
        record.sessionId === session.sessionId ||
        record.createdBy === session.userId
    );

    // Optionally filter by status
    if (args.status) {
      return filtered.filter((record: any) => record.status === args.status);
    }

    // Sort by offboarding date
    return filtered.sort((a: any, b: any) => a.offboardingDate - b.offboardingDate);
  },
});

/**
 * Get a single scheduled offboarding record
 */
export const get = query({
  args: {
    sessionId: v.string(),
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const record = await ctx.db.get(args.offboardingId);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    // Verify tenant ownership
    if (record.tenantId !== session.tenantId) {
      throw new Error("Unauthorized: Access denied");
    }

    // Verify session or creator ownership
    if (
      record.sessionId !== session.sessionId &&
      record.createdBy !== session.userId
    ) {
      throw new Error("Unauthorized: Access denied");
    }

    return record;
  },
});

/**
 * Create a new scheduled offboarding record
 */
export const create = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    userPrincipalName: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    manager: v.optional(v.string()),
    offboardingDate: v.number(),
    notes: v.optional(v.string()),
    actions: v.object({
      disableAccount: v.boolean(),
      revokeAccess: v.boolean(),
      removeFromGroups: v.boolean(),
      forwardEmail: v.optional(v.string()),
      convertToSharedMailbox: v.boolean(),
      backupData: v.boolean(),
      removeDevices: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const now = Date.now();

    const offboardingId = await ctx.db.insert("scheduled_offboarding", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: args.userId,
      userPrincipalName: args.userPrincipalName,
      displayName: args.displayName,
      email: args.email,
      department: args.department,
      jobTitle: args.jobTitle,
      manager: args.manager,
      offboardingDate: args.offboardingDate,
      status: "scheduled",
      notes: args.notes,
      actions: args.actions,
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit trail
    await ctx.db.insert("audit_log", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: session.userId,
      action: "schedule_offboarding",
      resourceType: "scheduled_offboarding",
      resourceId: offboardingId,
      details: `Scheduled offboarding for ${args.displayName} on ${new Date(args.offboardingDate).toISOString()}`,
      timestamp: now,
    });

    return { id: offboardingId };
  },
});

/**
 * Update an existing scheduled offboarding record
 */
export const update = mutation({
  args: {
    sessionId: v.string(),
    offboardingId: v.id("scheduled_offboarding"),
    offboardingDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed")
    )),
    actions: v.optional(v.object({
      disableAccount: v.boolean(),
      revokeAccess: v.boolean(),
      removeFromGroups: v.boolean(),
      forwardEmail: v.optional(v.string()),
      convertToSharedMailbox: v.boolean(),
      backupData: v.boolean(),
      removeDevices: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const record = await ctx.db.get(args.offboardingId);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    // Verify tenant ownership
    if (record.tenantId !== session.tenantId) {
      throw new Error("Unauthorized: Access denied");
    }

    // Verify session or creator ownership
    if (
      record.sessionId !== session.sessionId &&
      record.createdBy !== session.userId
    ) {
      throw new Error("Unauthorized: Access denied");
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.offboardingDate !== undefined) {
      updates.offboardingDate = args.offboardingDate;
    }
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.actions !== undefined) {
      updates.actions = args.actions;
    }

    await ctx.db.patch(args.offboardingId, updates);

    // Log audit trail
    await ctx.db.insert("audit_log", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: session.userId,
      action: "update_offboarding",
      resourceType: "scheduled_offboarding",
      resourceId: args.offboardingId,
      details: `Updated offboarding for ${record.displayName}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a scheduled offboarding record
 */
export const remove = mutation({
  args: {
    sessionId: v.string(),
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const record = await ctx.db.get(args.offboardingId);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    // Verify tenant ownership
    if (record.tenantId !== session.tenantId) {
      throw new Error("Unauthorized: Access denied");
    }

    // Verify session or creator ownership
    if (
      record.sessionId !== session.sessionId &&
      record.createdBy !== session.userId
    ) {
      throw new Error("Unauthorized: Access denied");
    }

    await ctx.db.delete(args.offboardingId);

    // Log audit trail
    await ctx.db.insert("audit_log", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: session.userId,
      action: "delete_offboarding",
      resourceType: "scheduled_offboarding",
      resourceId: args.offboardingId,
      details: `Deleted offboarding for ${record.displayName}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Execute a scheduled offboarding
 */
export const execute = mutation({
  args: {
    sessionId: v.string(),
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const record = await ctx.db.get(args.offboardingId);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    // Verify tenant ownership
    if (record.tenantId !== session.tenantId) {
      throw new Error("Unauthorized: Access denied");
    }

    // Update status to in-progress
    const now = Date.now();
    await ctx.db.patch(args.offboardingId, {
      status: "in-progress",
      executedAt: now,
      executedBy: session.userId,
      updatedAt: now,
    });

    // Log audit trail
    await ctx.db.insert("audit_log", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: session.userId,
      action: "execute_offboarding",
      resourceType: "scheduled_offboarding",
      resourceId: args.offboardingId,
      details: `Started offboarding execution for ${record.displayName}`,
      timestamp: now,
    });

    // Note: Actual offboarding actions (disable account, etc.) will be handled
    // by Microsoft Graph API calls from the frontend or a separate action
    
    return { success: true, status: "in-progress" };
  },
});
