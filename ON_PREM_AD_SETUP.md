# On-Premises Active Directory Integration Setup Guide

This guide explains how to configure the Employee Lifecycle Portal to create users in your on-premises Active Directory that automatically sync to Azure AD.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup Steps](#setup-steps)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)

---

## 🎯 Overview

**What This Feature Does:**
- Allows creating new users in on-premises Active Directory via the portal
- Users automatically sync to Azure AD via Azure AD Connect (within 30 minutes)
- Once synced, users can access Microsoft 365, Azure resources, and all cloud services
- Provides a unified onboarding experience for hybrid identity environments

**How It Works:**
```
Portal → Backend API → PowerShell Remoting → Domain Controller → Azure AD Connect → Azure AD
```

---

## ✅ Prerequisites

### 1. **Azure AD Connect Already Installed**
You must have Azure AD Connect (or Azure AD Cloud Sync) already configured and synchronizing users from on-premises AD to Azure AD.

- **Check Status:** Run on your AD Connect server:
  ```powershell
  Get-ADSyncScheduler
  ```
  You should see sync status and schedule (typically every 30 minutes)

### 2. **PowerShell Remoting Enabled**
The backend server needs to execute PowerShell commands on your Domain Controller remotely.

**On the Domain Controller:**
```powershell
# Enable PowerShell Remoting
Enable-PSRemoting -Force

# Add backend server to trusted hosts (if not domain-joined)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "backend-server-hostname" -Force

# Verify configuration
Test-WSMan localhost
```

### 3. **Service Account with Permissions**
Create a dedicated service account for the portal with minimal required permissions.

**Required Permissions:**
- Create user objects in the target OU
- Write all user properties (department, title, email, etc.)
- Reset passwords

**PowerShell Commands:**
```powershell
# Create service account
New-ADUser -Name "svc_portal" `
  -UserPrincipalName "svc_portal@yourdomain.com" `
  -AccountPassword (ConvertTo-SecureString "SecurePassword123!" -AsPlainText -Force) `
  -Enabled $true `
  -PasswordNeverExpires $true `
  -CannotChangePassword $true

# Delegate permissions to specific OU
# Run Active Directory Users and Computers → Right-click OU → Delegate Control
# Grant "Create, delete, and manage user accounts" to svc_portal
```

### 4. **Network Connectivity**
- Backend server must be able to reach Domain Controller on port 5985 (WinRM HTTP) or 5986 (WinRM HTTPS)
- Firewall rules must allow PowerShell remoting traffic

---

## 🔧 Setup Steps

### Step 1: Configure Environment Variables

Add these to your backend `.env` file or Vercel environment variables:

```bash
# On-Premises Active Directory Configuration
AD_SERVER=dc01.yourdomain.com              # Domain Controller hostname/IP
AD_USERNAME=svc_portal                      # Service account username
AD_PASSWORD=SecurePassword123!              # Service account password
AD_DOMAIN=YOURDOMAIN                        # NetBIOS domain name
AD_DEFAULT_OU=OU=NewUsers,OU=Employees,DC=yourdomain,DC=com  # Default OU for new users
AD_DEFAULT_PASSWORD=TempPass123!            # Default temporary password
```

**Important Security Notes:**
- Store `AD_PASSWORD` securely using Vercel's encrypted environment variables
- Never commit credentials to source control
- Use a dedicated service account with minimal permissions
- Consider rotating passwords regularly

### Step 2: Test Connection

Use the test endpoint to verify configuration:

```bash
# Test from command line
curl -X POST https://your-backend-url.vercel.app/api/ad/test-connection \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully connected to on-premises Active Directory",
  "domain": "yourdomain.com",
  "domainController": "DC01.yourdomain.com"
}
```

### Step 3: Verify Azure AD Connect Sync

Ensure Azure AD Connect is actively syncing:

```powershell
# On Azure AD Connect server
Get-ADSyncScheduler

# Expected output should show:
# SyncCycleEnabled: True
# NextSyncCyclePolicyType: Delta
# NextSyncCycleStartTimeInUTC: (upcoming time)
```

**Force Sync (for testing):**
```powershell
Start-ADSyncSyncCycle -PolicyType Delta
```

### Step 4: Configure Organizational Unit (OU)

Ensure the OU specified in `AD_DEFAULT_OU` exists and is configured to sync:

```powershell
# Verify OU exists
Get-ADOrganizationalUnit -Filter "DistinguishedName -eq 'OU=NewUsers,OU=Employees,DC=yourdomain,DC=com'"

