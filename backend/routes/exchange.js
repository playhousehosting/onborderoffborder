const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { requireAuth } = require('../middleware/tenantContext');

/**
 * Hybrid Exchange Management Routes
 * 
 * This module provides endpoints for managing mailboxes in hybrid Exchange environments
 * where Exchange Server is on-premises but synchronized with Exchange Online.
 * 
 * Prerequisites:
 * - Exchange Management Shell installed on-premises
 * - PowerShell remoting enabled to Exchange Server
 * - Service account with Exchange management permissions
 * - Azure AD Connect actively syncing
 */

// Validate Exchange configuration
const validateExchangeConfig = () => {
  const requiredVars = [
    'EXCHANGE_SERVER',      // Exchange Server hostname/FQDN
    'EXCHANGE_USERNAME',    // Service account with Exchange admin rights
    'EXCHANGE_PASSWORD',    // Service account password
    'EXCHANGE_DOMAIN'       // Domain for authentication
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    return {
      configured: false,
      missing: missing,
      message: `Missing required environment variables: ${missing.join(', ')}`
    };
  }

  return { configured: true };
};

// Escape PowerShell strings to prevent injection
const escapePowerShellString = (str) => {
  if (!str) return '';
  // Escape single quotes and potentially dangerous characters
  return str.replace(/'/g, "''").replace(/`/g, '``').replace(/\$/g, '`$');
};

// Execute remote PowerShell command on Exchange Server
const executeRemoteExchangeCommand = async (command) => {
  const server = process.env.EXCHANGE_SERVER;
  const username = process.env.EXCHANGE_USERNAME;
  const password = process.env.EXCHANGE_PASSWORD;
  const domain = process.env.EXCHANGE_DOMAIN;

  // Build PowerShell remoting script
  const script = `
    $SecurePassword = ConvertTo-SecureString '${escapePowerShellString(password)}' -AsPlainText -Force
    $Credential = New-Object System.Management.Automation.PSCredential('${domain}\\${username}', $SecurePassword)
    
    $Session = New-PSSession -ComputerName '${server}' -Credential $Credential -ConfigurationName Microsoft.Exchange
    
    try {
      $Result = Invoke-Command -Session $Session -ScriptBlock {
        ${command}
      }
      $Session | Remove-PSSession
      $Result | ConvertTo-Json -Depth 10
    } catch {
      $Session | Remove-PSSession
      throw $_.Exception.Message
    }
  `;

  // Encode script to Base64 to avoid escaping issues
  const encodedScript = Buffer.from(script, 'utf16le').toString('base64');

  try {
    const { stdout, stderr } = await execPromise(
      `powershell.exe -NoProfile -EncodedCommand ${encodedScript}`,
      { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr) {
      console.error('PowerShell stderr:', stderr);
    }

    // Parse JSON output
    if (stdout.trim()) {
      try {
        return JSON.parse(stdout);
      } catch (e) {
        return { rawOutput: stdout.trim() };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Remote Exchange command failed:', error);
    throw new Error(`Exchange operation failed: ${error.message}`);
  }
};

/**
 * GET /api/exchange/config-status
 * Check if Exchange hybrid configuration is available
 */
router.get('/config-status', (req, res) => {
  const status = validateExchangeConfig();
  res.json(status);
});

/**
 * POST /api/exchange/test-connection
 * Test connectivity to on-premises Exchange Server
 */
router.post('/test-connection', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    // Test basic Exchange connection
    const command = `
      Get-ExchangeServer -Identity $env:COMPUTERNAME | Select-Object Name, ServerRole, Edition, AdminDisplayVersion
    `;

    const result = await executeRemoteExchangeCommand(command);
    
    res.json({
      success: true,
      message: 'Successfully connected to Exchange Server',
      serverInfo: result
    });
  } catch (error) {
    console.error('Exchange connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/exchange/mailbox/:identity
 * Get mailbox details (works for both on-prem and remote mailboxes)
 */
router.get('/mailbox/:identity', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const identity = escapePowerShellString(req.params.identity);

    const command = `
      $Mailbox = Get-Mailbox -Identity '${identity}' -ErrorAction SilentlyContinue
      $RemoteMailbox = Get-RemoteMailbox -Identity '${identity}' -ErrorAction SilentlyContinue
      
      if ($Mailbox) {
        @{
          Type = 'OnPremises'
          Identity = $Mailbox.Identity
          DisplayName = $Mailbox.DisplayName
          PrimarySmtpAddress = $Mailbox.PrimarySmtpAddress
          Database = $Mailbox.Database
          RecipientTypeDetails = $Mailbox.RecipientTypeDetails
        }
      } elseif ($RemoteMailbox) {
        @{
          Type = 'Remote'
          Identity = $RemoteMailbox.Identity
          DisplayName = $RemoteMailbox.DisplayName
          PrimarySmtpAddress = $RemoteMailbox.PrimarySmtpAddress
          RemoteRoutingAddress = $RemoteMailbox.RemoteRoutingAddress
          RecipientTypeDetails = $RemoteMailbox.RecipientTypeDetails
        }
      } else {
        @{
          Error = 'Mailbox not found'
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Get mailbox failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exchange/create-remote-mailbox
 * Create a remote mailbox (Exchange Online mailbox for on-prem user)
 */
router.post('/create-remote-mailbox', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const { userPrincipalName, alias } = req.body;

    if (!userPrincipalName) {
      return res.status(400).json({ error: 'userPrincipalName is required' });
    }

    const escapedUPN = escapePowerShellString(userPrincipalName);
    const escapedAlias = escapePowerShellString(alias || userPrincipalName.split('@')[0]);

    const command = `
      try {
        $RemoteMailbox = Enable-RemoteMailbox -Identity '${escapedUPN}' -RemoteRoutingAddress '${escapedAlias}@${escapePowerShellString(process.env.EXCHANGE_REMOTE_DOMAIN || 'mail.onmicrosoft.com')}' -ErrorAction Stop
        
        @{
          Success = $true
          Message = 'Remote mailbox created successfully'
          Identity = $RemoteMailbox.Identity
          PrimarySmtpAddress = $RemoteMailbox.PrimarySmtpAddress
          RemoteRoutingAddress = $RemoteMailbox.RemoteRoutingAddress
        }
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    
    if (result.Success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Create remote mailbox failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exchange/convert-to-shared
 * Convert on-premises mailbox to shared mailbox
 */
router.post('/convert-to-shared', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const { identity } = req.body;

    if (!identity) {
      return res.status(400).json({ error: 'identity is required' });
    }

    const escapedIdentity = escapePowerShellString(identity);

    const command = `
      try {
        # Check if it's an on-prem or remote mailbox
        $Mailbox = Get-Mailbox -Identity '${escapedIdentity}' -ErrorAction SilentlyContinue
        $RemoteMailbox = Get-RemoteMailbox -Identity '${escapedIdentity}' -ErrorAction SilentlyContinue
        
        if ($Mailbox) {
          # On-premises mailbox
          Set-Mailbox -Identity '${escapedIdentity}' -Type Shared -ErrorAction Stop
          $Result = @{
            Success = $true
            Message = 'On-premises mailbox converted to shared'
            Type = 'OnPremises'
          }
        } elseif ($RemoteMailbox) {
          # Remote mailbox - need to convert in Exchange Online
          $Result = @{
            Success = $false
            Message = 'This is a remote mailbox. Use Graph API to convert in Exchange Online.'
            Type = 'Remote'
            UseGraphAPI = $true
          }
        } else {
          $Result = @{
            Success = $false
            Error = 'Mailbox not found'
          }
        }
        
        $Result
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Convert to shared mailbox failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exchange/set-forwarding
 * Set email forwarding for on-premises mailbox
 */
router.post('/set-forwarding', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const { identity, forwardingAddress, deliverToMailboxAndForward } = req.body;

    if (!identity || !forwardingAddress) {
      return res.status(400).json({ error: 'identity and forwardingAddress are required' });
    }

    const escapedIdentity = escapePowerShellString(identity);
    const escapedForwarding = escapePowerShellString(forwardingAddress);
    const deliver = deliverToMailboxAndForward ? '$true' : '$false';

    const command = `
      try {
        Set-Mailbox -Identity '${escapedIdentity}' -ForwardingAddress '${escapedForwarding}' -DeliverToMailboxAndForward ${deliver} -ErrorAction Stop
        
        @{
          Success = $true
          Message = 'Email forwarding configured successfully'
          ForwardingAddress = '${escapedForwarding}'
          DeliverToMailbox = ${deliver}
        }
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Set forwarding failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exchange/set-auto-reply
 * Set automatic reply (out of office) for on-premises mailbox
 */
router.post('/set-auto-reply', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const { identity, enabled, internalMessage, externalMessage, externalAudience } = req.body;

    if (!identity) {
      return res.status(400).json({ error: 'identity is required' });
    }

    const escapedIdentity = escapePowerShellString(identity);
    const escapedInternal = escapePowerShellString(internalMessage || '');
    const escapedExternal = escapePowerShellString(externalMessage || '');
    const audience = externalAudience || 'All';
    const autoReplyState = enabled ? 'Enabled' : 'Disabled';

    const command = `
      try {
        Set-MailboxAutoReplyConfiguration -Identity '${escapedIdentity}' ` +
          `-AutoReplyState '${autoReplyState}' ` +
          `-InternalMessage '${escapedInternal}' ` +
          `-ExternalMessage '${escapedExternal}' ` +
          `-ExternalAudience '${audience}' -ErrorAction Stop
        
        @{
          Success = $true
          Message = 'Auto-reply configured successfully'
          AutoReplyState = '${autoReplyState}'
        }
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Set auto-reply failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/exchange/move-to-cloud
 * Initiate mailbox move from on-premises to Exchange Online
 */
router.post('/move-to-cloud', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const { identity, targetDeliveryDomain, badItemLimit } = req.body;

    if (!identity) {
      return res.status(400).json({ error: 'identity is required' });
    }

    const escapedIdentity = escapePowerShellString(identity);
    const escapedDomain = escapePowerShellString(targetDeliveryDomain || `${process.env.EXCHANGE_REMOTE_DOMAIN || 'tenant.mail.onmicrosoft.com'}`);
    const badItems = badItemLimit || 10;

    const command = `
      try {
        $MoveRequest = New-MoveRequest -Identity '${escapedIdentity}' ` +
          `-Remote -RemoteHostName 'outlook.office365.com' ` +
          `-TargetDeliveryDomain '${escapedDomain}' ` +
          `-BadItemLimit ${badItems} -ErrorAction Stop
        
        @{
          Success = $true
          Message = 'Mailbox move request created successfully'
          Identity = $MoveRequest.Identity
          Status = $MoveRequest.Status
          TargetDatabase = $MoveRequest.TargetDatabase
        }
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Move to cloud failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exchange/move-request/:identity
 * Check status of mailbox move request
 */
router.get('/move-request/:identity', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const escapedIdentity = escapePowerShellString(req.params.identity);

    const command = `
      try {
        $MoveRequest = Get-MoveRequest -Identity '${escapedIdentity}' -ErrorAction Stop
        $Stats = Get-MoveRequestStatistics -Identity '${escapedIdentity}' -ErrorAction SilentlyContinue
        
        @{
          Success = $true
          Status = $MoveRequest.Status
          PercentComplete = $Stats.PercentComplete
          BytesTransferred = $Stats.BytesTransferred
          ItemsTransferred = $Stats.ItemsTransferred
          Message = $Stats.Message
        }
      } catch {
        @{
          Success = $false
          Error = $_.Exception.Message
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Get move request failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exchange/mailbox-type/:identity
 * Determine if mailbox is on-premises, remote (cloud), or doesn't exist
 */
router.get('/mailbox-type/:identity', requireAuth, async (req, res) => {
  try {
    const configStatus = validateExchangeConfig();
    if (!configStatus.configured) {
      return res.status(400).json(configStatus);
    }

    const escapedIdentity = escapePowerShellString(req.params.identity);

    const command = `
      $Mailbox = Get-Mailbox -Identity '${escapedIdentity}' -ErrorAction SilentlyContinue
      $RemoteMailbox = Get-RemoteMailbox -Identity '${escapedIdentity}' -ErrorAction SilentlyContinue
      
      if ($Mailbox) {
        @{
          Type = 'OnPremises'
          RecipientTypeDetails = $Mailbox.RecipientTypeDetails
          Database = $Mailbox.Database
          ManageInExchange = $true
          ManageInGraphAPI = $false
        }
      } elseif ($RemoteMailbox) {
        @{
          Type = 'Remote'
          RecipientTypeDetails = $RemoteMailbox.RecipientTypeDetails
          RemoteRoutingAddress = $RemoteMailbox.RemoteRoutingAddress
          ManageInExchange = $false
          ManageInGraphAPI = $true
        }
      } else {
        @{
          Type = 'NotFound'
          ManageInExchange = $false
          ManageInGraphAPI = $false
        }
      }
    `;

    const result = await executeRemoteExchangeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Get mailbox type failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
