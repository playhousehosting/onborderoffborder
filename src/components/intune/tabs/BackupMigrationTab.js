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

const BackupMigrationTab = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [availablePolicyTypes, setAvailablePolicyTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState({});

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

        {/* Import Section (Coming Soon) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ImportIcon sx={{ mr: 1, fontSize: 32, color: 'secondary.main' }} />
                <Typography variant="h6">Import Policies</Typography>
                <Chip label="Coming Soon" size="small" sx={{ ml: 'auto' }} />
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Restore policies from a backup file with intelligent assignment mapping.
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Import Feature Preview */}
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Import from JSON backup"
                    secondary="Restore from previously exported files"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Assignment mapping"
                    secondary="Auto-map groups between tenants"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Multiple import modes"
                    secondary="Always, Skip, Replace, or Update"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Dependency resolution"
                    secondary="Handle PolicySets and references"
                  />
                </ListItem>
              </List>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<ImportIcon />}
                disabled
                sx={{ mt: 2 }}
              >
                Import Policies (Coming Soon)
              </Button>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  📅 Import functionality will be available in the next update. 
                  Stay tuned for assignment mapping and cross-tenant migration!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

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