# Check if OU is syncing to Azure AD
Get-ADSyncConnectorRunProfile
```

---

## 🔒 Security Considerations

### Service Account Security

**Best Practices:**
1. **Least Privilege:** Only grant permissions to create/modify users in specific OUs
2. **Strong Password:** Use 20+ character randomly generated password
3. **Account Restrictions:**
   - Set "Account is sensitive and cannot be delegated"
   - Enable "Account expires" if appropriate
   - Restrict logon to specific computers (Domain Controllers only)
4. **Audit Logging:** Enable detailed auditing for this account's activities

```powershell
# Example: Restrict logon to Domain Controllers only
Set-ADUser svc_portal -LogonWorkstations "DC01,DC02"

# Enable account cannot be delegated
Set-ADAccountControl svc_portal -AccountNotDelegated $true
```

### Network Security

**Recommendations:**
1. **Use WinRM HTTPS (Port 5986)** instead of HTTP (5985)
2. **Firewall Rules:** Only allow backend server IP to access DC on WinRM ports
3. **VPN/Private Network:** Keep backend and DC on private network if possible
4. **Certificate-Based Authentication:** Consider using certificates instead of passwords

**Configure WinRM HTTPS:**
```powershell
# On Domain Controller
# 1. Create self-signed certificate (or use CA-issued cert)
New-SelfSignedCertificate -DnsName "dc01.yourdomain.com" -CertStoreLocation "cert:\LocalMachine\My"

# 2. Configure WinRM to use HTTPS
New-Item -Path WSMan:\LocalHost\Listener -Transport HTTPS -Address * -CertificateThumbPrint "YOUR_CERT_THUMBPRINT"

# 3. Add firewall rule
New-NetFirewallRule -DisplayName "WinRM HTTPS" -Direction Inbound -LocalPort 5986 -Protocol TCP -Action Allow
```

### Monitoring & Auditing

**Enable Detailed Logging:**
```powershell
# On Domain Controller - Enable user creation auditing
auditpol /set /category:"Account Management" /success:enable /failure:enable

# View audit logs
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4720} -MaxEvents 50
```

**What to Monitor:**
- Failed authentication attempts from service account
- User creation activities
- Unusual access patterns or times
- PowerShell remoting connections

---

## 🧪 Testing

### Test User Creation

1. **Via Portal UI:**
   - Navigate to Onboarding
   - Enter new user details
   - Check the "Create user in On-Premises Active Directory" option
   - Complete the wizard
   - Verify user appears in on-prem AD

2. **Via API (Development):**
```bash
curl -X POST https://your-backend-url/api/ad/create-user \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=YOUR_SESSION_COOKIE" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "displayName": "Test User",
    "email": "test.user@yourdomain.com",
    "userPrincipalName": "test.user@yourdomain.com",
    "samAccountName": "testuser",
    "password": "TempPass123!",
    "department": "IT",
    "jobTitle": "Test Engineer",
    "enabled": true,
    "changePasswordAtLogon": true
  }'
```

### Verify Sync to Azure AD

**After user creation in on-prem AD:**

1. **Check on-prem AD:**
   ```powershell
   Get-ADUser -Identity testuser -Properties *
   ```

2. **Force sync (for testing):**
   ```powershell
   # On Azure AD Connect server
   Start-ADSyncSyncCycle -PolicyType Delta
   ```

3. **Check Azure AD (after ~5-30 minutes):**
   ```powershell
   # Using Azure AD PowerShell
   Connect-AzureAD
   Get-AzureADUser -Filter "userPrincipalName eq 'test.user@yourdomain.com'"
   ```

4. **Verify sync status:**
   - User should have `onPremisesSyncEnabled = true` in Azure AD
   - User's `onPremisesDistinguishedName` should match on-prem AD DN
   - Password hash should be synced (user can sign in with on-prem password)

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **"Failed to connect to on-premises Active Directory"**

**Causes:**
- WinRM not enabled on Domain Controller
- Network/firewall blocking ports 5985/5986
- Service account credentials incorrect
- Domain Controller hostname not resolvable

**Solutions:**
```powershell
# Test WinRM from backend server
Test-WSMan -ComputerName dc01.yourdomain.com

# Test credentials
$cred = Get-Credential  # Enter service account creds
Invoke-Command -ComputerName dc01.yourdomain.com -Credential $cred -ScriptBlock { Get-ADDomain }

