# Add Required Microsoft Graph Permissions to Azure AD App
# Requires: Global Administrator or Application Administrator role
# Run this script in PowerShell with admin privileges

# Prerequisites check
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check if Microsoft.Graph module is installed
if (-not (Get-Module -ListAvailable -Name Microsoft.Graph)) {
    Write-Host "❌ Microsoft.Graph module not found" -ForegroundColor Red
    Write-Host "Installing Microsoft.Graph module..." -ForegroundColor Yellow
    Install-Module Microsoft.Graph -Scope CurrentUser -Force
}

# Connect to Microsoft Graph
Write-Host "`n🔐 Connecting to Microsoft Graph..." -ForegroundColor Cyan
Write-Host "You will be prompted to sign in with your Global Admin account" -ForegroundColor Yellow
Connect-MgGraph -Scopes "Application.ReadWrite.All", "AppRoleAssignment.ReadWrite.All", "Directory.ReadWrite.All"

# App details
$appId = "6932bd51-b6f6-4bb8-a847-dd4ead22dd95"
$appDisplayName = "Employee Lifecycle Portal"

Write-Host "`n📋 Application: $appDisplayName" -ForegroundColor Green
Write-Host "Client ID: $appId" -ForegroundColor Gray

# Get the app registration
try {
    $app = Get-MgApplication -Filter "appId eq '$appId'"
    if (-not $app) {
        Write-Host "`n❌ App not found with Client ID: $appId" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Found app registration" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Error finding app: $_" -ForegroundColor Red
    exit 1
}

# Microsoft Graph Service Principal ID
$graphResourceId = "00000003-0000-0000-c000-000000000000"

# Get Microsoft Graph Service Principal
$graphSP = Get-MgServicePrincipal -Filter "appId eq '$graphResourceId'"

# Define required permissions
$requiredPermissions = @(
    @{
        Name = "AuditLog.Read.All"
        Id = "b0afded3-3588-46d8-8b3d-9842eff778da"
        Description = "Read all audit log data"
    },
    @{
        Name = "LifecycleWorkflows.ReadWrite.All"
        Id = "84b9d731-7e0c-4c5c-a0d4-0c9c7e8f7c3e"
        Description = "Read and write all lifecycle workflows"
    },
    @{
        Name = "InformationProtectionPolicy.Read.All"
        Id = "19da66cb-0fb0-4390-b071-ebc76a349482"
        Description = "Read all information protection policies"
    },
    @{
        Name = "SecurityAlert.Read.All"
        Id = "bc257fb8-46b4-4b15-8713-01e91bfbe4ea"
        Description = "Read all security alerts"
    },
    @{
        Name = "SecurityAlert.ReadWrite.All"
        Id = "471f2a7f-2a42-4d45-a2bf-594d0838070d"
        Description = "Read and write all security alerts"
    },
    @{
        Name = "SecurityIncident.Read.All"
        Id = "45cc0394-e837-488b-a098-1918f48d186c"
        Description = "Read all security incidents"
    },
    @{
        Name = "SecurityIncident.ReadWrite.All"
        Id = "128ca929-1a19-45e6-a3b8-435ec44a36ba"
        Description = "Read and write all security incidents"
    }
)

Write-Host "`n📝 Permissions to add:" -ForegroundColor Cyan
foreach ($perm in $requiredPermissions) {
    Write-Host "  • $($perm.Name) - $($perm.Description)" -ForegroundColor Gray
}

# Get current permissions
$currentPermissions = $app.RequiredResourceAccess | Where-Object { $_.ResourceAppId -eq $graphResourceId }

if (-not $currentPermissions) {
    $currentPermissions = @{
        ResourceAppId = $graphResourceId
        ResourceAccess = @()
    }
    $app.RequiredResourceAccess += $currentPermissions
}

# Add each permission
Write-Host "`n🔧 Adding permissions..." -ForegroundColor Cyan
$addedCount = 0
$skippedCount = 0

foreach ($perm in $requiredPermissions) {
    # Check if permission already exists
    $exists = $currentPermissions.ResourceAccess | Where-Object { $_.Id -eq $perm.Id }
    
    if ($exists) {
        Write-Host "  ⏭️  $($perm.Name) - Already exists" -ForegroundColor Yellow
        $skippedCount++
    }
    else {
        try {
            # Add the permission
            $resourceAccess = @{
                Id = $perm.Id
                Type = "Role" # Application permission
            }
            
            $currentPermissions.ResourceAccess += $resourceAccess
            Write-Host "  ✅ $($perm.Name) - Added" -ForegroundColor Green
            $addedCount++
        }
        catch {
            Write-Host "  ❌ $($perm.Name) - Error: $_" -ForegroundColor Red
        }
    }
}

# Update the app registration
if ($addedCount -gt 0) {
    Write-Host "`n💾 Updating app registration..." -ForegroundColor Cyan
    try {
        Update-MgApplication -ApplicationId $app.Id -RequiredResourceAccess $app.RequiredResourceAccess
        Write-Host "✅ App registration updated successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error updating app: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "`n✅ All permissions already exist, no update needed" -ForegroundColor Green
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  Added: $addedCount permissions" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount permissions (already exist)" -ForegroundColor Yellow

# Grant admin consent
Write-Host "`n⚠️  IMPORTANT: Admin consent required!" -ForegroundColor Yellow
Write-Host "The permissions have been added, but you must grant admin consent." -ForegroundColor White
Write-Host "`nOption 1 - Azure Portal (Recommended):" -ForegroundColor Cyan
Write-Host "  1. Go to: https://portal.azure.com" -ForegroundColor Gray
Write-Host "  2. Navigate to: Azure AD > App registrations > $appDisplayName" -ForegroundColor Gray
Write-Host "  3. Click: API permissions" -ForegroundColor Gray
Write-Host "  4. Click: Grant admin consent for [Your Organization]" -ForegroundColor Gray
Write-Host "  5. Verify all permissions show green checkmarks" -ForegroundColor Gray

Write-Host "`nOption 2 - PowerShell (Admin Consent):" -ForegroundColor Cyan
Write-Host "  Run the following commands to grant consent programmatically:" -ForegroundColor Gray

# Get service principal for the app
$appSP = Get-MgServicePrincipal -Filter "appId eq '$appId'"

if ($appSP) {
    Write-Host "`n  # Get the app's service principal" -ForegroundColor DarkGray
    Write-Host "  `$appSP = Get-MgServicePrincipal -Filter `"appId eq '$appId'`"" -ForegroundColor White
    
    Write-Host "`n  # Grant admin consent for each permission" -ForegroundColor DarkGray
    foreach ($perm in $requiredPermissions) {
        Write-Host "  New-MgServicePrincipalAppRoleAssignment ``" -ForegroundColor White
        Write-Host "    -ServicePrincipalId `$appSP.Id ``" -ForegroundColor White
        Write-Host "    -PrincipalId `$appSP.Id ``" -ForegroundColor White
        Write-Host "    -ResourceId `$graphSP.Id ``" -ForegroundColor White
        Write-Host "    -AppRoleId '$($perm.Id)'" -ForegroundColor White
        Write-Host ""
    }
}

Write-Host "`n🎉 Script completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Grant admin consent using one of the options above" -ForegroundColor Gray
Write-Host "  2. Wait 5-10 minutes for changes to propagate" -ForegroundColor Gray
Write-Host "  3. Clear browser cache and re-login to your app" -ForegroundColor Gray
Write-Host "  4. Verify all features work without 403 errors" -ForegroundColor Gray

# Disconnect
Disconnect-MgGraph
Write-Host "`n✅ Disconnected from Microsoft Graph" -ForegroundColor Green
