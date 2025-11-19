# Fix Missing Permissions for Advanced Intune Management

## 🚨 Current Issues

Your application is failing with **403 Forbidden** errors because these Microsoft Graph API permissions are missing:

### Required Permissions Not Granted:
1. ❌ `DeviceManagementApps.ReadWrite.All` - For managing mobile apps
2. ❌ `DeviceManagementConfiguration.ReadWrite.All` - For managing policies and compliance
3. ❌ `AuditLog.Read.All` - For dashboard audit logs (optional but recommended)

### Impact:
- **Applications Tab** - Cannot load mobile apps (403 error)
- **Policies Tab** - Cannot load device configurations (403 error)
- **Compliance Tab** - Cannot load compliance policies (403 error)
- **All Advanced Intune Features (Phases 1-9)** - Will fail completely
  - Backup & Migration
  - Policy Comparison
  - Documentation Generator
  - Bulk Clone
  - ADMX Import
  - Assignment Analytics
  - Registry Settings
  - Script Management

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Open Azure Portal
1. Go to https://portal.azure.com
2. Sign in with **Global Administrator** or **Privileged Role Administrator** account
3. Navigate to **Azure Active Directory**
4. Click **App registrations** in left sidebar

### Step 2: Find Your App
1. Search for your app by name or Client ID
   - **App Name:** Employee Offboarding Portal (or similar)
   - **Client ID:** Check your `REACT_APP_CLIENT_ID` environment variable in Vercel
2. Click on the app registration

### Step 3: Add Missing Permissions
1. Click **API permissions** in left sidebar
2. Click **+ Add a permission** button
3. Select **Microsoft Graph**
4. Choose **Application permissions** (NOT Delegated permissions)

#### Add These Permissions:

**For Apps Management:**
- Search: `DeviceManagementApps`
- Check: `DeviceManagementApps.ReadWrite.All`
- Click **Add permissions**

**For Policy/Compliance Management:**
- Click **+ Add a permission** again
- Search: `DeviceManagementConfiguration`
- Check: `DeviceManagementConfiguration.ReadWrite.All`
- Click **Add permissions**

**For Audit Logs (Optional but Recommended):**
- Click **+ Add a permission** again
- Search: `AuditLog`
- Check: `AuditLog.Read.All`
- Click **Add permissions**

### Step 4: Grant Admin Consent (CRITICAL!)
1. On the **API permissions** page, you'll see the new permissions with status "Not granted"
2. Click the **Grant admin consent for [Your Organization]** button at the top
3. Click **Yes** to confirm
4. Wait for green checkmarks to appear next to all permissions
5. Verify status shows "Granted for [Your Organization]"

### Step 5: Wait for Propagation
- Wait **5-10 minutes** for permissions to propagate through Microsoft's systems
- You may need to:
  - Log out and log back in to the portal
  - Clear browser cache and cookies
  - Restart your browser

### Step 6: Verify
1. Refresh your Employee Lifecycle Portal
2. Navigate to **Intune Management**
3. Check that these tabs load without errors:
   - ✅ Applications Tab (should show mobile apps list)
   - ✅ Policies Tab (should show configuration policies)
   - ✅ Compliance Tab (should show compliance policies)
4. Check browser console (F12) - should see no 403 errors

---

## 📋 Complete Permission List

For reference, here's the **complete recommended permission set** for all portal features:

### User & Directory Management
- `User.ReadWrite.All`
- `Directory.ReadWrite.All`
- `UserAuthenticationMethod.ReadWrite.All`
- `Group.ReadWrite.All`
- `GroupMember.ReadWrite.All`

### Mail & Mailbox
- `Mail.ReadWrite`
- `MailboxSettings.ReadWrite`

### Licenses
- `Organization.Read.All`

### Device Management (Intune) - **REQUIRED FOR PHASES 1-9**
- `DeviceManagementManagedDevices.ReadWrite.All`
- `DeviceManagementManagedDevices.PrivilegedOperations.All`
- ⚠️ `DeviceManagementConfiguration.ReadWrite.All` - **MISSING - ADD THIS**
- ⚠️ `DeviceManagementApps.ReadWrite.All` - **MISSING - ADD THIS**
- `DeviceManagementServiceConfig.ReadWrite.All` (optional)

### Lifecycle & Audit
- `LifecycleWorkflows.ReadWrite.All`
- ⚠️ `AuditLog.Read.All` - **MISSING - ADD THIS**
- `Reports.Read.All`

### Files & Sites
- `Files.ReadWrite.All`
- `Sites.ReadWrite.All`

### Teams
- `Team.ReadBasic.All`
- `TeamMember.ReadWrite.All`

---

## 🔍 Verification Commands

After adding permissions, you can verify they're working:

### Test in Browser Console (F12):
```javascript
// Open your portal, then run in console:
console.log("Testing permissions...");

// Should NOT show 403 errors
fetch('https://graph.microsoft.com/v1.0/deviceAppManagement/mobileApps')
  .then(r => r.json())
  .then(d => console.log("✅ Apps permission working:", d))
  .catch(e => console.error("❌ Apps permission failed:", e));

fetch('https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies')
  .then(r => r.json())
  .then(d => console.log("✅ Compliance permission working:", d))
  .catch(e => console.error("❌ Compliance permission failed:", e));
```

---

## ❓ Troubleshooting

### Problem: "I don't see 'Grant admin consent' button"
**Solution:** You need Global Administrator or Privileged Role Administrator role. Contact your tenant administrator.

### Problem: "Permissions granted but still getting 403 errors"
**Solutions:**
1. Wait 10-15 minutes for propagation
2. Clear browser cache and cookies completely
3. Log out and log back in
4. Check that you granted **Application** permissions, not **Delegated**
5. Verify green checkmarks appear in Azure Portal

### Problem: "403 error only on some endpoints"
**Solution:** Check the error message - it will tell you exactly which permission is missing. Add that specific permission and grant consent again.

### Problem: "Cannot grant consent for my organization"
**Solution:** You need one of these roles:
- Global Administrator
- Privileged Role Administrator
- Cloud Application Administrator (with owner access to the app)

---

## 📚 Additional Resources

- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/graph/permissions-reference)
- [Intune Graph API Documentation](https://learn.microsoft.com/graph/api/resources/intune-graph-overview)
- [Grant Admin Consent](https://learn.microsoft.com/azure/active-directory/manage-apps/grant-admin-consent)

---

## ✅ Success Criteria

After completing these steps, you should:
- ✅ See no 403 errors in browser console
- ✅ Applications Tab loads mobile apps successfully
- ✅ Policies Tab loads configuration policies
- ✅ Compliance Tab loads compliance policies
- ✅ All 9 Advanced Intune Management features work (Backup, Import, Compare, etc.)
- ✅ Dashboard shows audit logs without errors

**Estimated Time:** 5-10 minutes + 5-10 minutes propagation wait

---

**Last Updated:** November 19, 2025  
**Related Documentation:** AZURE_PERMISSIONS_REQUIRED.md, AZURE_AD_PERMISSIONS_SETUP.md
