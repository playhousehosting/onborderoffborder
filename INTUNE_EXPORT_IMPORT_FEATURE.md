# Intune Export/Import Feature Specification

## 📦 Overview
Add bulk export/import capabilities for Intune policies, inspired by the IntuneManagement PowerShell tool. This enables backup, cloning, and migration of entire Intune environments.

## 🎯 Features to Implement

### 1. **Policy Export**
Export all Intune policies to JSON files with full configuration:

**Supported Object Types:**
- ✅ Device Configuration Policies
- ✅ Compliance Policies  
- ✅ App Protection Policies
- ✅ Conditional Access Policies
- ✅ Device Configuration Profiles (Settings Catalog)
- ✅ Endpoint Security (Antivirus, Firewall, Disk Encryption)
- ✅ Administrative Templates (ADMX)
- ✅ App Configurations
- ✅ Enrollment Restrictions
- ✅ Windows Autopilot Profiles
- ✅ Scripts (PowerShell, Shell)
- ✅ Policy Sets
- ✅ Compliance Policies v2
- ✅ Feature/Quality Updates

**Export Structure:**
```
exports/
├── [Organization Name]/
│   ├── [YYYY-MM-DD-HHMM]/
│   │   ├── DeviceConfigurations/
│   │   │   ├── [Policy Name].json
│   │   │   ├── [Policy Name]_assignments.json
│   │   ├── CompliancePolicies/
│   │   ├── AppProtection/
│   │   ├── ConditionalAccess/
│   │   ├── EndpointSecurity/
│   │   ├── Scripts/
│   │   │   ├── [Script Name].json
│   │   │   ├── [Script Name].ps1  (downloaded script)
│   │   ├── PolicySets/
│   │   └── export_manifest.json
```

**Export Manifest (export_manifest.json):**
```json
{
  "exportDate": "2025-11-19T10:30:00Z",
  "organization": {
    "name": "Contoso",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  },
  "statistics": {
    "totalPolicies": 45,
    "deviceConfigurations": 12,
    "compliancePolicies": 8,
    "appProtection": 5,
    "conditionalAccess": 10,
    "scripts": 6,
    "policySets": 4
  },
  "exportedBy": "admin@contoso.com"
}
```

**Graph API Endpoints:**
```javascript
// Device Configurations
GET /deviceManagement/deviceConfigurations
GET /deviceManagement/deviceConfigurations/{id}/assignments

// Compliance Policies
GET /deviceManagement/deviceCompliancePolicies
GET /deviceManagement/deviceCompliancePolicies/{id}/assignments

// App Protection
GET /deviceAppManagement/managedAppPolicies
GET /deviceAppManagement/targetedManagedAppConfigurations/{id}/assignments

// Conditional Access
GET /identity/conditionalAccess/policies

// Scripts
GET /deviceManagement/deviceManagementScripts
GET /deviceManagement/deviceManagementScripts/{id}/deviceRunStates

// Policy Sets
GET /deviceAppManagement/policySets
GET /deviceAppManagement/policySets/{id}/assignments
```

---

### 2. **Assignment Migration Table**
During export, create a migration table for group assignments:

**MigrationTable.json:**
```json
{
  "groups": {
    "aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb": {
      "sourceName": "All Users",
      "sourceId": "aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb",
      "sourceType": "unified",
      "targetId": null,
      "targetName": null,
      "mappedAt": null
    },
    "bbbbbbbb-1111-2222-3333-cccccccccccc": {
      "sourceName": "IT Department",
      "sourceId": "bbbbbbbb-1111-2222-3333-cccccccccccc",
      "sourceType": "security",
      "targetId": "dddddddd-4444-5555-6666-eeeeeeeeeeee",
      "targetName": "IT Department (Prod)",
      "mappedAt": "2025-11-19T11:00:00Z"
    }
  },
  "users": {
    "user1@source.com": {
      "sourceId": "11111111-2222-3333-4444-555555555555",
      "targetId": "66666666-7777-8888-9999-aaaaaaaaaaaa",
      "targetEmail": "user1@destination.com"
    }
  }
}
```

---

### 3. **Policy Import**
Import policies from exported JSON files with assignment mapping:

**Import Modes:**
1. **Always Import** (Default): Create new policy regardless of existence
2. **Skip if Exists**: Check for duplicate by name and type, skip if found
3. **Replace (⚠️ Preview)**: 
   - Import new policy
   - Copy assignments from existing policy
   - Update PolicySets to reference new policy
   - Delete old policy
4. **Update (⚠️ Preview)**:
   - Update existing policy with new settings
   - Preserve existing assignments
   - Settings Catalog: Full replace of settings
   - Other types: Merge settings (only update specified)

**Import Wizard Flow:**
```
1. Select Export Folder
   └─> Browse to previously exported folder

2. Review Export Manifest
   └─> Show statistics, export date, organization

3. Configure Import Mode
   ├─> Always Import
   ├─> Skip if Exists  
   ├─> Replace (with confirmation)
   └─> Update (with confirmation)

4. Map Assignments
   ├─> Auto-match groups by name
   ├─> Manual mapping for unmatched
   └─> Option to create missing groups

5. Select Policies to Import
   ├─> Check all / uncheck all
   ├─> Filter by type
   └─> Dependency order shown

6. Confirm & Execute
   └─> Progress bar with per-policy status
```

