"use node";

import { internalAction, internalQuery } from "./_generated/server";
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

  // Always add Content-Type for POST/PATCH/PUT methods
  const method = (init.method || 'GET').toUpperCase();
  if ((method === 'POST' || method === 'PATCH' || method === 'PUT') && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = `${GRAPH_BASE_URL}${path}`;
  console.log(`[Graph API] ${method} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
      console.error(`[Graph API Error] ${method} ${fullUrl}: ${errorMessage}`);
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
  // Try session-specific credentials first
  const sessionCreds = await ctx.runQuery(internal.offboardingQueries.getSessionCredentials, {
    sessionId: schedule.sessionId,
  });

  if (sessionCreds) {
    return decryptCredentials(sessionCreds);
  }

  // Fall back to tenant credentials
  const tenantCreds = await ctx.runQuery(internal.offboardingQueries.getTenantCredentials, {
    tenantId: schedule.tenantId,
  });

  if (!tenantCreds) {
    throw new Error("No saved credentials for tenant");
  }

  return decryptCredentials(tenantCreds);
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

// Resolve user identifier to object ID (GUID) - required for some Graph API operations
async function resolveUserObjectId(accessToken: string, userIdentifier: string): Promise<string> {
  // If already a GUID, return as-is
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (guidRegex.test(userIdentifier)) {
    return userIdentifier;
  }
  
  // Otherwise, fetch the user to get their object ID
  const user = (await fetchWithGraphToken(accessToken, `/users/${userIdentifier}?$select=id`)) as any;
  if (!user?.id) {
    throw new Error(`Could not resolve user ID for: ${userIdentifier}`);
  }
  return user.id;
}

async function removeUserFromAllGroups(accessToken: string, userIdentifier: string) {
  // First resolve to object ID - required for DELETE operations on group members
  const userId = await resolveUserObjectId(accessToken, userIdentifier);
  
  // Get all groups the user is a member of
  const memberOf = (await fetchWithGraphToken(accessToken, `/users/${userId}/memberOf`)) as any;
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

  // Graph API accepts both object ID (GUID) and userPrincipalName (email)
  // Fall back to userPrincipalName if userId is empty
  const userIdentifier = record.userId || record.userPrincipalName || record.email;
  
  if (!userIdentifier) {
    throw new Error("No user identifier available (userId, userPrincipalName, or email)");
  }

  console.log(`[Offboarding] Processing user: ${userIdentifier} (${record.displayName || record.userPrincipalName})`);

  if (record.actions.disableAccount) {
    try {
      await fetchWithGraphToken(accessToken, `/users/${userIdentifier}`, {
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
      // revokeSignInSessions is a POST action that doesn't require a body
      await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/revokeSignInSessions`, {
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
      const removed = await removeUserFromAllGroups(accessToken, userIdentifier);
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

export const executeScheduledOffboarding = internalAction({
  args: {
    offboardingId: v.id("scheduled_offboarding"),
  },
  handler: async (ctx, args) => {
    // Fetch schedule data via query
    const schedule = await ctx.runQuery(internal.offboardingQueries.getOffboardingById, {
      offboardingId: args.offboardingId,
    });

    if (!schedule) {
      return { status: "missing" };
    }

    if (schedule.status !== "scheduled") {
      return { status: schedule.status };
    }

    const startTime = Date.now();
    
    // Update status to in-progress via mutation
    await ctx.runMutation(internal.offboardingMutations.updateOffboardingStatus, {
      offboardingId: args.offboardingId,
      status: "in-progress",
      executedAt: startTime,
      executedBy: SYSTEM_EXECUTOR,
    });

    const actionsAttempted: Array<ReturnType<typeof buildActionResult>> = [];

    try {
      const credentials = await loadCredentials(ctx, schedule);
      const accessToken = await getAccessTokenFromCredentials(credentials);
      const { actions, hasFailures } = await performGraphActions(accessToken, schedule);
      actionsAttempted.push(...actions);

      const endTime = Date.now();
      const finalStatus = hasFailures ? "failed" : "completed";

      // Update final status via mutation
      await ctx.runMutation(internal.offboardingMutations.updateOffboardingStatus, {
        offboardingId: args.offboardingId,
        status: finalStatus as "completed" | "failed",
        error: hasFailures ? "One or more actions failed" : undefined,
      });

      // Log execution via mutation
      await ctx.runMutation(internal.offboardingMutations.logOffboardingExecution, {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        offboardingId: args.offboardingId,
        targetUserId: schedule.userId,
        targetUserName: schedule.displayName,
        targetUserEmail: schedule.email || schedule.userPrincipalName,
        executedBy: SYSTEM_EXECUTOR,
        executionType: "scheduled" as const,
        startTime,
        endTime,
        status: (hasFailures ? "failed" : "completed") as "completed" | "failed",
        totalActions: actionsAttempted.length,
        successfulActions: actionsAttempted.filter((a) => a.status === "success").length,
        failedActions: actionsAttempted.filter((a) => a.status === "error").length,
        skippedActions: actionsAttempted.filter((a) => a.status === "skipped").length,
        actions: actionsAttempted,
        error: hasFailures ? "One or more Graph operations failed" : undefined,
      });

      return { status: finalStatus };
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = (error as Error).message || "Unknown error";

      await ctx.runMutation(internal.offboardingMutations.updateOffboardingStatus, {
        offboardingId: args.offboardingId,
        status: "failed",
        error: errorMessage,
      });

      await ctx.runMutation(internal.offboardingMutations.logOffboardingExecution, {
        tenantId: schedule.tenantId,
        sessionId: schedule.sessionId,
        offboardingId: args.offboardingId,
        targetUserId: schedule.userId,
        targetUserName: schedule.displayName,
        targetUserEmail: schedule.email || schedule.userPrincipalName,
        executedBy: SYSTEM_EXECUTOR,
        executionType: "scheduled" as const,
        startTime,
        endTime,
        status: "failed" as const,
        totalActions: actionsAttempted.length,
        successfulActions: actionsAttempted.filter((a) => a.status === "success").length,
        failedActions: actionsAttempted.filter((a) => a.status === "error").length,
        skippedActions: actionsAttempted.filter((a) => a.status === "skipped").length,
        actions: actionsAttempted,
        error: errorMessage,
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
    const due = await ctx.runQuery(internal.offboardingQueries.getDueOffboardings, {
      now: Date.now(),
      limit,
    });

    for (const record of due) {
      await ctx.runAction(internal.offboardingAutomation.executeScheduledOffboarding, {
        offboardingId: record._id,
      });
    }

    return { processed: due.length };
  },
});