# Check firewall
Test-NetConnection -ComputerName dc01.yourdomain.com -Port 5985
```

#### 2. **"Access is denied" Error**

**Cause:** Service account lacks permissions

**Solution:**
```powershell
# Grant explicit permissions on OU
dsacls "OU=NewUsers,OU=Employees,DC=yourdomain,DC=com" /G "YOURDOMAIN\svc_portal:CCDC;user"

# Verify permissions
dsacls "OU=NewUsers,OU=Employees,DC=yourdomain,DC=com"
```

#### 3. **User Created but Not Syncing to Azure AD**

**Causes:**
- OU is filtered from sync scope
- Azure AD Connect sync disabled
- Sync cycle hasn't run yet

**Solutions:**
```powershell
# Check Azure AD Connect sync configuration
Get-ADSyncConnector
Get-ADSyncConnectorRunProfile

# Verify OU is in sync scope
# Open Synchronization Service Manager → Connectors → Properties → Configure Directory Partitions

# Force immediate sync
Start-ADSyncSyncCycle -PolicyType Delta

# Check sync errors
Get-ADSyncCSObject -DistinguishedName "CN=Test User,OU=NewUsers,OU=Employees,DC=yourdomain,DC=com"
```

#### 4. **PowerShell Script Execution Errors**

**Enable detailed logging:**

Edit `backend/routes/ad.js` and add:
```javascript
console.log('PowerShell Script:', script);
console.log('Execution Result:', result);
```

**Common PowerShell errors:**
- **"Import-Module ActiveDirectory failed"** → AD PowerShell module not installed on DC
- **"Password does not meet complexity requirements"** → Adjust `AD_DEFAULT_PASSWORD` to meet policy
- **"OU path not found"** → Verify `AD_DEFAULT_OU` is correct

---

## 📊 Monitoring & Health Checks

### Portal Health Dashboard

Check AD integration status:
```bash
curl https://your-backend-url/api/ad/config-status
```

**Response:**
```json
{
  "configured": true,
  "message": "On-premises AD integration is configured",
  "server": "dc01.yourdomain.com (configured)",
  "domain": "YOURDOMAIN",
  "defaultOU": "OU=NewUsers,OU=Employees,DC=yourdomain,DC=com",
  "capabilities": {
    "createUser": true,
    "remoteExecution": true
  }
}
```

### Azure AD Connect Health

```powershell
# Check last sync time
Get-ADSyncScheduler | Select-Object LastSyncTime

# View recent sync history
Get-ADSyncRunProfile -ConnectorName "yourdomain.com"

# Check for sync errors
Get-ADSyncCSObject | Where-Object {$_.ExportErrorCode -ne 0}
```

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] Service account created with minimal permissions
- [ ] Strong password stored securely in environment variables
- [ ] WinRM configured with HTTPS (port 5986)
- [ ] Firewall rules limit access to backend server only
- [ ] Azure AD Connect actively syncing (verify with test user)
- [ ] Target OU exists and is in sync scope
- [ ] Audit logging enabled for service account activities
- [ ] Test user creation end-to-end
- [ ] Verify sync time (document ~30 minute wait for teams)
- [ ] Document emergency rollback procedure
- [ ] Set up monitoring alerts for sync failures

---

## 📞 Support & Additional Resources

### Microsoft Documentation
- [Azure AD Connect](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-install-roadmap)
- [PowerShell Remoting](https://learn.microsoft.com/en-us/powershell/scripting/learn/remoting/running-remote-commands)
- [Active Directory PowerShell Module](https://learn.microsoft.com/en-us/powershell/module/activedirectory/)

### Troubleshooting Tips
- Always test in a non-production OU first
- Use Azure AD Connect staging mode for testing sync changes
- Keep service account credentials rotated regularly
- Monitor backend logs for PowerShell execution errors

---

## 🔄 Updating Configuration

### Changing Default OU

1. Update `AD_DEFAULT_OU` environment variable
2. Verify new OU is in Azure AD Connect sync scope
3. Redeploy backend service
4. Test user creation in new OU

### Rotating Service Account Password

1. Change password in Active Directory
2. Update `AD_PASSWORD` environment variable
3. Redeploy backend (Vercel will restart with new env vars)
4. Test connection using `/api/ad/test-connection`

---

## 📄 License & Support

This integration is part of the Employee Lifecycle Portal. For support, please contact your IT administrator or open an issue on the project repository.
