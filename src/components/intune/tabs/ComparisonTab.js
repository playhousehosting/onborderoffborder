/**
 * Comparison Tab
 * Compare Intune policies between tenant and backup files
 * Visual diff viewer with detailed change tracking
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Compare as CompareIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  CheckCircle as UnchangedIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

import { intuneComparisonService, DIFF_TYPES } from '../../../services/intune/intuneComparisonService';
import { intuneExportService } from '../../../services/intune/intuneExportService';

const ComparisonTab = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [backupFile, setBackupFile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setBackupFile(data);
      onSuccess(`Backup file loaded: ${file.name}`);
    } catch (error) {
      onError(`Failed to load backup file: ${error.message}`);
      setBackupFile(null);
    }
  };

  const handleCompare = async () => {
    if (!backupFile) {
      onError('Please select a backup file to compare');
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: 100, message: 'Starting comparison...' });
    setComparisonResult(null);

    try {
      const policyTypes = Object.keys(backupFile.policies || {});
      
      const results = await intuneComparisonService.compareWithBackup(
        backupFile,
        policyTypes,
        (current, total, message) => {
          setProgress({ current, total, message });
        }
      );

      setComparisonResult(results);
      onSuccess('Comparison complete!');
      setProgress(null);

    } catch (error) {
      console.error('Comparison failed:', error);
      onError(`Comparison failed: ${error.message}`);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (format) => {
    if (!comparisonResult) return;

    try {
      const report = intuneComparisonService.generateReport(comparisonResult, format);
      const blob = new Blob([report], { 
        type: format === 'html' ? 'text/html' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `intune-comparison-${timestamp}.${format === 'html' ? 'html' : 'txt'}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onSuccess(`Report downloaded: ${filename}`);
    } catch (error) {
      onError(`Failed to download report: ${error.message}`);
    }
  };

  const getDiffIcon = (diffType) => {
    switch (diffType) {
      case DIFF_TYPES.ADDED:
        return <AddIcon color="success" fontSize="small" />;
      case DIFF_TYPES.REMOVED:
        return <RemoveIcon color="error" fontSize="small" />;
      case DIFF_TYPES.MODIFIED:
        return <EditIcon color="warning" fontSize="small" />;
      case DIFF_TYPES.UNCHANGED:
        return <UnchangedIcon color="info" fontSize="small" />;
      default:
        return null;
    }
  };

  const getDiffColor = (diffType) => {
    switch (diffType) {
      case DIFF_TYPES.ADDED:
        return 'success';
      case DIFF_TYPES.REMOVED:
        return 'error';
      case DIFF_TYPES.MODIFIED:
        return 'warning';
      case DIFF_TYPES.UNCHANGED:
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        
        {/* Comparison Setup */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CompareIcon sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h6">Compare Policies</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Compare your current tenant policies with a backup file to identify changes.
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* File Selection */}
              <Box mb={2}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="compare-file-input"
                  disabled={loading}
                />
                <label htmlFor="compare-file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    startIcon={<UploadIcon />}
                    disabled={loading}
                  >
                    {backupFile ? 'Change Backup File' : 'Select Backup File'}
                  </Button>
                </label>

                {backupFile && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      File Loaded ✓
                    </Typography>
                    <Typography variant="caption">
                      {backupFile.organization?.name || 'Unknown Tenant'} • 
                      {backupFile.exportStats?.exportedPolicies || 0} policies
                    </Typography>
                  </Alert>
                )}
              </Box>

              {/* Progress */}
              {progress && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {progress.message}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.current} 
                  />
                </Box>
              )}

              {/* Compare Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<CompareIcon />}
                onClick={handleCompare}
                disabled={loading || !backupFile}
              >
                {loading ? 'Comparing...' : 'Compare with Current Tenant'}
              </Button>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  💡 This will compare your current tenant policies with the backup file and show all differences.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        {comparisonResult && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Comparison Summary
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="#d4edda" borderRadius={2}>
                      <Typography variant="h3" color="#155724">
                        {comparisonResult.summary.added}
                      </Typography>
                      <Typography variant="body2" color="#155724">
                        Added
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="#f8d7da" borderRadius={2}>
                      <Typography variant="h3" color="#721c24">
                        {comparisonResult.summary.removed}
                      </Typography>
                      <Typography variant="body2" color="#721c24">
                        Removed
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="#fff3cd" borderRadius={2}>
                      <Typography variant="h3" color="#856404">
                        {comparisonResult.summary.modified}
                      </Typography>
                      <Typography variant="body2" color="#856404">
                        Modified
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={2} bgcolor="#d1ecf1" borderRadius={2}>
                      <Typography variant="h3" color="#0c5460">
                        {comparisonResult.summary.unchanged}
                      </Typography>
                      <Typography variant="body2" color="#0c5460">
                        Unchanged
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Download Reports */}
                <Typography variant="subtitle2" gutterBottom>
                  Download Reports
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadReport('text')}
                  >
                    Text Report
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadReport('html')}
                  >
                    HTML Report
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Detailed Results */}
        {comparisonResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Comparison
                </Typography>

                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                  <Tab label={`Added (${comparisonResult.summary.added})`} />
                  <Tab label={`Removed (${comparisonResult.summary.removed})`} />
                  <Tab label={`Modified (${comparisonResult.summary.modified})`} />
                </Tabs>

                <Box sx={{ mt: 2 }}>
                  {/* Added Tab */}
                  {activeTab === 0 && (
                    <Box>
                      {Object.entries(comparisonResult.details).map(([policyType, details]) => {
                        if (details.added.length === 0) return null;
                        
                        return (
                          <Accordion key={policyType}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>
                                {policyType} ({details.added.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <List dense>
                                {details.added.map((item, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      {getDiffIcon(DIFF_TYPES.ADDED)}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={item.name}
                                      secondary="Present in current tenant but not in backup"
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  )}

                  {/* Removed Tab */}
                  {activeTab === 1 && (
                    <Box>
                      {Object.entries(comparisonResult.details).map(([policyType, details]) => {
                        if (details.removed.length === 0) return null;
                        
                        return (
                          <Accordion key={policyType}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>
                                {policyType} ({details.removed.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <List dense>
                                {details.removed.map((item, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      {getDiffIcon(DIFF_TYPES.REMOVED)}
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={item.name}
                                      secondary="Present in backup but not in current tenant"
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  )}

                  {/* Modified Tab */}
                  {activeTab === 2 && (
                    <Box>
                      {Object.entries(comparisonResult.details).map(([policyType, details]) => {
                        if (details.modified.length === 0) return null;
                        
                        return (
                          <Accordion key={policyType}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>
                                {policyType} ({details.modified.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              {details.modified.map((item, idx) => (
                                <Box key={idx} sx={{ mb: 3 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    {item.name}
                                    <Chip 
                                      label={`${item.changes.length} changes`} 
                                      size="small" 
                                      color="warning"
                                      sx={{ ml: 1 }}
                                    />
                                  </Typography>
                                  <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell><strong>Property</strong></TableCell>
                                          <TableCell><strong>Backup Value</strong></TableCell>
                                          <TableCell><strong>Current Value</strong></TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {item.changes.map((change, cidx) => (
                                          <TableRow key={cidx}>
                                            <TableCell>{change.property}</TableCell>
                                            <TableCell sx={{ color: 'error.main' }}>
                                              {change.backupValue}
                                            </TableCell>
                                            <TableCell sx={{ color: 'success.main' }}>
                                              {change.currentValue}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              ))}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

      </Grid>
    </Box>
  );
};

export default ComparisonTab;
