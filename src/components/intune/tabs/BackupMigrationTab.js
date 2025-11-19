/**
 * Backup & Migration Tab
 * Export and import Intune policies with assignment mapping
 * Reuses existing UI components for consistency
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudDownload as ExportIcon,
  CloudUpload as ImportIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { intuneExportService } from '../../../services/intune/intuneExportService';
import { intuneImportService, IMPORT_MODES } from '../../../services/intune/intuneImportService';

const BackupMigrationTab = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [availablePolicyTypes, setAvailablePolicyTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState({});
  
  // Import state
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState(IMPORT_MODES.SKIP);
  const [importValidation, setImportValidation] = useState(null);

  useEffect(() => {
    loadAvailablePolicyTypes();
  }, []);

  const loadAvailablePolicyTypes = () => {
    const types = intuneExportService.getAvailablePolicyTypes();
    setAvailablePolicyTypes(types);
    
    // Select all by default
    const selected = {};
    types.forEach(type => {
      selected[type.key] = true;
    });
    setSelectedTypes(selected);
  };

  const handleSelectAll = () => {
    const allSelected = {};
    availablePolicyTypes.forEach(type => {
      allSelected[type.key] = true;
    });
    setSelectedTypes(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedTypes({});
  };

  const handleToggleType = (typeKey) => {
    setSelectedTypes(prev => ({
      ...prev,
      [typeKey]: !prev[typeKey]
    }));
  };

  const handleExport = async () => {
    const selectedTypeKeys = Object.keys(selectedTypes).filter(key => selectedTypes[key]);
    
    if (selectedTypeKeys.length === 0) {
      onError('Please select at least one policy type to export');
      return;
    }

    setLoading(true);
    setExportProgress({ current: 0, total: 100, message: 'Starting export...' });
    setExportResult(null);

    try {
      const exportData = await intuneExportService.exportPolicies(
        selectedTypeKeys,
        { includeAssignments: true },
        (current, total, message) => {
          setExportProgress({ current, total, message });
        }
      );

      setExportResult(exportData);
      
      // Auto-download after export
      const filename = await intuneExportService.downloadExport(exportData);
      
      onSuccess(`Export complete! Downloaded ${filename}`);
      setExportProgress(null);

    } catch (error) {
      console.error('Export failed:', error);
      onError(`Export failed: ${error.message}`);
      setExportProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedTypes).filter(Boolean).length;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate import file
      const validation = intuneImportService.validateImportFile(data);
      setImportValidation(validation);
      
      if (validation.valid) {
        setImportFile(data);
        onSuccess(`File validated: ${validation.policyCount} policies found`);
      } else {
        onError(`Invalid import file: ${validation.errors.join(', ')}`);
        setImportFile(null);
      }
    } catch (error) {
      onError(`Failed to read import file: ${error.message}`);
      setImportFile(null);
      setImportValidation(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      onError('Please select a file to import');
      return;
    }

    setLoading(true);
    setImportProgress({ current: 0, total: 100, message: 'Starting import...' });
    setImportResult(null);

    try {
      const results = await intuneImportService.importPolicies(
        importFile,
        { mode: importMode },
        (current, total, message) => {
          setImportProgress({ current, total, message });
        }
      );

      setImportResult(results);
      onSuccess(`Import complete! ${results.importStats.importedPolicies} policies imported`);
      setImportProgress(null);

    } catch (error) {
      console.error('Import failed:', error);
      onError(`Import failed: ${error.message}`);
      setImportProgress(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        
        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ExportIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h6">Export Policies</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Backup all Intune policies to a single JSON file with assignments and metadata.
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Policy Type Selection */}
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">
                    Select Policy Types ({getSelectedCount()}/{availablePolicyTypes.length})
                  </Typography>
                  <Box>
                    <Button size="small" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button size="small" onClick={handleDeselectAll}>
                      Clear
                    </Button>
                  </Box>
                </Box>

                <FormGroup>
                  {availablePolicyTypes.map(type => (
                    <FormControlLabel
                      key={type.key}
                      control={
                        <Checkbox
                          checked={selectedTypes[type.key] || false}
                          onChange={() => handleToggleType(type.key)}
                          disabled={loading}
                        />
                      }
                      label={type.name}
                    />
                  ))}
                </FormGroup>
              </Box>

              {/* Export Progress */}
              {exportProgress && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {exportProgress.message}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={exportProgress.current} 
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {exportProgress.current}% complete
                  </Typography>
                </Box>
              )}

              {/* Export Result Summary */}
              {exportResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Export Complete!
                  </Typography>
                  <Typography variant="caption">
                    Exported {exportResult.exportStats?.exportedPolicies || 0} policies
                    {exportResult.exportStats?.failedPolicies > 0 && 
                      ` (${exportResult.exportStats.failedPolicies} failed)`
                    }
                  </Typography>
                </Alert>
              )}

              {/* Export Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ExportIcon />}
                onClick={handleExport}
                disabled={loading || getSelectedCount() === 0}
              >
                {loading ? 'Exporting...' : 'Export Selected Policies'}
              </Button>

              {/* Export Info */}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 The export includes policy settings, assignments, and metadata. 
                  You can use this file to restore policies or migrate to another tenant.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ImportIcon sx={{ mr: 1, fontSize: 32, color: 'secondary.main' }} />
                <Typography variant="h6">Import Policies</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Restore policies from a backup file with conflict resolution.
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* File Selection */}
              <Box mb={2}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="import-file-input"
                  disabled={loading}
                />
                <label htmlFor="import-file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    disabled={loading}
                    sx={{ mb: 1 }}
                  >
                    {importFile ? 'Change File' : 'Select Backup File'}
                  </Button>
                </label>

                {importValidation && importValidation.valid && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      File Validated ✓
                    </Typography>
                    <Typography variant="caption">
                      {importValidation.policyCount} policies • Exported {new Date(importValidation.exportDate).toLocaleDateString()}
                      {importValidation.organization?.name && ` • ${importValidation.organization.name}`}
                    </Typography>
                  </Alert>
                )}
              </Box>

              {/* Import Mode Selection */}
              {importFile && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Import Mode
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={importMode === IMPORT_MODES.ALWAYS}
                          onChange={() => setImportMode(IMPORT_MODES.ALWAYS)}
                          disabled={loading}
                        />
                      }
                      label="Always - Create all policies (may create duplicates)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={importMode === IMPORT_MODES.SKIP}
                          onChange={() => setImportMode(IMPORT_MODES.SKIP)}
                          disabled={loading}
                        />
                      }
                      label="Skip - Skip if policy with same name exists"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={importMode === IMPORT_MODES.REPLACE}
                          onChange={() => setImportMode(IMPORT_MODES.REPLACE)}
                          disabled={loading}
                        />
                      }
                      label="Replace - Delete existing and create new"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={importMode === IMPORT_MODES.UPDATE}
                          onChange={() => setImportMode(IMPORT_MODES.UPDATE)}
                          disabled={loading}
                        />
                      }
                      label="Update - Update existing policy settings"
                    />
                  </FormGroup>
                </Box>
              )}

              {/* Import Progress */}
              {importProgress && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {importProgress.message}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={importProgress.current} 
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {importProgress.current}% complete
                  </Typography>
                </Box>
              )}

              {/* Import Result Summary */}
              {importResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Import Complete!
                  </Typography>
                  <Typography variant="caption">
                    {importResult.importStats.importedPolicies} imported • 
                    {importResult.importStats.skippedPolicies} skipped • 
                    {importResult.importStats.failedPolicies} failed
                  </Typography>
                </Alert>
              )}

              {/* Import Button */}
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<ImportIcon />}
                onClick={handleImport}
                disabled={loading || !importFile}
              >
                {loading ? 'Importing...' : 'Import Policies'}
              </Button>

              {/* Import Info */}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 Import will restore policies with their settings. Assignments will be created if groups exist in the current tenant.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Details (if completed) */}
        {importResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Import Results
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="success.main">
                        {importResult.importStats?.importedPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Imported
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="warning.main">
                        {importResult.importStats?.skippedPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Skipped
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="error.main">
                        {importResult.importStats?.failedPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Failed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="primary.main">
                        {importResult.importStats?.totalPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Failed Policies List */}
                {importResult.failed && importResult.failed.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom color="error">
                      Failed Policies
                    </Typography>
                    <List dense>
                      {importResult.failed.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.name}
                            secondary={`${item.type} - ${item.error}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Export Details (if completed) */}
        {exportResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Export Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="primary.main">
                        {exportResult.exportStats?.exportedPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Policies Exported
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="success.main">
                        {Object.keys(exportResult.policies || {}).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Policy Types
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h3" color="error.main">
                        {exportResult.exportStats?.failedPolicies || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Failed
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Breakdown by Policy Type */}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Breakdown by Policy Type
                </Typography>
                
                <List dense>
                  {Object.entries(exportResult.statistics || {}).map(([key, count]) => {
                    const typeInfo = availablePolicyTypes.find(t => t.key === key);
                    return (
                      <ListItem key={key}>
                        <ListItemText 
                          primary={typeInfo?.name || key}
                          secondary={`${count} ${count === 1 ? 'policy' : 'policies'}`}
                        />
                        <Chip 
                          label={count} 
                          size="small" 
                          color={count > 0 ? 'primary' : 'default'}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Information Section */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <InfoIcon sx={{ mr: 1 }} color="info" />
              <Typography>How It Works</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                <strong>Export Process:</strong>
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="1. Select policy types to backup"
                    secondary="Choose which configurations you want to export"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="2. Export runs automatically"
                    secondary="Fetches policies, assignments, and metadata from Microsoft Graph API"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="3. Download JSON file"
                    secondary="Single file with all data, ready for restore or migration"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" paragraph>
                <strong>What's Included:</strong>
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Policy configurations (all settings)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Group assignments" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Metadata (creation date, modified by, etc.)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Script content (for PowerShell/Shell scripts)" />
                </ListItem>
              </List>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  ⚠️ Store export files securely! They contain sensitive policy configurations. 
                  Consider encrypting backup files for additional security.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>
        </Grid>

      </Grid>
    </Box>
  );
};

export default BackupMigrationTab;
