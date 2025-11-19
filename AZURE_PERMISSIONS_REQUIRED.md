# Required Azure App Permissions

## Current Issues
Based on the console errors, your app is missing these permissions:

### 1. ✅ Authentication Methods (Password Reset)
**Error:** `GET /users/.../authentication/methods 403 (Forbidden)`

**Required Permission:**
- `UserAuthenticationMethod.ReadWrite.All` (Application)

### 2. ✅ Lifecycle Workflows  
**Error:** `GET /identityGovernance/lifecycleWorkflows/workflows 403 (Forbidden)`

**Required Permission:**
- `LifecycleWorkflows.ReadWrite.All` (Application)

### 3. ✅ Device Management (if accessing Intune)
**Error:** `GET /deviceManagement/managedDevices 404` (may also need permissions)

**Required Permission:**
- `DeviceManagementManagedDevices.ReadWrite.All` (Application)

### 4. ✅ Audit Logs
**Error:** `GET /auditLogs/directoryAudits 404` (may need permissions)

**Required Permission:**
- `AuditLog.Read.All` (Application)

---

## Complete Recommended Permission Set

### Core User Management
- ✅ `User.ReadWrite.All` - Read and write all users
- ✅ `Directory.ReadWrite.All` - Read and write directory data
- ✅ `UserAuthenticationMethod.ReadWrite.All` - Manage user authentication methods

### Group Management
- ✅ `Group.ReadWrite.All` - Read and write all groups
- ✅ `GroupMember.ReadWrite.All` - Read and write group memberships

### Mail & Mailbox
- ✅ `Mail.ReadWrite` - Read and write mail in all mailboxes
- ✅ `MailboxSettings.ReadWrite` - Read and write mailbox settings

### Licenses
- ✅ `Organization.Read.All` - Read organization info (for license SKUs)

### Device Management (Intune) - **CRITICAL FOR PHASES 1-9**
- ✅ `DeviceManagementManagedDevices.ReadWrite.All` - Read and write managed devices
- ✅ `DeviceManagementManagedDevices.PrivilegedOperations.All` - Perform privileged operations (sync, wipe, retire)
- ✅ `DeviceManagementConfiguration.ReadWrite.All` - **REQUIRED** Read and write device configs (policies, compliance, settings catalog)
- ✅ `DeviceManagementApps.ReadWrite.All` - **REQUIRED** Manage apps on devices (Win32 apps, mobile apps)
- ✅ `DeviceManagementServiceConfig.ReadWrite.All` - Read and write service configuration (assignments, categories)

**Note:** Without `DeviceManagementConfiguration.ReadWrite.All` and `DeviceManagementApps.ReadWrite.All`, all Advanced Intune Management features (Phases 1-9) will fail with 403 errors.

### Lifecycle Workflows
- ✅ `LifecycleWorkflows.ReadWrite.All` - Manage lifecycle workflows

### Audit & Reporting
- ✅ `AuditLog.Read.All` - Read audit logs
- ✅ `Reports.Read.All` - Read usage reports

### Files (OneDrive/SharePoint)
- ✅ `Files.ReadWrite.All` - Read and write files in all sites
- ✅ `Sites.ReadWrite.All` - Edit or delete items in all site collections

### Teams
- ✅ `Team.ReadBasic.All` - Read basic team properties
- ✅ `TeamMember.ReadWrite.All` - Add and remove members from teams

---

## How to Add Permissions

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Select your app: **Employee Offboarding Portal** (Client ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`)
4. Click **API permissions** in the left sidebar
5. Click **+ Add a permission**
6. Select **Microsoft Graph**
7. Choose **Application permissions** (not Delegated)
8. Search for and add each permission listed above
9. **CRITICAL:** Click **Grant admin consent for [Your Tenant]**
   - Without this step, the permissions won't work!
   - You need Global Admin or Privileged Role Admin rights

---

## Verify Permissions

After granting consent, you should see:
- Green checkmarks next to all permissions
- "Granted for [Your Tenant]" status
- No yellow warning icons

Wait 5-10 minutes for permissions to propagate, then refresh your app.

---

## Notes

- All permissions listed are **Application permissions** (not Delegated)
- Your app uses **app-only authentication** (client credentials flow)
- Some features (like Lifecycle Workflows) require Azure AD P2 licensing
- Audit logs may have a delay of up to 24 hours for some events