**Group Creation:**
- If group doesn't exist in target tenant, create it
- Preserve: name, description, groupType (security/unified)
- Copy: visibility, mailEnabled, securityEnabled
- Dynamic groups: Copy membershipRule

---

### 4. **Comparison Feature**
Compare policies between Intune and exported files:

**Comparison View:**
```
╔════════════════════════════════════════════════════════╗
║ Policy Comparison: "Windows 10 Security Baseline"     ║
╠════════════════════════════════════════════════════════╣
║ Setting Name             │ Intune Value  │ File Value ║
╟────────────────────────────────────────────────────────╢
║ Firewall Enabled         │ ✅ Enabled    │ ✅ Enabled ║
║ BitLocker Required       │ ✅ Enabled    │ ✅ Enabled ║
║ Password Min Length      │ 8 characters  │ 🔴 12      ║
║ Password Complexity      │ Required      │ 🔴 Disabled║
║ Screen Lock Timeout      │ 🔴 15 min     │ 5 min      ║
╚════════════════════════════════════════════════════════╝

Legend: ✅ Match  🔴 Different  ➕ New  ➖ Removed
```

**Bulk Compare Options:**
1. **Intune vs Exported Files**: Compare current Intune policies with backup
2. **Named Pattern Compare**: Compare policies with environment prefixes
   - Example: `[Dev] Policy 1` vs `[Prod] Policy 1`
3. **Two Export Folders**: Compare two backups from different dates/tenants

**Output Formats:**
- 📄 CSV (one file per object type OR single merged file)
- 📊 HTML Report with color coding
- 📁 Export to `My Documents/PolicyComparisons/`

---

### 5. **Bulk Copy (Clone) Policies**
Clone policies with name pattern transformation:

**Use Case:**
Clone development policies to production with name changes:
- Source Pattern: `[Dev] *`
- Target Pattern: `[Prod] *`
- Example: `[Dev] VPN Profile` → `[Prod] VPN Profile`

**Process:**
1. Match all policies by source pattern
2. For each matched policy:
   - Check if target name already exists (skip if exists)
   - Clone policy with new name
   - ⚠️ Assignments NOT copied (must be assigned manually)
   - Preserve all settings, scope tags

---

### 6. **UI Implementation**

**New "Backup & Migration" Tab in Intune Management:**

```jsx
<Tab label="🔄 Backup & Migration" />

// Tab Content
<Box>
  <Grid container spacing={3}>
    {/* Export Section */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6">📤 Export Policies</Typography>
          <Typography variant="body2">
            Backup all Intune policies to JSON files
          </Typography>
          
          <FormGroup>
            <FormControlLabel 
              control={<Checkbox checked={exportOptions.deviceConfig} />}
              label="Device Configurations (12)" 
            />
            <FormControlLabel 
              control={<Checkbox checked={exportOptions.compliance} />}
              label="Compliance Policies (8)" 
            />
            <FormControlLabel 
              control={<Checkbox checked={exportOptions.apps} />}
              label="App Protection (5)" 
            />
            {/* ... more options */}
          </FormGroup>
          
          <TextField
            label="Export Path"
            value={exportPath}
            helperText="Use %Date%, %DateTime%, %Organization%"
          />
          
          <Button variant="contained" onClick={handleExport}>
            Export Selected Policies
          </Button>
        </CardContent>
      </Card>
    </Grid>

    {/* Import Section */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6">📥 Import Policies</Typography>
          
          <Button 
            variant="outlined" 
            startIcon={<FolderOpenIcon />}
            onClick={handleBrowseExport}
          >
            Select Export Folder
          </Button>
          
          {selectedExport && (
            <>
              <Alert severity="info">
                Export: {selectedExport.date} 
                ({selectedExport.totalPolicies} policies)
              </Alert>
              
              <FormControl fullWidth>
                <InputLabel>Import Mode</InputLabel>
                <Select value={importMode}>
                  <MenuItem value="always">Always Import</MenuItem>
                  <MenuItem value="skip">Skip if Exists</MenuItem>
                  <MenuItem value="replace">Replace (Preview)</MenuItem>
                  <MenuItem value="update">Update (Preview)</MenuItem>
                </Select>
              </FormControl>
              
              <Button variant="contained" onClick={handleImport}>
                Start Import
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Grid>

    {/* Compare Section */}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6">🔍 Compare Policies</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined">
                Intune vs Export Files
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined">
                Pattern-Based Compare
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button fullWidth variant="outlined">
                Two Export Folders
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    {/* Clone Section */}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6">📋 Clone Policies</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth
                label="Source Pattern"
                value={cloneSource}
                placeholder="[Dev] *"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                fullWidth
                label="Target Pattern"
                value={cloneTarget}
                placeholder="[Prod] *"
              />
            </Grid>
          </Grid>
          
          <Button 
            variant="contained" 
            onClick={handleBulkClone}
            sx={{ mt: 2 }}
          >
            Clone Matching Policies
          </Button>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</Box>
```

