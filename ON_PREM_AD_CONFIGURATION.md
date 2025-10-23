# Example On-Premises AD Configuration

## Vercel Environment Variables

Add these to your Vercel project settings:

### Required Variables

```bash
# Domain Controller Configuration
AD_SERVER=dc01.contoso.com
# Can also use IP address: AD_SERVER=10.0.1.10

# Service Account Credentials
AD_USERNAME=svc_portal_onboarding
AD_PASSWORD=Str0ng!P@ssw0rd#2025

# Domain Information
AD_DOMAIN=CONTOSO
# This is the NetBIOS domain name, not the FQDN

# Default Organizational Unit
AD_DEFAULT_OU=OU=NewEmployees,OU=Users,DC=contoso,DC=com
# New users will be created here by default

# Default Temporary Password
AD_DEFAULT_PASSWORD=Welcome2024!
# Must meet your domain password policy
```

## How to Set in Vercel

### Via Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable with its value
3. Select "Production", "Preview", and "Development" scopes
4. Click "Save"
5. Redeploy to apply changes

### Via Vercel CLI:
```bash
vercel env add AD_SERVER
# Enter value when prompted: dc01.contoso.com

vercel env add AD_USERNAME
# Enter value: svc_portal_onboarding

vercel env add AD_PASSWORD
# Enter value: Str0ng!P@ssw0rd#2025

vercel env add AD_DOMAIN
# Enter value: CONTOSO

vercel env add AD_DEFAULT_OU
# Enter value: OU=NewEmployees,OU=Users,DC=contoso,DC=com

vercel env add AD_DEFAULT_PASSWORD
# Enter value: Welcome2024!
```

## Finding Your Values

### AD_SERVER
```powershell
# Get Domain Controllers
Get-ADDomainController -Filter *

# Output shows:
# Name: DC01
# HostName: dc01.contoso.com
# IPv4Address: 10.0.1.10
```

Use either hostname (`dc01.contoso.com`) or IP (`10.0.1.10`).

### AD_DOMAIN
```powershell
# Get NetBIOS domain name
Get-ADDomain | Select-Object NetBIOSName

# Output:
# NetBIOSName
# -----------
# CONTOSO
```

### AD_DEFAULT_OU
```powershell
# List all OUs
Get-ADOrganizationalUnit -Filter * | Select-Object DistinguishedName

# Example output:
# OU=NewEmployees,OU=Users,DC=contoso,DC=com
# OU=IT,OU=Departments,DC=contoso,DC=com
# OU=HR,OU=Departments,DC=contoso,DC=com
```

Choose the OU where you want new users created.

**Important**: Ensure this OU is in Azure AD Connect's sync scope!

## Testing Configuration

### 1. Test from PowerShell (On Any Domain-Joined Machine)

```powershell
# Test WinRM connectivity
Test-WSMan -ComputerName dc01.contoso.com

# Test service account credentials
$cred = Get-Credential # Enter svc_portal_onboarding creds
Invoke-Command -ComputerName dc01.contoso.com -Credential $cred -ScriptBlock {
    Import-Module ActiveDirectory
    Get-ADDomain | Select-Object DNSRoot, NetBIOSName
}
```

### 2. Test from Portal

Once environment variables are set:

```bash
# Check configuration status
curl https://your-backend.vercel.app/api/ad/config-status

# Test connection
curl -X POST https://your-backend.vercel.app/api/ad/test-connection
```

## Common Configuration Issues

### Issue: "Cannot resolve hostname"
**Problem**: AD_SERVER hostname not resolvable  
**Solution**: Use IP address instead, or ensure DNS is configured

### Issue: "Access is denied"
**Problem**: Service account lacks permissions  
**Solution**: Verify account has "Create users" permission on target OU

### Issue: "WinRM cannot process the request"
**Problem**: PowerShell remoting not enabled  
**Solution**: Run `Enable-PSRemoting -Force` on DC

