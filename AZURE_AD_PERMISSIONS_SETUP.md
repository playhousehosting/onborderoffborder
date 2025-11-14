# Azure AD App Permissions Setup

## Required Permissions for App-Only Authentication

Your Azure AD app registration needs **Application permissions** (not Delegated) for the client credentials flow to work properly.

## Steps to Add Permissions

### 1. Go to Azure Portal
Navigate to: https://portal.azure.com → Azure Active Directory → App registrations

### 2. Select Your App
Find and select your app: **Employee Life Cycle Portal** (Client ID: `3f4637ee-e352-4273-96a6-3996a4a7f8c0`)

### 3. Add API Permissions
1. Click **API permissions** in the left menu
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (NOT Delegated permissions)

### 4. Add These Required Permissions

#### User Management
- ✅ `User.Read.All` - Read all users
- ✅ `User.ReadWrite.All` - Read and write all users
- ✅ `Directory.Read.All` - Read directory data
- ✅ `Directory.ReadWrite.All` - Read and write directory data

#### Group & Teams Management
- ⚠️ `Group.Read.All` - Read all groups
- ⚠️ `Group.ReadWrite.All` - Read and write all groups
- ⚠️ `Team.ReadBasic.All` - Read basic team information
- ⚠️ `TeamMember.Read.All` - Read all team members
- ⚠️ `TeamMember.ReadWrite.All` - Read and write all team members
- ⚠️ `TeamSettings.ReadWrite.All` - Read and write team settings
- ⚠️ `Channel.ReadBasic.All` - Read basic channel information

#### Mail Management
- ✅ `Mail.Read` - Read all mailboxes
- ✅ `Mail.ReadWrite` - Read and write all mailboxes
- ✅ `MailboxSettings.Read` - Read mailbox settings
- ✅ `MailboxSettings.ReadWrite` - Read and write mailbox settings

#### Device Management (Intune)
- ✅ `DeviceManagementManagedDevices.Read.All` - Read managed devices
- ✅ `DeviceManagementManagedDevices.ReadWrite.All` - Read and write managed devices
- ✅ `DeviceManagementConfiguration.Read.All` - Read device configuration
- ✅ `DeviceManagementConfiguration.ReadWrite.All` - Read and write device configuration

#### SharePoint & OneDrive
- ✅ `Sites.Read.All` - Read all sites
- ✅ `Sites.ReadWrite.All` - Read and write all sites
- ✅ `Files.Read.All` - Read all files
- ✅ `Files.ReadWrite.All` - Read and write all files

#### Security & Compliance
- ✅ `AuditLog.Read.All` - Read audit logs
- ✅ `SecurityEvents.Read.All` - Read security events
- ✅ `ThreatAssessment.ReadWrite.All` - Read and write threat assessments

### 5. Grant Admin Consent
**IMPORTANT:** After adding permissions:
1. Click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for all permissions to show "Granted" with a green checkmark

### 6. Verify Permissions
Check that all permissions show:
- ✅ Green checkmark under "Status"
- "Admin consent required" = Yes
- "Granted for [Your Organization]" in the status column

## Current Missing Permissions

Based on the error, you're missing these Teams permissions:
- ⚠️ `TeamMember.Read.All`
- ⚠️ `TeamMember.ReadWrite.All`
- ⚠️ `Team.ReadBasic.All`
- ⚠️ `Group.Read.All`
- ⚠️ `Group.ReadWrite.All`

## After Adding Permissions

Once you've added and granted admin consent for the permissions:
1. No code changes needed - the app uses `.default` scope which includes all granted permissions
2. Refresh the application page
3. Try accessing Teams Management again

## Troubleshooting

If you still get 403 errors after adding permissions:
1. Make sure you clicked **Grant admin consent**
2. Wait 5-10 minutes for permissions to propagate
3. Clear your session and log in again with app credentials
4. Check the Azure AD audit logs for any permission grant failures

## Security Notes

- These are **high-privilege** permissions
- Only grant to trusted applications
- Regularly review which apps have these permissions
- Consider using Conditional Access policies to restrict app usage
- Monitor audit logs for suspicious activity

## Documentation

- [Microsoft Graph Permissions Reference](https://docs.microsoft.com/en-us/graph/permissions-reference)
- [Teams API Permissions](https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview#permissions)
- [Application vs Delegated Permissions](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent)
