import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Employee Offboarding Portal
 * Multi-tenant architecture with tenant isolation
 */
export default defineSchema({
  // User sessions for authentication
  sessions: defineTable({
    tenantId: v.string(),
    sessionId: v.string(),
    userId: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    authMode: v.union(v.literal("app-only"), v.literal("oauth2")),
    roles: v.array(v.string()),
    credentials: v.optional(v.string()), // Encrypted Azure credentials
    expiresAt: v.number(), // Unix timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_tenant_and_session", ["tenantId", "sessionId"])
    .index("by_tenant", ["tenantId"])
    .index("by_expires", ["expiresAt"]),

  // Scheduled offboarding records
  scheduled_offboarding: defineTable({
    tenantId: v.string(),
    sessionId: v.string(),
    userId: v.string(), // User ID from Microsoft Graph
    userPrincipalName: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    department: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    manager: v.optional(v.string()),
    offboardingDate: v.number(), // Unix timestamp
    status: v.union(
      v.literal("scheduled"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    notes: v.optional(v.string()),
    
    // Scheduling details
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York")
    template: v.optional(v.string()),
    notifyManager: v.optional(v.boolean()),
    notifyUser: v.optional(v.boolean()),
    managerEmail: v.optional(v.string()),
    
    // Actions configuration
    actions: v.object({
      disableAccount: v.boolean(),
      revokeAccess: v.boolean(),
      removeFromGroups: v.boolean(),
      forwardEmail: v.optional(v.string()),
      convertToSharedMailbox: v.boolean(),
      backupData: v.boolean(),
      removeDevices: v.boolean(),
    }),
    
    // Execution tracking
    executedAt: v.optional(v.number()),
    executedBy: v.optional(v.string()),
    error: v.optional(v.string()),
    
    // Metadata
    createdBy: v.string(), // User who created the record
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_session", ["tenantId", "sessionId"])
    .index("by_tenant_and_status", ["tenantId", "status"])
    .index("by_tenant_and_date", ["tenantId", "offboardingDate"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_date", ["offboardingDate"]),

  // Offboarding execution logs for detailed audit trail
  offboarding_execution_logs: defineTable({
    tenantId: v.string(),
    sessionId: v.string(),
    offboardingId: v.optional(v.id("scheduled_offboarding")), // Link to scheduled offboarding if applicable
    targetUserId: v.string(), // User being offboarded
    targetUserName: v.string(),
    targetUserEmail: v.string(),
    executedBy: v.string(), // User who executed the offboarding
    executionType: v.union(
      v.literal("immediate"),
      v.literal("scheduled")
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("partial"),
      v.literal("failed")
    ),
    totalActions: v.number(),
    successfulActions: v.number(),
    failedActions: v.number(),
    skippedActions: v.number(),
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
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_time", ["tenantId", "startTime"])
    .index("by_offboarding_id", ["offboardingId"])
    .index("by_target_user", ["targetUserId"])
    .index("by_executed_by", ["executedBy"])
    .index("by_status", ["status"]),

  // Audit log for compliance
  audit_log: defineTable({
    tenantId: v.string(),
    sessionId: v.string(),
    userId: v.string(), // User who performed the action
    action: v.string(), // e.g., "schedule_offboarding", "execute_offboarding", "update_config"
    resourceType: v.string(), // e.g., "scheduled_offboarding", "user", "session"
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_and_timestamp", ["tenantId", "timestamp"])
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_resource", ["resourceType", "resourceId"]),
});