### Issue: "Password does not meet complexity requirements"
**Problem**: AD_DEFAULT_PASSWORD doesn't meet domain policy  
**Solution**: Update to meet requirements (typically: 8+ chars, upper, lower, number, special)

## Security Best Practices

### Service Account Configuration

```powershell
# After creating service account, configure security:

# 1. Set password to never expire (for service account)
Set-ADUser svc_portal_onboarding -PasswordNeverExpires $true

# 2. Prevent interactive login
Set-ADUser svc_portal_onboarding -SmartcardLogonRequired $true

# 3. Restrict logon to specific computers (DCs only)
Set-ADUser svc_portal_onboarding -LogonWorkstations "DC01,DC02"

# 4. Enable account auditing
Set-ADUser svc_portal_onboarding -AccountNotDelegated $true

# 5. Add description for documentation
Set-ADUser svc_portal_onboarding -Description "Service account for Employee Portal - User creation only"
```

### Delegated Permissions (Least Privilege)

```powershell
# Grant only necessary permissions on specific OU
# Run this in Active Directory Users and Computers:
# 1. Right-click target OU (e.g., "NewEmployees")
# 2. Properties → Security → Advanced
# 3. Add → Select svc_portal_onboarding
# 4. Applies to: "This object and all descendant objects"
# 5. Select:
#    - Create User objects
#    - Write all properties (for user objects only)

# Or use dsacls command:
dsacls "OU=NewEmployees,OU=Users,DC=contoso,DC=com" /G "CONTOSO\svc_portal_onboarding:CCDC;user"
```

## Verifying Permissions

Test service account can create users:

```powershell
# Use service account credentials
$cred = Get-Credential -UserName "CONTOSO\svc_portal_onboarding"

# Try to create a test user
Invoke-Command -ComputerName dc01.contoso.com -Credential $cred -ScriptBlock {
    Import-Module ActiveDirectory
    
    $testUser = @{
        GivenName = "Test"
        Surname = "User"
        Name = "Test User"
        SamAccountName = "testuser"
        UserPrincipalName = "testuser@contoso.com"
        Path = "OU=NewEmployees,OU=Users,DC=contoso,DC=com"
        AccountPassword = (ConvertTo-SecureString "Test123!" -AsPlainText -Force)
        Enabled = $false  # Keep disabled for testing
    }
    
    New-ADUser @testUser -PassThru
}

# If successful, remove test user:
Invoke-Command -ComputerName dc01.contoso.com -Credential $cred -ScriptBlock {
    Remove-ADUser -Identity "testuser" -Confirm:$false
}
```

## Production Readiness Checklist

Before enabling in production:

- [ ] Service account created with strong password
- [ ] Delegated permissions granted on target OU only
- [ ] Target OU confirmed in Azure AD Connect sync scope
- [ ] WinRM enabled and tested on Domain Controller
- [ ] Firewall allows WinRM traffic from backend
- [ ] Environment variables set in Vercel production
- [ ] Backend redeployed with new variables
- [ ] Connection test endpoint returns success
- [ ] Test user created successfully in non-production OU
- [ ] Test user verified to sync to Azure AD
- [ ] Audit logging enabled for service account
- [ ] Password rotation schedule established
- [ ] Documentation shared with team

## Monitoring & Maintenance

### Regular Tasks

**Weekly:**
- Review audit logs for service account activity
- Check Azure AD Connect sync health

**Monthly:**
- Verify service account password hasn't expired
- Review permissions (ensure least privilege maintained)

**Quarterly:**
- Rotate service account password
- Review OU sync scope in Azure AD Connect
- Update documentation if configuration changed

### Alerts to Configure

- Azure AD Connect sync failures
- Repeated authentication failures for service account
- Unusual creation patterns (many users in short time)
- PowerShell remoting errors

---

**Need Help?** See [ON_PREM_AD_SETUP.md](./ON_PREM_AD_SETUP.md) for detailed troubleshooting.
