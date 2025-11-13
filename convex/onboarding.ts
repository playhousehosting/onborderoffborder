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
 * Log onboarding execution results
 */
export const logExecution = mutation({
  args: {
    sessionId: v.string(),
    targetUserId: v.optional(v.string()),
    targetUserName: v.string(),
    targetUserEmail: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(
      v.literal("completed"),
      v.literal("partial"),
      v.literal("failed")
    ),
    actions: v.array(v.object({
      action: v.string(),
      status: v.union(
        v.literal("success"),
        v.literal("error"),
        v.literal("skipped"),
        v.literal("warning")
      ),
      message: v.string(),
      timestamp: v.number(),
      details: v.optional(v.string()),
    })),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    // Calculate statistics
    const totalActions = args.actions.length;
    const successfulActions = args.actions.filter(a => a.status === "success").length;
    const failedActions = args.actions.filter(a => a.status === "error").length;
    const skippedActions = args.actions.filter(a => a.status === "skipped").length;

    // Create execution log
    const logId = await ctx.db.insert("onboarding_execution_logs", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      targetUserId: args.targetUserId,
      targetUserName: args.targetUserName,
      targetUserEmail: args.targetUserEmail,
      executedBy: session.userId,
      startTime: args.startTime,
      endTime: args.endTime,
      status: args.status,
      totalActions,
      successfulActions,
      failedActions,
      skippedActions,
      actions: args.actions,
      error: args.error,
      createdAt: Date.now(),
    });

    // Log audit trail
    await ctx.db.insert("audit_log", {
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      userId: session.userId,
      action: "complete_onboarding",
      resourceType: "onboarding_execution_logs",
      resourceId: logId,
      details: `Completed onboarding for ${args.targetUserName} - Status: ${args.status}, Success: ${successfulActions}/${totalActions}`,
      timestamp: Date.now(),
    });

    return { logId, success: true };
  },
});

/**
 * Get execution logs for a user
 */
export const getExecutionLogs = query({
  args: {
    sessionId: v.string(),
    targetUserId: v.optional(v.string()),
    targetUserEmail: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.sessionId);

    let query = ctx.db.query("onboarding_execution_logs");

    // Filter by tenant
    const allLogs = await query.collect();
    let filtered = allLogs.filter(log => log.tenantId === session.tenantId);

    // Optional filters
    if (args.targetUserId) {
      filtered = filtered.filter(log => log.targetUserId === args.targetUserId);
    }
    if (args.targetUserEmail) {
      filtered = filtered.filter(log => log.targetUserEmail === args.targetUserEmail);
    }

    // Sort by most recent first
    filtered.sort((a, b) => b.startTime - a.startTime);

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});
