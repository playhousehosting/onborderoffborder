# Required Microsoft Graph API Permissions Setup

## Current Status
Your application is successfully authenticating and some features work, but several features fail with 403 errors due to missing permissions.

## ✅ Currently Working Permissions
- User.Read.All
- User.ReadWrite.All
- Directory.Read.All
- Directory.ReadWrite.All
- Group.Read.All
- DeviceManagementManagedDevices.ReadWrite.All
- DeviceManagementManagedDevices.PrivilegedOperations.All

## ❌ Missing Permissions (Causing 403 Errors)

### 1. Audit Logs (Dashboard)
**Error**: `AuditLog.Read.All` required
**Feature**: Dashboard audit log timeline
**Permission Type**: Application (Admin consent required)

### 2. Lifecycle Workflows (WorkflowManagement)
**Error**: Insufficient privileges for Identity Governance
**Required Permissions**:
- `LifecycleWorkflows.Read.All` (or ReadWrite.All)
**Permission Type**: Application (Admin consent required)

### 3. Information Protection (PurviewManagement)
**Error**: `InformationProtectionPolicy.Read.All` required
**Feature**: Sensitivity labels and data classification
**Permission Type**: Application (Admin consent required)

### 4. Security Alerts (DefenderManagement)
**Error**: Multiple security scopes missing
**Required Permissions**:
- `SecurityAlert.Read.All`
- `SecurityIncident.Read.All`
**Permission Type**: Application (Admin consent required)

## 🔧 How to Add Permissions in Azure Portal

### Step 1: Navigate to App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app: **Employee Lifecycle Portal** (Client ID: `6932bd51-b6f6-4bb8-a847-dd4ead22dd95`)

### Step 2: Add API Permissions
1. Click **API permissions** in the left menu
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (not Delegated)

### Step 3: Add Each Missing Permission
Add these permissions one by one:

#### Audit Logs
- `AuditLog.Read.All` - Read all audit log data

#### Lifecycle Workflows
- `LifecycleWorkflows.ReadWrite.All` - Read and write all lifecycle workflows

#### Information Protection
- `InformationProtectionPolicy.Read.All` - Read all information protection policies

#### Security & Defender
- `SecurityAlert.Read.All` - Read all security alerts
- `SecurityAlert.ReadWrite.All` - Read and write all security alerts
- `SecurityIncident.Read.All` - Read all security incidents
- `SecurityIncident.ReadWrite.All` - Read and write all security incidents

### Step 4: Grant Admin Consent
**CRITICAL**: After adding permissions, you MUST grant admin consent:
1. Click **Grant admin consent for [Your Organization]**
2. Confirm by clicking **Yes**
3. Wait for the status to show **Granted** with a green checkmark

### Step 5: Verify Permissions
After granting consent, verify all permissions show:
- ✅ Green checkmark in the **Status** column
- "Granted for [Your Organization]" text

## 📋 Complete Permission List

Copy this checklist and verify each permission:

### Current Permissions (Already Granted)
- [x] User.Read
- [x] User.Read.All
- [x] User.ReadWrite.All
- [x] Directory.Read.All
- [x] Directory.ReadWrite.All
- [x] Group.Read.All
- [x] DeviceManagementManagedDevices.ReadWrite.All
- [x] openid
- [x] profile
- [x] email

### New Permissions to Add
- [ ] AuditLog.Read.All
- [ ] LifecycleWorkflows.ReadWrite.All
- [ ] InformationProtectionPolicy.Read.All
- [ ] SecurityAlert.Read.All
- [ ] SecurityAlert.ReadWrite.All
- [ ] SecurityIncident.Read.All
- [ ] SecurityIncident.ReadWrite.All

### Optional Enhanced Permissions
- [ ] MailboxSettings.ReadWrite - For mailbox configuration
- [ ] Mail.ReadWrite - For email forwarding rules
- [ ] Sites.ReadWrite.All - For SharePoint management
- [ ] Files.ReadWrite.All - For OneDrive management

## 🎯 Permission Scope Explanation

### Application vs Delegated
- **Application permissions** (what you need): App acts on its own without a signed-in user
- **Delegated permissions**: App acts on behalf of the signed-in user

### Why Application Permissions?
Your app needs to:
1. Access audit logs across all users
2. Manage workflows for any user
3. View security incidents organization-wide
4. Access data even when no specific user is signed in

## 🚨 Security Considerations

### Why These Permissions Are Safe
1. **Audit Only**: Most permissions are read-only (monitoring, not modifying)
2. **Admin Gated**: Requires global admin consent
3. **Logged**: All API calls are logged in Azure AD audit logs
4. **Scoped**: Only your app can use these permissions, not end users

### Best Practices
✅ Only grant permissions your app actually uses
✅ Use Read permissions when possible, not ReadWrite
✅ Regularly review permission usage
✅ Monitor audit logs for suspicious activity

## 🔍 Testing After Adding Permissions

### 1. Clear Browser Cache
After granting permissions, clear your browser cache or use incognito mode.

### 2. Re-authenticate
1. Log out of the app
2. Log back in with Microsoft
3. This ensures new tokens include new permissions

### 3. Test Each Feature
- **Dashboard**: Should show audit log timeline (not fallback)
- **Workflows**: Should load lifecycle workflows
- **Purview**: Should display sensitivity labels
- **Defender**: Should show security alerts

### 4. Check Console
All 403 errors should be gone. You should see:
```
✅ Graph request successful: {...}
```

## 📞 If You Need Help

### Common Issues

#### Issue: "Admin consent required"
**Solution**: You need a Global Administrator to grant consent

#### Issue: "Permission not found"
**Solution**: Make sure you're adding **Application** permissions, not Delegated

#### Issue: Still getting 403 after granting
**Solution**: 
1. Wait 5-10 minutes for Azure AD to propagate changes
2. Clear browser cache
3. Log out and log back in
4. Check that status shows "Granted" in Azure Portal

## 🎉 After Setup

Once all permissions are granted:
1. All dashboard widgets will show real data
2. Workflow management will be fully functional
3. Security alerts will display
4. Purview compliance features will work
5. No more 403 errors in console

## 📝 Documentation Links

- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/graph/permissions-reference)
- [Lifecycle Workflows Permissions](https://learn.microsoft.com/graph/permissions-reference#lifecycle-workflows-permissions)
- [Security Permissions](https://learn.microsoft.com/graph/permissions-reference#security-permissions)
- [Information Protection Permissions](https://learn.microsoft.com/graph/permissions-reference#information-protection-permissions)

---

**Next Steps**: 
1. Forward this document to your Azure AD Global Administrator
2. Have them add the missing permissions following Step 1-5 above
3. Test the application after permissions are granted
4. Report any remaining issues
