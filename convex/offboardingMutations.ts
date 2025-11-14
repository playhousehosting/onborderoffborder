import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const SYSTEM_EXECUTOR = "system-cron";

// Pure database mutation - no Node.js, no external calls
export const updateOffboardingStatus = internalMutation({
  args: {
    offboardingId: v.id("scheduled_offboarding"),
    status: v.union(v.literal("scheduled"), v.literal("in-progress"), v.literal("completed"), v.literal("failed")),
    executedAt: v.optional(v.number()),
    executedBy: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { offboardingId, ...updates } = args;
    await ctx.db.patch(offboardingId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Pure database mutation for logging
export const logOffboardingExecution = internalMutation({
  args: {
    tenantId: v.string(),
    sessionId: v.string(),
    offboardingId: v.id("scheduled_offboarding"),
    targetUserId: v.string(),
    targetUserName: v.string(),
    targetUserEmail: v.string(),
    executedBy: v.string(),
    executionType: v.union(v.literal("scheduled"), v.literal("immediate")),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(v.literal("in-progress"), v.literal("completed"), v.literal("failed"), v.literal("partial")),
    totalActions: v.number(),
    successfulActions: v.number(),
    failedActions: v.number(),
    skippedActions: v.number(),
    actions: v.any(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("offboarding_execution_logs", {
      ...args,
      createdAt: Date.now(),
    });

    await ctx.db.insert("audit_log", {
      tenantId: args.tenantId,
      sessionId: args.sessionId,
      userId: args.executedBy,
      action: "execute_offboarding",
      resourceType: "scheduled_offboarding",
      resourceId: args.offboardingId,
      details: `Automated offboarding ${args.status} for ${args.targetUserName}`,
      timestamp: args.endTime,
    });
  },
});
