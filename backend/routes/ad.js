/**
 * On-Premises Active Directory Management Routes
 * 
 * This module provides endpoints for managing users in on-premises Active Directory.
 * Users created here will automatically sync to Azure AD via Azure AD Connect.
 * 
 * Requirements:
 * - PowerShell remoting enabled on AD server
 * - Service account with AD user creation permissions
 * - Network connectivity from backend to AD server
 */

const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const router = express.Router();

// Environment variables for AD configuration
const AD_SERVER = process.env.AD_SERVER;
const AD_USERNAME = process.env.AD_USERNAME;
const AD_PASSWORD = process.env.AD_PASSWORD;
const AD_DOMAIN = process.env.AD_DOMAIN;
const AD_DEFAULT_OU = process.env.AD_DEFAULT_OU || 'OU=Users,DC=domain,DC=com';
const AD_DEFAULT_PASSWORD = process.env.AD_DEFAULT_PASSWORD || 'TempPass123!';

/**
 * Validate AD configuration
 */
function validateADConfig() {
  const missing = [];
  if (!AD_SERVER) missing.push('AD_SERVER');
  if (!AD_USERNAME) missing.push('AD_USERNAME');
  if (!AD_PASSWORD) missing.push('AD_PASSWORD');
  if (!AD_DOMAIN) missing.push('AD_DOMAIN');

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required AD configuration: ${missing.join(', ')}`,
      missing
    };
  }

  return { valid: true };
}

/**
 * Escape PowerShell special characters
 */
function escapePowerShellString(str) {
  if (!str) return '';
  return str.replace(/[\$`'"]/g, '`$&');
}

/**
 * Build PowerShell script for creating AD user
 */
function buildCreateUserScript(userData) {
  const {
    firstName,
    lastName,
    displayName,
    email,
    userPrincipalName,
    samAccountName,
    password,
    organizationalUnit,
    department,
    jobTitle,
    officeLocation,
    phoneNumber,
    mobilePhone,
    manager,
    description,
    enabled = true,
    changePasswordAtLogon = true,
    passwordNeverExpires = false
  } = userData;

  // Escape all string inputs
  const safeFirstName = escapePowerShellString(firstName);
  const safeLastName = escapePowerShellString(lastName);
  const safeDisplayName = escapePowerShellString(displayName || `${firstName} ${lastName}`);
  const safeEmail = escapePowerShellString(email);
  const safeUPN = escapePowerShellString(userPrincipalName);
  const safeSamAccountName = escapePowerShellString(samAccountName || email.split('@')[0]);
  const safePassword = escapePowerShellString(password || AD_DEFAULT_PASSWORD);
  const safeOU = escapePowerShellString(organizationalUnit || AD_DEFAULT_OU);
  const safeDepartment = escapePowerShellString(department || '');
  const safeJobTitle = escapePowerShellString(jobTitle || '');
  const safeOffice = escapePowerShellString(officeLocation || '');
  const safePhone = escapePowerShellString(phoneNumber || '');
  const safeMobile = escapePowerShellString(mobilePhone || '');
  const safeDescription = escapePowerShellString(description || '');

  // Build PowerShell script
  let script = `
$ErrorActionPreference = "Stop"

# Import Active Directory module
Import-Module ActiveDirectory

try {
  # Create password object
  $SecurePassword = ConvertTo-SecureString "${safePassword}" -AsPlainText -Force
  
  # Build parameters for New-ADUser
  $userParams = @{
    GivenName = "${safeFirstName}"
    Surname = "${safeLastName}"
    DisplayName = "${safeDisplayName}"
    Name = "${safeDisplayName}"
    SamAccountName = "${safeSamAccountName}"
    UserPrincipalName = "${safeUPN}"
    EmailAddress = "${safeEmail}"
    AccountPassword = $SecurePassword
    Enabled = $${enabled}
    ChangePasswordAtLogon = $${changePasswordAtLogon}
    PasswordNeverExpires = $${passwordNeverExpires}
    Path = "${safeOU}"
  }
  
  # Add optional parameters
  ${safeDepartment ? `$userParams.Department = "${safeDepartment}"` : ''}
  ${safeJobTitle ? `$userParams.Title = "${safeJobTitle}"` : ''}
  ${safeOffice ? `$userParams.Office = "${safeOffice}"` : ''}
  ${safePhone ? `$userParams.OfficePhone = "${safePhone}"` : ''}
  ${safeMobile ? `$userParams.MobilePhone = "${safeMobile}"` : ''}
  ${safeDescription ? `$userParams.Description = "${safeDescription}"` : ''}
  
  # Create the user
  $newUser = New-ADUser @userParams -PassThru
  
  # Set manager if provided
  ${manager ? `Set-ADUser -Identity $newUser.SamAccountName -Manager "${escapePowerShellString(manager)}"` : ''}
  
  # Return user information
  $userInfo = Get-ADUser -Identity $newUser.SamAccountName -Properties *
  
  # Output result as JSON
  @{
    success = $true
    message = "User created successfully in on-premises Active Directory"
    user = @{
      distinguishedName = $userInfo.DistinguishedName
      samAccountName = $userInfo.SamAccountName
      userPrincipalName = $userInfo.UserPrincipalName
      displayName = $userInfo.DisplayName
      email = $userInfo.EmailAddress
      enabled = $userInfo.Enabled
      created = $userInfo.whenCreated
      department = $userInfo.Department
      title = $userInfo.Title
    }
  } | ConvertTo-Json
  
} catch {
  @{
    success = $false
    error = $_.Exception.Message
  } | ConvertTo-Json
  exit 1
}
`;

  return script;
}

/**
 * Execute PowerShell script on remote AD server
 */
async function executeRemotePowerShell(script) {
  // Build PowerShell remoting command
  const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
  
  const command = `powershell.exe -NonInteractive -NoProfile -Command "` +
    `$cred = New-Object System.Management.Automation.PSCredential('${AD_DOMAIN}\\${AD_USERNAME}', ` +
    `(ConvertTo-SecureString '${AD_PASSWORD}' -AsPlainText -Force)); ` +
    `Invoke-Command -ComputerName '${AD_SERVER}' -Credential $cred -ScriptBlock { ` +
    `[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${encodedScript}')) | ` +
    `Invoke-Expression ` +
    `}"`;

  try {
    const { stdout, stderr } = await execPromise(command, {
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    if (stderr) {
      console.error('PowerShell stderr:', stderr);
    }

    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    console.error('PowerShell execution error:', error);
    return {
      success: false,
      error: error.message,
      output: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * POST /api/ad/create-user
 * Create a new user in on-premises Active Directory
 */
router.post('/create-user', async (req, res) => {
  console.log('🔷 Create on-premises AD user request');

  // Validate AD configuration
  const configValidation = validateADConfig();
  if (!configValidation.valid) {
    console.error('❌ AD configuration invalid:', configValidation.message);
    return res.status(503).json({
      error: 'On-premises AD integration not configured',
      message: configValidation.message,
      details: 'Please configure AD_SERVER, AD_USERNAME, AD_PASSWORD, and AD_DOMAIN environment variables'
    });
  }

  try {
    const userData = req.body;

    // Validate required fields
    const required = ['firstName', 'lastName', 'email', 'userPrincipalName'];
    const missing = required.filter(field => !userData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missing,
        message: `Please provide: ${missing.join(', ')}`
      });
    }

    console.log('📝 Creating user:', userData.userPrincipalName);

    // Build PowerShell script
    const script = buildCreateUserScript(userData);
    
    // Execute on remote AD server
    console.log('⚡ Executing PowerShell on AD server:', AD_SERVER);
    const result = await executeRemotePowerShell(script);

    if (!result.success) {
      throw new Error(result.error || 'PowerShell execution failed');
    }

    // Parse JSON output from PowerShell
    let parsedResult;
    try {
      parsedResult = JSON.parse(result.output);
    } catch (parseError) {
      console.error('Failed to parse PowerShell output:', result.output);
      throw new Error('Invalid response from AD server');
    }

    if (!parsedResult.success) {
      throw new Error(parsedResult.error || 'User creation failed');
    }

    console.log('✅ User created successfully:', parsedResult.user.samAccountName);

    res.json({
      success: true,
      message: 'User created in on-premises Active Directory. Will sync to Azure AD within 30 minutes.',
      user: parsedResult.user,
      syncInfo: {
        method: 'Azure AD Connect',
        estimatedSyncTime: '30 minutes',
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Error creating AD user:', error);
    res.status(500).json({
      error: 'Failed to create user in on-premises Active Directory',
      message: error.message,
      details: 'Check server logs for more information'
    });
  }
});

/**
 * GET /api/ad/config-status
 * Check if on-premises AD integration is configured
 */
router.get('/config-status', (req, res) => {
  const configValidation = validateADConfig();
  
  res.json({
    configured: configValidation.valid,
    message: configValidation.message || 'On-premises AD integration is configured',
    server: AD_SERVER ? `${AD_SERVER} (configured)` : 'Not configured',
    domain: AD_DOMAIN || 'Not configured',
    defaultOU: AD_DEFAULT_OU,
    capabilities: {
      createUser: configValidation.valid,
      remoteExecution: configValidation.valid
    }
  });
});

/**
 * POST /api/ad/test-connection
 * Test connection to on-premises AD server
 */
router.post('/test-connection', async (req, res) => {
  console.log('🔍 Testing on-premises AD connection');

  const configValidation = validateADConfig();
  if (!configValidation.valid) {
    return res.status(503).json({
      success: false,
      message: configValidation.message
    });
  }

  try {
    // Simple test script to verify connectivity
    const testScript = `
      Import-Module ActiveDirectory
      $domain = Get-ADDomain
      @{
        success = $true
        domain = $domain.DNSRoot
        domainController = $domain.PDCEmulator
      } | ConvertTo-Json
    `;

    const result = await executeRemotePowerShell(testScript);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const parsed = JSON.parse(result.output);
    
    console.log('✅ AD connection successful');
    res.json({
      success: true,
      message: 'Successfully connected to on-premises Active Directory',
      ...parsed
    });

  } catch (error) {
    console.error('❌ AD connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to on-premises Active Directory',
      error: error.message
    });
  }
});

/**
 * GET /api/ad/check-user/:samAccountName
 * Check if user exists in on-premises AD
 */
router.get('/check-user/:samAccountName', async (req, res) => {
  const { samAccountName } = req.params;
  
  const configValidation = validateADConfig();
  if (!configValidation.valid) {
    return res.status(503).json({
      error: 'AD integration not configured'
    });
  }

  try {
    const checkScript = `
      Import-Module ActiveDirectory
      try {
        $user = Get-ADUser -Identity "${escapePowerShellString(samAccountName)}" -Properties *
        @{
          exists = $true
          user = @{
            samAccountName = $user.SamAccountName
            userPrincipalName = $user.UserPrincipalName
            displayName = $user.DisplayName
            enabled = $user.Enabled
          }
        } | ConvertTo-Json
      } catch {
        @{ exists = $false } | ConvertTo-Json
      }
    `;

    const result = await executeRemotePowerShell(checkScript);
    const parsed = JSON.parse(result.output);
    
    res.json(parsed);

  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({
      error: 'Failed to check user existence',
      message: error.message
    });
  }
});

module.exports = router;
