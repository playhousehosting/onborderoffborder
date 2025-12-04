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

interface GroupRemovalResult {
  removedCount: number;
  skippedCount: number;
  removedGroups: string[];
  skippedGroups: Array<{ name: string; reason: string }>;
}

async function removeUserFromAllGroups(accessToken: string, userIdentifier: string): Promise<GroupRemovalResult> {
  // First resolve to object ID - required for DELETE operations on group members
  const userId = await resolveUserObjectId(accessToken, userIdentifier);
  
  // Get all groups the user is a member of with additional properties to filter
  const memberOf = (await fetchWithGraphToken(
    accessToken, 
    `/users/${userId}/memberOf?$select=id,displayName,mailEnabled,securityEnabled,groupTypes,onPremisesSyncEnabled,membershipRule`
  )) as any;
  
  const allGroups = (memberOf?.value || []).filter(
    (entry: any) => entry["@odata.type"]?.toLowerCase().includes("group")
  );

  const removedGroups: string[] = [];
  const skippedGroups: Array<{ name: string; reason: string }> = [];

  for (const group of allGroups) {
    const groupName = group.displayName || group.id;
    const groupTypes = group.groupTypes || [];
    
    // Skip on-premises synced groups (can only be managed in on-prem AD)
    if (group.onPremisesSyncEnabled === true) {
      skippedGroups.push({ name: groupName, reason: "On-premises synced group" });
      console.log(`[Offboarding] Skipping on-prem synced group: ${groupName}`);
      continue;
    }
    
    // Skip dynamic membership groups (membership is automatic based on rules)
    if (groupTypes.includes("DynamicMembership")) {
      skippedGroups.push({ name: groupName, reason: "Dynamic membership group" });
      console.log(`[Offboarding] Skipping dynamic group: ${groupName}`);
      continue;
    }
    
    // Skip mail-enabled security groups and distribution lists
    // These require Exchange admin permissions and have special handling
    if (group.mailEnabled === true && group.securityEnabled === true) {
      skippedGroups.push({ name: groupName, reason: "Mail-enabled security group" });
      console.log(`[Offboarding] Skipping mail-enabled security group: ${groupName}`);
      continue;
    }
    
    // Skip pure distribution lists (mail-enabled, not security-enabled)
    if (group.mailEnabled === true && group.securityEnabled === false) {
      skippedGroups.push({ name: groupName, reason: "Distribution list" });
      console.log(`[Offboarding] Skipping distribution list: ${groupName}`);
      continue;
    }
    
    // This is a cloud-only, assigned membership security group - safe to remove
    try {
      await fetchWithGraphToken(accessToken, `/groups/${group.id}/members/${userId}/$ref`, {
        method: "DELETE",
      });
      removedGroups.push(groupName);
      console.log(`[Offboarding] Removed from group: ${groupName}`);
    } catch (error) {
      // If removal fails, log it as skipped
      skippedGroups.push({ name: groupName, reason: `Failed: ${(error as Error).message}` });
      console.error(`[Offboarding] Failed to remove from group ${groupName}:`, error);
    }
  }

  return {
    removedCount: removedGroups.length,
    skippedCount: skippedGroups.length,
    removedGroups,
    skippedGroups,
  };
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
      const result = await removeUserFromAllGroups(accessToken, userIdentifier);
      
      // Build detailed message
      let message = `Removed from ${result.removedCount} group(s)`;
      if (result.skippedCount > 0) {
        message += `, skipped ${result.skippedCount}`;
      }
      
      // Build details string with group names
      const detailParts: string[] = [];
      if (result.removedGroups.length > 0) {
        detailParts.push(`Removed: ${result.removedGroups.join(", ")}`);
      }
      if (result.skippedGroups.length > 0) {
        const skippedDetails = result.skippedGroups
          .map(g => `${g.name} (${g.reason})`)
          .join(", ");
        detailParts.push(`Skipped: ${skippedDetails}`);
      }
      
      const details = detailParts.join(" | ");
      
      // Mark as warning if some groups were skipped, success if all removed
      const status = result.skippedCount > 0 && result.removedCount > 0 ? "warning" : "success";
      actions.push(buildActionResult("removeFromGroups", status, message, details || undefined));
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("removeFromGroups", "error", (error as Error).message));
    }
  }

  // Reset password
  if (record.actions.resetPassword) {
    try {
      // Generate a random secure password
      const newPassword = generateSecurePassword();
      await fetchWithGraphToken(accessToken, `/users/${userIdentifier}`, {
        method: "PATCH",
        body: JSON.stringify({
          passwordProfile: {
            password: newPassword,
            forceChangePasswordNextSignIn: false,
          },
        }),
      });
      actions.push(buildActionResult("resetPassword", "success", "Password reset successfully"));
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("resetPassword", "error", (error as Error).message));
    }
  }

  // Revoke licenses
  if (record.actions.revokeLicenses) {
    try {
      // Get user's current licenses
      const licenseResponse = await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/licenseDetails`);
      const licenses = licenseResponse.value || [];
      
      if (licenses.length > 0) {
        const licenseSkuIds = licenses.map((lic: { skuId: string }) => lic.skuId);
        await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/assignLicense`, {
          method: "POST",
          body: JSON.stringify({
            addLicenses: [],
            removeLicenses: licenseSkuIds,
          }),
        });
        actions.push(buildActionResult("revokeLicenses", "success", `Revoked ${licenses.length} license(s)`));
      } else {
        actions.push(buildActionResult("revokeLicenses", "skipped", "No licenses to revoke"));
      }
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("revokeLicenses", "error", (error as Error).message));
    }
  }

  // Remove from Teams (handled via groups for now)
  if (record.actions.removeFromTeams) {
    actions.push(buildActionResult("removeFromTeams", "skipped", "Teams removal handled via group removal"));
  }

  // Remove from Apps
  if (record.actions.removeFromApps) {
    try {
      // Get user's app role assignments
      const appResponse = await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/appRoleAssignments`);
      const assignments = appResponse.value || [];
      
      if (assignments.length > 0) {
        let removedCount = 0;
        for (const assignment of assignments) {
          try {
            await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/appRoleAssignments/${assignment.id}`, {
              method: "DELETE",
            });
            removedCount++;
          } catch {
            // Continue on individual failures
          }
        }
        actions.push(buildActionResult("removeFromApps", "success", `Removed ${removedCount} app assignment(s)`));
      } else {
        actions.push(buildActionResult("removeFromApps", "skipped", "No app assignments to remove"));
      }
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("removeFromApps", "error", (error as Error).message));
    }
  }

  // Remove authentication methods
  if (record.actions.removeAuthMethods) {
    try {
      // List authentication methods
      const authMethods = await fetchWithGraphToken(accessToken, `/users/${userIdentifier}/authentication/methods`);
      const methods = authMethods.value || [];
      
      let removedCount = 0;
      for (const method of methods) {
        // Skip password method - can't delete that
        if (method["@odata.type"] === "#microsoft.graph.passwordAuthenticationMethod") continue;
        
        try {
          const methodType = method["@odata.type"]?.replace("#microsoft.graph.", "").replace("AuthenticationMethod", "");
          const endpoint = `/users/${userIdentifier}/authentication/${methodType}Methods/${method.id}`;
          await fetchWithGraphToken(accessToken, endpoint, { method: "DELETE" });
          removedCount++;
        } catch {
          // Continue on individual failures
        }
      }
      
      if (removedCount > 0) {
        actions.push(buildActionResult("removeAuthMethods", "success", `Removed ${removedCount} authentication method(s)`));
      } else {
        actions.push(buildActionResult("removeAuthMethods", "skipped", "No removable authentication methods"));
      }
    } catch (error) {
      hasFailures = true;
      actions.push(buildActionResult("removeAuthMethods", "error", (error as Error).message));
    }
  }

  // Mailbox options
  if (record.actions.convertToSharedMailbox) {
    actions.push(buildActionResult("convertToSharedMailbox", "warning", "Shared mailbox conversion requires Exchange PowerShell"));
  }

  if (record.actions.setEmailForwarding && record.actions.forwardingAddress) {
    actions.push(buildActionResult("setEmailForwarding", "warning", `Email forwarding to ${record.actions.forwardingAddress} requires Exchange PowerShell`));
  }

  if (record.actions.setAutoReply && record.actions.autoReplyMessage) {
    actions.push(buildActionResult("setAutoReply", "warning", "Auto-reply setup requires Exchange PowerShell"));
  }

  // Data management
  if (record.actions.backupData) {
    actions.push(buildActionResult("backupData", "skipped", "Data export requires manual review"));
  }

  if (record.actions.transferFiles && record.actions.newFileOwner) {
    actions.push(buildActionResult("transferFiles", "warning", `File transfer to ${record.actions.newFileOwner} requires manual OneDrive admin action`));
  }

  // Device management
  if (record.actions.retireDevices) {
    actions.push(buildActionResult("retireDevices", "skipped", "Device retirement handled by Intune automation"));
  }

  if (record.actions.wipeDevices) {
    actions.push(buildActionResult("wipeDevices", "skipped", "Device wipe requires explicit Intune admin action"));
  }

  if (record.actions.removeApps) {
    actions.push(buildActionResult("removeApps", "skipped", "App removal handled by Intune automation"));
  }

  return {
    actions,
    hasFailures,
  };
}

// Generate a secure random password
function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  // Ensure at least one of each required type
  password = password.substring(0, 12) + "A" + "a" + "1" + "!";
  return password;
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
