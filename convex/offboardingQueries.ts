import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getOffboardingById = internalQuery({
  args: {
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.offboardingId);
  },
});

export const getDueOffboardings = internalQuery({
  args: {
    now: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const scheduled = await ctx.db
      .query("scheduled_offboarding")
      .withIndex("by_status", (q: any) => q.eq("status", "scheduled"))
      .collect();

    return scheduled
      .filter((record: any) => record.offboardingDate <= args.now)
      .sort((a: any, b: any) => a.offboardingDate - b.offboardingDate)
      .slice(0, args.limit);
  },
});

export const getSessionCredentials = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q: any) => q.eq("sessionId", args.sessionId))
      .first();
    
    return session?.credentials || null;
  },
});

export const getTenantCredentials = internalQuery({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const tenantSessions = await ctx.db
      .query("sessions")
      .withIndex("by_tenant", (q: any) => q.eq("tenantId", args.tenantId))
      .collect();

    if (!tenantSessions.length) {
      return null;
    }

    const latest = tenantSessions.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    return latest?.credentials || null;
  },
});
