import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decryptCredentials } from "./credentialUtils";
import { getAccessTokenFromCredentials } from "./graphUtils";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const SYSTEM_EXECUTOR = "system-cron";
const DEFAULT_LIMIT = 5;

async function fetchWithGraphToken(accessToken: string, path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${accessToken}`,
  };

  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch (err) {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  return await response.text();
}

async function loadCredentials(ctx: any, schedule: any) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_session_id", (q: any) => q.eq("sessionId", schedule.sessionId))
    .first();

  if (session?.credentials) {
    return decryptCredentials(session.credentials);
  }

  const tenantSessions = await ctx.db
    .query("sessions")
    .withIndex("by_tenant", (q: any) => q.eq("tenantId", schedule.tenantId))
    .collect();

  if (!tenantSessions.length) {
    throw new Error("No saved credentials for tenant");
  }

  const latest = tenantSessions.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!latest.credentials) {
    throw new Error("Stored tenant credentials are missing secrets");
  }

  return decryptCredentials(latest.credentials);
}

function buildActionResult(action: string, status: "success" | "error" | "skipped" | "warning", message: string, details?: string) {
  return {
    action,
    status,
    message,
    timestamp: Date.now(),
    details,
  };
}

async function removeUserFromAllGroups(accessToken: string, userId: string) {
  const memberOf = (await fetchWithGraphToken(accessToken, `/users/${userId}/memberOf?$select=id,displayName,@odata.type`)) as any;
  const groups = (memberOf?.value || []).filter((entry: any) => entry["@odata.type"]?.toLowerCase().includes("group"));

  for (const group of groups) {
    await fetchWithGraphToken(accessToken, `/groups/${group.id}/members/${userId}/$ref`, {
      method: "DELETE",
    });
  }

  return groups.length;
}

async function performGraphActions(accessToken: string, record: any) {
  const actions = [] as Array<ReturnType<typeof buildActionResult>>;
  let hasFailures = false;

  if (record.actions.disableAccount) {
    try {
      await fetchWithGraphToken(accessToken, `/users/${record.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ accountEnabled: false }),
      });
      actions.push(buildActionResult("disableAccount", "success", "Account disabled"));
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("disableAccount", "error", (error as Error).message));
    }
  }

  if (record.actions.revokeAccess) {
    try {
      await fetchWithGraphToken(accessToken, `/users/${record.userId}/revokeSignInSessions`, {
        method: "POST",
      });
      actions.push(buildActionResult("revokeAccess", "success", "User sessions revoked"));
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("revokeAccess", "error", (error as Error).message));
    }
  }

  if (record.actions.removeFromGroups) {
    try {
      const removed = await removeUserFromAllGroups(accessToken, record.userId);
      actions.push(buildActionResult("removeFromGroups", "success", `Removed from ${removed} groups`));
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("removeFromGroups", "error", (error as Error).message));
    }
  }

  if (record.actions.convertToSharedMailbox) {
    actions.push(buildActionResult("convertToSharedMailbox", "warning", "Server-side mailbox conversion not implemented"));
  }

  if (record.actions.backupData) {
    actions.push(buildActionResult("backupData", "skipped", "Data export requires manual review"));
  }

  if (record.actions.removeDevices) {
    actions.push(buildActionResult("removeDevices", "skipped", "Device retirement handled by Intune automation"));
  }

  return {
    actions,
    hasFailures,
  };
}

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

export const executeScheduledOffboarding = internalMutation({
  args: {
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.offboardingId);
    if (!schedule) {
      return { status: "missing" };
    }

    if (schedule.status !== "scheduled") {
      return { status: schedule.status };
    }

    const startTime = Date.now();
    await ctx.db.patch(args.offboardingId, {
      status: "in-progress",
      executedAt: startTime,
      executedBy: SYSTEM_EXECUTOR,
      updatedAt: startTime,
    });

    const actionsAttempted: Array<ReturnType<typeof buildActionResult>> = [];

    try {
      const credentials = await loadCredentials(ctx, schedule);
      const accessToken = await getAccessTokenFromCredentials(credentials);
      const { actions, hasFailures } = await performGraphActions(accessToken, schedule);
      actionsAttempted.push(...actions);

      const endTime = Date.now();
      const finalStatus = hasFailures ? "failed" : "completed";

      await ctx.db.patch(args.offboardingId, {
        status: finalStatus,
        updatedAt: endTime,
        error: hasFailures ? "One or more actions failed" : undefined,
      });

      await ctx.db.insert("offboarding_execution_logs", {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        offboardingId: args.offboardingId,
        targetUserId: schedule.userId,
        targetUserName: schedule.displayName,
        targetUserEmail: schedule.email || schedule.userPrincipalName,
        executedBy: SYSTEM_EXECUTOR,
        executionType: "scheduled",
        startTime,
        endTime,
        status: hasFailures ? "failed" : "completed",
        totalActions: actionsAttempted.length,
        successfulActions: actionsAttempted.filter((a) => a.status === "success").length,
        failedActions: actionsAttempted.filter((a) => a.status === "error").length,
        skippedActions: actionsAttempted.filter((a) => a.status === "skipped").length,
        actions: actionsAttempted,
        error: hasFailures ? "One or more Graph operations failed" : undefined,
        createdAt: endTime,
      });

      await ctx.db.insert("audit_log", {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        userId: SYSTEM_EXECUTOR,
        action: "execute_offboarding",
        resourceType: "scheduled_offboarding",
        resourceId: args.offboardingId,
        details: `Automated offboarding ${finalStatus} for ${schedule.displayName}`,
        timestamp: endTime,
      });

      return { status: finalStatus };
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = (error as Error).message || "Unknown error";

      await ctx.db.patch(args.offboardingId, {
        status: "failed",
        error: errorMessage,
        updatedAt: endTime,
      });

      await ctx.db.insert("offboarding_execution_logs", {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        offboardingId: args.offboardingId,
        targetUserId: schedule.userId,
        targetUserName: schedule.displayName,
        targetUserEmail: schedule.email || schedule.userPrincipalName,
        executedBy: SYSTEM_EXECUTOR,
        executionType: "scheduled",
        startTime,
        endTime,
        status: "failed",
        totalActions: actionsAttempted.length,
        successfulActions: actionsAttempted.filter((a) => a.status === "success").length,
        failedActions: actionsAttempted.filter((a) => a.status === "error").length,
        skippedActions: actionsAttempted.filter((a) => a.status === "skipped").length,
        actions: actionsAttempted,
        error: errorMessage,
        createdAt: endTime,
      });

      await ctx.db.insert("audit_log", {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        userId: SYSTEM_EXECUTOR,
        action: "execute_offboarding",
        resourceType: "scheduled_offboarding",
        resourceId: args.offboardingId,
        details: `Automated offboarding failed for ${schedule.displayName}: ${errorMessage}`,
        timestamp: endTime,
      });

      return { status: "failed", error: errorMessage };
    }
  },
});

export const scanAndProcessDueOffboardings = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? DEFAULT_LIMIT;
    const due = await ctx.runQuery(internal.offboardingAutomation.getDueOffboardings, {
      now: Date.now(),
      limit,
    });

    for (const record of due) {
      await ctx.runMutation(internal.offboardingAutomation.executeScheduledOffboarding, {
        offboardingId: record._id,
      });
    }

    return { processed: due.length };
  },
});