---

## 🔧 Implementation Plan

### Phase 1: Export Feature (Week 1-2)
1. ✅ Create export service: `src/services/intuneExportService.js`
2. ✅ Implement Graph API queries for all policy types
3. ✅ Build JSON file generation with folder structure
4. ✅ Create export manifest generator
5. ✅ Add progress tracking and error handling
6. ✅ Implement script content download (PowerShell/Shell)

### Phase 2: Migration Table & Group Mapping (Week 2-3)
1. ✅ Generate migration table during export
2. ✅ Auto-detect group assignments
3. ✅ Build group matching algorithm (by name)
4. ✅ Add manual mapping UI
5. ✅ Implement group creation for missing groups

### Phase 3: Import Feature (Week 3-4)
1. ✅ Create import service: `src/services/intuneImportService.js`
2. ✅ Parse exported JSON files
3. ✅ Implement import modes (Always, Skip, Replace, Update)
4. ✅ Map assignments using migration table
5. ✅ Handle dependencies (PolicySets, App Protection → Apps)
6. ✅ Add progress tracking per policy

### Phase 4: Comparison Feature (Week 4-5)
1. ✅ Build comparison engine
2. ✅ Create diff algorithm for settings
3. ✅ Implement three comparison modes
4. ✅ Generate HTML/CSV reports
5. ✅ Add visualization with color coding

### Phase 5: Clone Feature (Week 5-6)
1. ✅ Pattern matching algorithm
2. ✅ Policy duplication logic
3. ✅ Name transformation
4. ✅ Validation (don't overwrite existing)

### Phase 6: UI Integration (Week 6-7)
1. ✅ Add "Backup & Migration" tab to IntuneManagement.js
2. ✅ Build Export wizard
3. ✅ Build Import wizard with assignment mapping
4. ✅ Create comparison results viewer
5. ✅ Add clone pattern builder

---

## 📊 Value Proposition

### ✅ Business Benefits
- **Disaster Recovery**: Complete Intune backup for quick restoration
- **Environment Cloning**: Dev → Test → Prod policy promotion
- **Multi-Tenant Management**: Replicate policies across subsidiaries
- **Compliance**: Audit trail of policy changes over time
- **Migration**: Move from one tenant to another seamlessly

### ✅ Time Savings
- **Manual Export**: ~5 minutes per policy × 50 policies = 250 minutes  
- **Bulk Export**: ~5 minutes for all policies  
- **Time Saved**: ~4 hours per full backup  

- **Manual Import**: ~10 minutes per policy (assignments, settings)  
- **Bulk Import with Mapping**: ~30 minutes for 50 policies  
- **Time Saved**: ~7.5 hours per migration  

### ✅ Risk Reduction
- ❌ **Without**: Manual export/import prone to errors, missing assignments
- ✅ **With**: Automated, validated, assignment mapping, dependency tracking

---

## 🔐 Permissions Required

**Additional Microsoft Graph Permissions:**
```javascript
// Read policies (already have)
DeviceManagementConfiguration.Read.All
DeviceManagementApps.Read.All

// Write policies (new - needed for import)
DeviceManagementConfiguration.ReadWrite.All
DeviceManagementApps.ReadWrite.All

// Read/Write groups (for mapping & creation)
Group.Read.All
Group.ReadWrite.All
```

---

## 🚨 Considerations

### ⚠️ Replace/Update Modes
- **Replace**: DESTRUCTIVE - deletes existing policy after import
- **Update**: May not clear all settings (Graph API limitation)
- **Recommendation**: Test in non-production first, always backup before replacing

### 🔒 Security
- Export files contain sensitive policy settings
- Store in secure location (encrypted storage recommended)
- Audit who exports/imports policies

### 📦 Dependencies
- Policy Sets depend on policies (import policies first)
- App Protection depends on Apps (import apps first)
- Assignments depend on groups (create/map groups first)

---

## 📚 References

**IntuneManagement PowerShell Tool:**
- GitHub: https://github.com/Micke-K/IntuneManagement
- Features: Export, Import, Copy, Documentation, Compare
- Supports: 40+ Intune object types, dependencies, assignments

**Microsoft Graph API Documentation:**
- Device Management: https://learn.microsoft.com/en-us/graph/api/resources/intune-graph-overview
- Policy Sets: https://learn.microsoft.com/en-us/graph/api/resources/intune-policyset-policyset
- Assignments: https://learn.microsoft.com/en-us/graph/api/resources/intune-shared-deviceconfigurationassignment

---

## ✅ Next Steps

1. **Review & Approve**: Confirm feature scope and priorities
2. **Permissions**: Request additional Graph API permissions from Azure admin
3. **Development**: Start Phase 1 (Export Feature)
4. **Testing**: Create test tenant for validation
5. **Documentation**: Update user guide with backup/migration workflows

**Estimated Completion**: 6-7 weeks for full feature set  
**MVP (Export only)**: 2 weeks
