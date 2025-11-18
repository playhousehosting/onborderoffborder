# Add Device Privileged Operations Permission

## Issue
Device sync operations are failing with error:
```
403 - Application is not authorized to perform this operation. 
Application must have one of the following scopes: 
DeviceManagementManagedDevices.PrivilegedOperations.All
```

## Required Action
You need to add the `DeviceManagementManagedDevices.PrivilegedOperations.All` permission to your Azure AD app registration.

## Steps to Add Permission

### 1. Navigate to Azure Portal
1. Go to https://portal.azure.com
2. Sign in with Global Administrator or Application Administrator account
3. Navigate to **Azure Active Directory** → **App registrations**

### 2. Find Your App
Look for your app registration (likely named "Employee Offboarding Portal" or similar)

### 3. Add the Permission
1. Click **API permissions** in the left sidebar
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (NOT Delegated permissions)
5. In the search box, type: `DeviceManagementManagedDevices.PrivilegedOperations.All`
6. Check the box next to it
7. Click **Add permissions**

### 4. Grant Admin Consent (CRITICAL)
1. Back on the API permissions page, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for the green checkmark to appear next to the permission

### 5. Wait for Propagation
- Wait 5-10 minutes for the permission to propagate through Azure AD
- Log out and log back into the application
- The device operations should now work

## What This Permission Enables

The `DeviceManagementManagedDevices.PrivilegedOperations.All` permission allows the application to:
- **Sync devices** - Force a sync between Intune and the device
- **Wipe devices** - Remove corporate data from devices
- **Retire devices** - Remove devices from Intune management
- **Reset devices** - Factory reset devices
- **Lock devices** - Remote lock devices

## Permission Scope Comparison

| Permission | Read Devices | Modify Devices | Sync/Wipe/Retire |
|------------|--------------|----------------|------------------|
| `DeviceManagementManagedDevices.Read.All` | ✅ | ❌ | ❌ |
| `DeviceManagementManagedDevices.ReadWrite.All` | ✅ | ✅ | ❌ |
| `DeviceManagementManagedDevices.PrivilegedOperations.All` | ✅ | ✅ | ✅ |

## Troubleshooting

### Permission Not Showing Up
- Make sure you selected **Application permissions**, not Delegated
- Clear your browser cache
- Try a different browser or incognito mode

### Still Getting 403 After Adding
1. Verify you clicked "Grant admin consent"
2. Check that the green checkmark appears next to the permission
3. Log out and log back in
4. Wait up to 30 minutes for token cache to refresh
5. Clear browser localStorage: `localStorage.clear()`

### Don't Have Admin Rights
Contact your Azure AD Global Administrator or Application Administrator to:
1. Add the permission to the app registration
2. Grant admin consent

## Security Considerations

This is a **privileged permission** that allows destructive operations on devices:
- Only grant this permission if device management is required
- Consider using Conditional Access policies to restrict who can use these features
- Enable audit logging to track all device operations
- Review the audit logs regularly for unauthorized actions

## Code Changes Made

The following files have been updated to request this permission:

1. **src/config/msalConfig.js**
   - Added `DeviceManagementManagedDevices.PrivilegedOperations.All` to `loginRequest.scopes`

2. **src/services/authService.js**
   - Added to `getDeviceManagementToken()` method

3. **Documentation**
   - Updated `AZURE_PERMISSIONS_REQUIRED.md`
   - Updated `REQUIRED_PERMISSIONS_SETUP.md`

## Next Steps

After adding the permission:
1. Commit and push the code changes
2. Redeploy the application (if needed)
3. Clear browser cache and localStorage
4. Log out and log back in
5. Test device sync/wipe/retire operations
