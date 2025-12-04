# Scheduled Offboarding System

A comprehensive automated employee offboarding solution that enables IT administrators to schedule, manage, and execute offboarding tasks with full audit trails and security controls.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Frontend Components](#frontend-components)
- [Backend Services](#backend-services)
- [Security Model](#security-model)
- [Offboarding Actions](#offboarding-actions)
- [Automation & Scheduling](#automation--scheduling)
- [Audit & Reporting](#audit--reporting)

---

## Overview

The Scheduled Offboarding System allows organizations to:

- **Schedule offboardings in advance** - Set a specific date and time for automated execution
- **Select granular actions** - Choose exactly which offboarding tasks to perform
- **Use templates** - Apply predefined offboarding templates for consistency
- **Track progress** - Real-time status updates and execution logs
- **Maintain audit trails** - Complete documentation of all actions taken
- **Export reports** - Generate PDF reports for compliance and records

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              ScheduledOffboarding.js Component               │   │
│  │  - User selection & search                                   │   │
│  │  - Date/time picker                                          │   │
│  │  - Action selection (grouped by category)                    │   │
│  │  - Template selection                                        │   │
│  │  - Status dashboard with search/filter                       │   │
│  │  - Auto-refresh & manual refresh controls                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Convex Mutations/Queries
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (Convex Serverless)                      │
│  ┌─────────────────────┐     ┌─────────────────────────────────┐   │
│  │   offboarding.ts    │     │   offboardingAutomation.ts      │   │
│  │  - CRUD operations  │     │  - Cron job scheduler           │   │
│  │  - Tenant isolation │     │  - Microsoft Graph API calls    │   │
│  │  - Session auth     │     │  - Action execution engine      │   │
│  └─────────────────────┘     └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ OAuth 2.0 / MS Graph API
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Microsoft 365 / Azure AD                         │
│  - User account management                                          │
│  - License management                                               │
│  - Group memberships                                                │
│  - Exchange Online mailboxes                                        │
│  - OneDrive / SharePoint                                            │
│  - Intune device management                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Components

### ScheduledOffboarding.js

The main React component providing the complete UI for scheduling and managing offboardings.

#### Key Features

**User Selection**
- Search Microsoft 365 users by name or email
- Display user details (name, email, department, job title)
- Profile picture display

**Date & Time Scheduling**
- Date picker for scheduling future offboardings
- Time picker with minute precision
- Timezone-aware scheduling

**Action Selection (Grouped by Category)**

| Category | Actions |
|----------|---------|
| **Account** | Disable account, Reset password, Revoke sessions |
| **Licensing** | Remove all licenses |
| **Groups & Access** | Remove from groups, Remove from Teams, Remove app access, Remove auth methods |
| **Mailbox** | Convert to shared mailbox, Set email forwarding, Set auto-reply |
| **Data** | Backup user data, Transfer files to manager |
| **Devices** | Wipe devices, Retire devices, Remove apps |

**Status Dashboard**
- List of all scheduled offboardings (tenant-scoped)
- Real-time status updates (Scheduled, In Progress, Completed, Failed)
- Search by user name or email
- Filter by status, template, date range
- Sort by date, user name, status, or created date
- Expandable rows showing detailed execution logs
- Auto-refresh with countdown timer (30-second intervals)
- Manual refresh button

**Template Support**
- Select from predefined offboarding templates
- Templates auto-populate action selections
- Custom action override capability

---

## Backend Services

### offboarding.ts (Convex Mutations & Queries)

Handles all CRUD operations for scheduled offboardings with tenant isolation.

#### Queries

```typescript
// List all scheduled offboardings for the tenant
list: query({ tenantId }) → ScheduledOffboarding[]

// Get a specific scheduled offboarding
get: query({ id }) → ScheduledOffboarding
```

#### Mutations

```typescript
// Create a new scheduled offboarding
create: mutation({
  userId: string,
  user: UserDetails,
  scheduledDate: string,
  scheduledTime: string,
  actions: string[],
  templateId?: string,
  notes?: string
}) → Id

// Update a scheduled offboarding (only if status is 'scheduled')
update: mutation({ id, ...updates }) → void

// Delete a scheduled offboarding (only if status is 'scheduled')
remove: mutation({ id }) → void

// Execute a scheduled offboarding immediately
execute: mutation({ id }) → ExecutionResult

// Retry a failed offboarding
retry: mutation({ id }) → void
```

### offboardingAutomation.ts (Cron Jobs & Graph API)

Handles automated execution and Microsoft Graph API interactions.

#### Cron Job

```typescript
// Runs every minute to check for due offboardings
checkScheduledOffboardings: cron("* * * * *")
```

The cron job:
1. Queries all offboardings with status `scheduled`
2. Checks if `scheduledDate + scheduledTime` has passed
3. Updates status to `in-progress`
4. Calls `performGraphActions()` for each due offboarding
5. Updates status to `completed` or `failed` based on results

#### Action Handlers

Each offboarding action has a dedicated handler:

| Action | Handler | Microsoft Graph API Endpoint |
|--------|---------|------------------------------|
| `disableAccount` | `disableUserAccount()` | `PATCH /users/{id}` |
| `resetPassword` | `resetUserPassword()` | `POST /users/{id}/authentication/passwordMethods/{id}/resetPassword` |
| `revokeAccess` | `revokeUserSessions()` | `POST /users/{id}/revokeSignInSessions` |
| `revokeLicenses` | `removeAllLicenses()` | `POST /users/{id}/assignLicense` |
| `removeFromGroups` | `removeUserFromAllGroups()` | `DELETE /groups/{id}/members/{id}/$ref` |
| `removeFromTeams` | `removeUserFromTeams()` | `DELETE /teams/{id}/members/{id}` |
| `removeAppAccess` | `removeAppAssignments()` | `DELETE /users/{id}/appRoleAssignments/{id}` |
| `removeAuthMethods` | `removeAuthMethods()` | Various auth method endpoints |
| `convertToSharedMailbox` | `convertToSharedMailbox()` | Exchange Online cmdlet via Graph |
| `setEmailForwarding` | `setMailForwarding()` | `PATCH /users/{id}/mailboxSettings` |
| `setAutoReply` | `setAutoReply()` | `PATCH /users/{id}/mailboxSettings` |
| `backupData` | `backupUserData()` | OneDrive/SharePoint APIs |
| `transferFiles` | `transferFilesToManager()` | OneDrive transfer APIs |
| `wipeDevices` | `wipeUserDevices()` | `POST /deviceManagement/managedDevices/{id}/wipe` |
| `retireDevices` | `retireUserDevices()` | `POST /deviceManagement/managedDevices/{id}/retire` |
| `removeApps` | `removeAppsFromDevices()` | Intune app management APIs |

#### Smart Group Filtering

When removing users from groups, the system intelligently filters to only process cloud-managed groups:

```typescript
// Groups that are SKIPPED (not processed):
- Mail-enabled groups (have mail property)
- On-premises synced groups (onPremisesSyncEnabled: true)
- Dynamic membership groups (membershipRule exists)

// Groups that are PROCESSED:
- Cloud-only security groups
- Microsoft 365 groups (cloud-managed)
```

This prevents errors when attempting to modify groups that are managed by on-premises Active Directory or have dynamic membership rules.

---

## Security Model

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │───▶│   Convex     │───▶│  MS Graph    │      │
│  │   (React)    │    │   Backend    │    │     API      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Session     │    │   Tenant     │    │   OAuth 2.0  │      │
│  │  Validation  │    │  Isolation   │    │   Tokens     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Isolation

Every database operation enforces tenant isolation:

```typescript
// All queries filter by tenantId
const offboardings = await ctx.db
  .query("scheduledOffboardings")
  .filter((q) => q.eq(q.field("tenantId"), session.tenantId))
  .collect();

// All mutations verify tenant ownership
const record = await ctx.db.get(args.id);
if (record.tenantId !== session.tenantId) {
  throw new Error("Unauthorized: Record belongs to different tenant");
}
```

**Key Security Properties:**
- ✅ Users can only see offboardings from their own tenant
- ✅ Users cannot modify offboardings from other tenants
- ✅ Tenant ID is derived from authenticated session, never from client
- ✅ All team members within a tenant can view/manage scheduled offboardings

### Session Management

```typescript
// Session validation on every request
const session = await ctx.db
  .query("sessions")
  .filter((q) => q.eq(q.field("userId"), identity.subject))
  .first();

if (!session || !session.tenantId) {
  throw new Error("Invalid session");
}
```

### OAuth 2.0 Token Security

**Token Storage:**
- Access tokens stored encrypted in Convex database
- Refresh tokens securely managed
- Tokens scoped to specific tenant

**Token Refresh:**
```typescript
// Automatic token refresh before expiration
if (tokenExpiresAt < Date.now() + 300000) { // 5 minutes buffer
  await refreshAccessToken(session);
}
```

**Required Microsoft Graph Permissions:**

| Permission | Type | Purpose |
|------------|------|---------|
| `User.ReadWrite.All` | Application | Disable accounts, reset passwords |
| `Directory.ReadWrite.All` | Application | Manage group memberships |
| `Group.ReadWrite.All` | Application | Remove from groups |
| `Mail.ReadWrite` | Application | Mailbox settings, forwarding |
| `MailboxSettings.ReadWrite` | Application | Auto-reply, forwarding |
| `DeviceManagementManagedDevices.ReadWrite.All` | Application | Wipe/retire devices |
| `Files.ReadWrite.All` | Application | Backup and transfer files |
| `TeamMember.ReadWrite.All` | Application | Remove from Teams |
| `AppRoleAssignment.ReadWrite.All` | Application | Remove app access |

### Data Protection

**Sensitive Data Handling:**
- Passwords generated server-side, never logged
- Execution logs exclude sensitive values
- PII minimized in audit records

**Audit Trail:**
```typescript
// Every action is logged with timestamp and result
executionLogs: {
  startTime: timestamp,
  endTime: timestamp,
  actions: [
    {
      action: "disableAccount",
      status: "success" | "failed" | "skipped",
      timestamp: timestamp,
      details: string,
      error?: string
    }
  ],
  totalActions: number,
  successfulActions: number,
  failedActions: number,
  skippedActions: number
}
```

### Input Validation

All inputs are validated using Convex's type system:

```typescript
create: mutation({
  args: {
    userId: v.string(),
    user: v.object({
      id: v.string(),
      displayName: v.string(),
      mail: v.optional(v.string()),
      // ... validated schema
    }),
    scheduledDate: v.string(), // ISO date format
    scheduledTime: v.string(), // HH:MM format
    actions: v.array(v.string()),
    templateId: v.optional(v.string()),
  },
  // ... handler
})
```

---

## Offboarding Actions

### Account Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Disable Account** | Sets `accountEnabled: false` in Azure AD | ✅ Yes |
| **Reset Password** | Generates random 16-char password | ⚠️ New password unknown |
| **Revoke Sessions** | Invalidates all refresh tokens | ✅ Yes (re-login) |

### Licensing Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Remove Licenses** | Removes all assigned licenses | ✅ Yes (re-assign) |

### Group & Access Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Remove from Groups** | Removes from cloud-only groups | ✅ Yes (re-add) |
| **Remove from Teams** | Removes from all Teams | ✅ Yes (re-add) |
| **Remove App Access** | Removes app role assignments | ✅ Yes (re-assign) |
| **Remove Auth Methods** | Removes MFA, phone, etc. | ⚠️ Must re-setup |

### Mailbox Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Convert to Shared** | Converts to shared mailbox | ⚠️ Complex to reverse |
| **Set Forwarding** | Forwards email to manager | ✅ Yes |
| **Set Auto-Reply** | Configures OOO message | ✅ Yes |

### Data Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Backup Data** | Archives OneDrive to specified location | N/A |
| **Transfer Files** | Moves files to manager's OneDrive | ⚠️ Manual restore |

### Device Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| **Wipe Devices** | Factory resets all devices | ❌ No |
| **Retire Devices** | Removes company data only | ❌ No |
| **Remove Apps** | Uninstalls managed apps | ✅ Yes (reinstall) |

---

## Automation & Scheduling

### Scheduling Flow

```
1. User selects employee to offboard
                │
                ▼
2. User selects date/time for offboarding
                │
                ▼
3. User selects actions (or applies template)
                │
                ▼
4. Frontend calls create() mutation
                │
                ▼
5. Backend validates & stores scheduled offboarding
   Status: "scheduled"
                │
                ▼
6. Cron job checks every minute for due offboardings
                │
                ▼
7. When due: Status → "in-progress"
                │
                ▼
8. Actions executed sequentially via Graph API
                │
                ▼
9. Results logged for each action
                │
                ▼
10. Status → "completed" or "failed"
```

### Execution Engine

```typescript
async function performGraphActions(offboarding, accessToken) {
  const results = [];
  
  for (const action of offboarding.actions) {
    try {
      const result = await executeAction(action, offboarding.user, accessToken);
      results.push({ action, status: 'success', details: result });
    } catch (error) {
      results.push({ action, status: 'failed', error: error.message });
    }
  }
  
  return {
    status: results.every(r => r.status === 'success') ? 'completed' : 'partial',
    results
  };
}
```

### Retry Mechanism

Failed offboardings can be retried:

```typescript
// Retry resets status and re-queues for execution
retry: mutation({
  args: { id: v.id("scheduledOffboardings") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "scheduled",
      executionLogs: null,
      error: null,
    });
  }
})
```

---

## Audit & Reporting

### Execution Logs

Every offboarding maintains detailed execution logs:

```json
{
  "startTime": "2024-01-15T09:00:00.000Z",
  "endTime": "2024-01-15T09:00:45.000Z",
  "status": "completed",
  "totalActions": 8,
  "successfulActions": 7,
  "failedActions": 0,
  "skippedActions": 1,
  "actions": [
    {
      "action": "disableAccount",
      "status": "success",
      "timestamp": "2024-01-15T09:00:05.000Z",
      "details": "Account disabled successfully"
    },
    {
      "action": "removeFromGroups",
      "status": "success",
      "timestamp": "2024-01-15T09:00:15.000Z",
      "details": "Removed from 5 groups",
      "groupsRemoved": ["IT Team", "All Employees", "Project Alpha"],
      "groupsSkipped": [
        { "name": "Mail Distribution", "reason": "Mail-enabled group" },
        { "name": "AD Synced Group", "reason": "On-premises synced" }
      ]
    }
  ]
}
```

### PDF Export

Generate comprehensive PDF reports including:

- **Header**: Report title, generation date, user info
- **User Details**: Name, email, department, job title
- **Scheduling Info**: Scheduled date/time, executed date/time, template used
- **Execution Summary**: Total/successful/failed/skipped counts
- **Action Details**: Each action with status and details
- **Groups Removed**: List of successfully removed groups (green section)
- **Groups Skipped**: List of skipped groups with reasons (yellow section)
- **Error Details**: Any error messages for failed actions

### Dashboard Metrics

The status dashboard provides:

- Real-time status for all scheduled offboardings
- Color-coded status badges (blue=scheduled, yellow=in-progress, green=completed, red=failed)
- Filterable and searchable list
- Expandable rows for detailed logs
- Export capability for individual offboardings

---

## Best Practices

### Scheduling Recommendations

1. **Schedule during off-hours** - Minimize user impact
2. **Use templates** - Ensure consistency across offboardings
3. **Review before scheduling** - Verify selected actions
4. **Set appropriate lead time** - Allow for HR/legal review

### Security Recommendations

1. **Limit admin access** - Only authorized personnel should schedule offboardings
2. **Review audit logs** - Regular review of offboarding activities
3. **Test templates** - Verify template actions before production use
4. **Monitor failed actions** - Investigate and retry as needed

### Compliance Considerations

1. **Data retention** - Consider backup before deletion
2. **Legal holds** - Check for litigation holds before proceeding
3. **Documentation** - Export PDF reports for records
4. **Notification** - Inform relevant stakeholders

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Token expired" | OAuth token needs refresh | Re-authenticate tenant |
| "Insufficient privileges" | Missing Graph permissions | Check Azure AD app permissions |
| "User not found" | User already deleted | Mark as completed manually |
| "Group removal failed" | On-prem synced group | System auto-skips these |
| "Device wipe failed" | Device not enrolled | Verify Intune enrollment |

### Status Meanings

| Status | Description |
|--------|-------------|
| **Scheduled** | Waiting for scheduled time |
| **In Progress** | Currently executing actions |
| **Completed** | All actions finished successfully |
| **Failed** | One or more actions failed |
| **Partial** | Some actions succeeded, some failed |

---

## API Reference

### Frontend Hooks

```javascript
// Query scheduled offboardings
const scheduledOffboardings = useQuery(api.offboarding.list, { tenantId });

// Create new scheduled offboarding
const createOffboarding = useMutation(api.offboarding.create);

// Execute immediately
const executeOffboarding = useMutation(api.offboarding.execute);

// Retry failed offboarding
const retryOffboarding = useMutation(api.offboarding.retry);
```

### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `offboarding.list` | Query | List all tenant offboardings |
| `offboarding.get` | Query | Get single offboarding |
| `offboarding.create` | Mutation | Create scheduled offboarding |
| `offboarding.update` | Mutation | Update scheduled offboarding |
| `offboarding.remove` | Mutation | Delete scheduled offboarding |
| `offboarding.execute` | Mutation | Execute immediately |
| `offboarding.retry` | Mutation | Retry failed offboarding |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Basic scheduling and execution |
| 1.1.0 | Update | Added template support |
| 1.2.0 | Update | Smart group filtering (skip on-prem/mail-enabled) |
| 1.3.0 | Update | PDF export with group details |
| 1.4.0 | Update | Expanded action options (15+ actions) |
| 1.5.0 | Update | Tenant-scoped visibility |
| 1.6.0 | Update | Auto-refresh and progress tracking |
| 1.7.0 | Update | Search and filter functionality |

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review execution logs for specific errors
- Contact your system administrator
