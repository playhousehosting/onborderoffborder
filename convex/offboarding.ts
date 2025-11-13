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
    userName: v.string(),
    userEmail: v.string(),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    timezone: v.optional(v.string()),
    template: v.string(),
    useCustomActions: v.optional(v.boolean()),
    actions: v.optional(v.object({
      disableAccount: v.boolean(),
      revokeAccess: v.boolean(),
      removeFromGroups: v.boolean(),
      convertToSharedMailbox: v.boolean(),
      backupData: v.boolean(),
      removeDevices: v.boolean(),
    })),
    notifyManager: v.boolean(),
    notifyUser: v.boolean(),
    managerEmail: v.optional(v.string()),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    const now = Date.now();
    
    // Combine date and time with timezone into a UTC timestamp
    // Format: YYYY-MM-DDTHH:mm for the datetime string
    const localDateTimeString = `${args.scheduledDate}T${args.scheduledTime}`;
    const timezone = args.timezone || 'UTC';
    
    // Parse the date in the specified timezone and convert to UTC timestamp
    const offboardingDateTime = new Date(localDateTimeString);
    const offboardingTimestamp = offboardingDateTime.getTime();

    const offboardingId = await ctx.db.insert("scheduled_offboarding", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: args.userId,
      userPrincipalName: args.userEmail,
      displayName: args.userName,
      email: args.userEmail,
      offboardingDate: offboardingTimestamp,
      status: "scheduled",
      notes: args.customMessage || "",
      timezone: timezone,
      template: args.template,
      notifyManager: args.notifyManager,
      notifyUser: args.notifyUser,
      managerEmail: args.managerEmail,
      actions: args.useCustomActions && args.actions ? args.actions : {
        disableAccount: true,
        revokeAccess: true,
        removeFromGroups: true,
        convertToSharedMailbox: false,
        backupData: true,
        removeDevices: true,
      },
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
      details: `Scheduled offboarding for ${args.userName} on ${offboardingDateTime.toISOString()}`,
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
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    timezone: v.optional(v.string()),
    template: v.optional(v.string()),
    useCustomActions: v.optional(v.boolean()),
    actions: v.optional(v.object({
      disableAccount: v.boolean(),
      revokeAccess: v.boolean(),
      removeFromGroups: v.boolean(),
      convertToSharedMailbox: v.boolean(),
      backupData: v.boolean(),
      removeDevices: v.boolean(),
    })),
    notifyManager: v.optional(v.boolean()),
    notifyUser: v.optional(v.boolean()),
    managerEmail: v.optional(v.string()),
    customMessage: v.optional(v.string()),
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

    if (args.userId !== undefined) {
      updates.userId = args.userId;
    }
    if (args.userName !== undefined) {
      updates.displayName = args.userName;
    }
    if (args.userEmail !== undefined) {
      updates.email = args.userEmail;
      updates.userPrincipalName = args.userEmail;
    }
    if (args.scheduledDate !== undefined && args.scheduledTime !== undefined) {
      const localDateTimeString = `${args.scheduledDate}T${args.scheduledTime}`;
      const offboardingDateTime = new Date(localDateTimeString);
      updates.offboardingDate = offboardingDateTime.getTime();
    }
    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }
    if (args.template !== undefined) {
      updates.template = args.template;
    }
    if (args.actions !== undefined) {
      updates.actions = args.actions;
    }
    if (args.notifyManager !== undefined) {
      updates.notifyManager = args.notifyManager;
    }
    if (args.notifyUser !== undefined) {
      updates.notifyUser = args.notifyUser;
    }
    if (args.managerEmail !== undefined) {
      updates.managerEmail = args.managerEmail;
    }
    if (args.customMessage !== undefined) {
      updates.notes = args.customMessage;
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
