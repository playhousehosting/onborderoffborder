# Quick Start: On-Premises AD User Creation

## 🎯 For IT Administrators

### Setup (One-Time)

1. **Enable PowerShell Remoting on Domain Controller:**
   ```powershell
   Enable-PSRemoting -Force
   ```

2. **Create Service Account:**
   ```powershell
   New-ADUser -Name "svc_portal" `
     -UserPrincipalName "svc_portal@yourdomain.com" `
     -AccountPassword (Read-Host -AsSecureString "Enter Password") `
     -Enabled $true `
     -PasswordNeverExpires $true
   ```

3. **Delegate Permissions:**
   - Open "Active Directory Users and Computers"
   - Right-click target OU → Delegate Control
   - Add `svc_portal` account
   - Grant "Create, delete, and manage user accounts"

4. **Configure Backend Environment Variables:**
   ```bash
   AD_SERVER=dc01.yourdomain.com
   AD_USERNAME=svc_portal
   AD_PASSWORD=SecurePassword123!
   AD_DOMAIN=YOURDOMAIN
   AD_DEFAULT_OU=OU=NewUsers,OU=Employees,DC=yourdomain,DC=com
   ```

5. **Test Connection:**
   - Navigate to backend URL: `/api/ad/config-status`
   - Should show `"configured": true`

---

## 👥 For Portal Users

### Creating a New Employee (On-Premises AD)

1. **Navigate to Onboarding**
   - Click "Onboarding" in the sidebar

2. **Enter User Information**
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@company.com`
   
3. **Enable On-Prem Creation**
   - ✅ Check "Create user in On-Premises Active Directory"

4. **Enter Job Details**
   - Department: `Engineering`
   - Job Title: `Software Engineer`
   - Office Location: `Building 1`

5. **Set Password**
   - Generate temporary password
   - ✅ Require password change at next login

6. **Execute Onboarding**
   - Review information
   - Click "Execute Onboarding"

7. **Wait for Sync** ⏱️
   - User created in on-prem AD immediately
   - **Syncs to Azure AD within 30 minutes**
   - After sync, configure licenses and groups in Azure AD

---

## ⚡ Quick Reference

### What Gets Created Immediately
- ✅ User account in on-premises Active Directory
- ✅ Basic attributes (name, email, department, title)
- ✅ Password set and enabled

### What Requires Sync to Complete
- ⏱️ Azure AD user object (30 min wait)
- ⏱️ Microsoft 365 license assignment
- ⏱️ Group memberships
- ⏱️ Email/mailbox access

### Force Sync (For Testing)
```powershell
# Run on Azure AD Connect server
Start-ADSyncSyncCycle -PolicyType Delta
```

### Check if User Synced
```powershell
# On-premises AD
Get-ADUser -Identity john.doe

# Azure AD (PowerShell)
Connect-AzureAD
Get-AzureADUser -Filter "userPrincipalName eq 'john.doe@company.com'"
```

Look for `onPremisesSyncEnabled = True` in Azure AD.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "AD integration not configured" | Check backend environment variables |
| "Access denied" | Verify service account permissions on OU |
| "User not syncing" | Check OU is in Azure AD Connect sync scope |
| "Connection failed" | Test WinRM: `Test-WSMan dc01.company.com` |

---

## 📚 Full Documentation

See [ON_PREM_AD_SETUP.md](./ON_PREM_AD_SETUP.md) for complete setup, security, and troubleshooting guide.
