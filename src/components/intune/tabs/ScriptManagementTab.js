import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  MenuItem,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  ContentCopy as CloneIcon,
  PlayArrow as RunIcon,
  Assessment as StatsIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import intuneScriptService from '../../../services/intune/intuneScriptService';

export default function ScriptManagementTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [scriptContent, setScriptContent] = useState('');
  const [runStates, setRunStates] = useState(null);
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  
  // Form data
  const [scriptForm, setScriptForm] = useState({
    displayName: '',
    description: '',
    scriptContent: '',
    scriptType: 'PowerShell',
    runAsAccount: 'system',
    enforceSignatureCheck: false,
    runAs32Bit: false,
    fileName: ''
  });

  const [cloneName, setCloneName] = useState('');
  const [importFiles, setImportFiles] = useState([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadScripts();
  }, []);

  /**
   * Load all scripts
   */
  const loadScripts = async () => {
    setLoading(true);
    try {
      const data = await intuneScriptService.fetchAllScripts();
      setScripts(data);
      onSuccess(`Loaded ${data.length} scripts`);
    } catch (error) {
      console.error('Error loading scripts:', error);
      onError('Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * View script content
   */
  const handleViewScript = async (script) => {
    setLoading(true);
    try {
      const content = await intuneScriptService.getScriptContent(script.id, script.scriptType);
      setScriptContent(content);
      setSelectedScript(script);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading script content:', error);
      onError('Failed to load script content');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get run states for script
   */
  const handleViewRunStates = async (script) => {
    setLoading(true);
    try {
      const states = await intuneScriptService.getScriptRunStates(script.id, script.scriptType);
      setRunStates(states);
      setSelectedScript(script);
    } catch (error) {
      console.error('Error loading run states:', error);
      onError('Failed to load run states');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create new script
   */
  const handleCreateScript = async () => {
    if (!scriptForm.displayName.trim()) {
      onError('Script name is required');
      return;
    }

    if (!scriptForm.scriptContent.trim()) {
      onError('Script content is required');
      return;
    }

    // Validate syntax
    const validation = intuneScriptService.validateScriptSyntax(
      scriptForm.scriptContent,
      scriptForm.scriptType
    );

    if (!validation.valid) {
      onError(validation.errors.join(', '));
      return;
    }

    if (validation.warnings.length > 0) {
      console.warn('Script warnings:', validation.warnings);
    }

    setLoading(true);
    try {
      if (scriptForm.scriptType === 'PowerShell') {
        await intuneScriptService.createPowerShellScript(scriptForm);
      } else {
        await intuneScriptService.createShellScript(scriptForm);
      }
      
      onSuccess('Script created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadScripts();
    } catch (error) {
      console.error('Error creating script:', error);
      onError('Failed to create script');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Import scripts from files
   */
  const handleImportScripts = async () => {
    if (importFiles.length === 0) {
      onError('Please select script files');
      return;
    }

    setLoading(true);
    try {
      const results = await intuneScriptService.bulkImportScripts(importFiles, {
        runAsAccount: 'system'
      });

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        onError(`Imported ${successful} scripts, ${failed} failed`);
      } else {
        onSuccess(`Successfully imported ${successful} scripts`);
      }

      setImportDialogOpen(false);
      setImportFiles([]);
      loadScripts();
    } catch (error) {
      console.error('Error importing scripts:', error);
      onError('Failed to import scripts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clone script
   */
  const handleCloneScript = async () => {
    if (!cloneName.trim()) {
      onError('Clone name is required');
      return;
    }

    setLoading(true);
    try {
      await intuneScriptService.cloneScript(
        selectedScript.id,
        selectedScript.scriptType,
        cloneName
      );
      
      onSuccess('Script cloned successfully');
      setCloneDialogOpen(false);
      setCloneName('');
      setSelectedScript(null);
      loadScripts();
    } catch (error) {
      console.error('Error cloning script:', error);
      onError('Failed to clone script');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete script
   */
  const handleDeleteScript = async (script) => {
    if (!window.confirm(`Are you sure you want to delete "${script.displayName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await intuneScriptService.deleteScript(script.id, script.scriptType);
      onSuccess('Script deleted successfully');
      loadScripts();
    } catch (error) {
      console.error('Error deleting script:', error);
      onError('Failed to delete script');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export script
   */
  const handleExportScript = async (script) => {
    setLoading(true);
    try {
      await intuneScriptService.exportScriptToFile(
        script.id,
        script.scriptType,
        script.fileName || `${script.displayName}.${script.scriptType === 'PowerShell' ? 'ps1' : 'sh'}`
      );
      onSuccess('Script exported');
    } catch (error) {
      console.error('Error exporting script:', error);
      onError('Failed to export script');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setScriptForm({
      displayName: '',
      description: '',
      scriptContent: '',
      scriptType: 'PowerShell',
      runAsAccount: 'system',
      enforceSignatureCheck: false,
      runAs32Bit: false,
      fileName: ''
    });
  };

  /**
   * Get filtered scripts
   */
  const getFilteredScripts = () => {
    if (filterType === 'all') return scripts;
    return scripts.filter(s => s.scriptType === filterType);
  };

  /**
   * Render scripts list
   */
  const renderScriptsList = () => {
    const filtered = getFilteredScripts();

    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Script
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import Scripts
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadScripts}
          >
            Refresh
          </Button>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            size="small"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Scripts</MenuItem>
            <MenuItem value="PowerShell">PowerShell</MenuItem>
            <MenuItem value="Shell">Shell</MenuItem>
          </TextField>
        </Box>

        {filtered.length === 0 ? (
          <Alert severity="info">
            No scripts found. Create one or import existing scripts to get started.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(script => (
              <Grid item xs={12} md={6} lg={4} key={script.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 1 }}>
                      <CodeIcon color="primary" />
                      <Chip 
                        label={script.scriptType}
                        size="small"
                        color={script.scriptType === 'PowerShell' ? 'primary' : 'secondary'}
                      />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {script.displayName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {script.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip 
                        label={script.runAsAccount || 'system'}
                        size="small"
                        variant="outlined"
                      />
                      {script.fileName && (
                        <Chip 
                          label={script.fileName}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Tooltip title="View Script">
                      <IconButton size="small" onClick={() => handleViewScript(script)}>
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Run States">
                      <IconButton size="small" onClick={() => handleViewRunStates(script)}>
                        <StatsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Clone">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedScript(script);
                          setCloneName(`${script.displayName} (Copy)`);
                          setCloneDialogOpen(true);
                        }}
                      >
                        <CloneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export">
                      <IconButton size="small" onClick={() => handleExportScript(script)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteScript(script)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  /**
   * Render run states
   */
  const renderRunStates = () => {
    if (!runStates || !selectedScript) {
      return (
        <Alert severity="info">
          Select a script and click "Run States" to view execution results
        </Alert>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Run States: {selectedScript.displayName}
        </Typography>

        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary">Total Devices</Typography>
                <Typography variant="h4">{runStates.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography color="textSecondary">Success</Typography>
                <Typography variant="h4">{runStates.success}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography color="textSecondary">Failed</Typography>
                <Typography variant="h4">{runStates.failed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography color="textSecondary">Pending</Typography>
                <Typography variant="h4">{runStates.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed States */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell>Error Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runStates.runStates.map((state, index) => (
                <TableRow key={index}>
                  <TableCell>{state.deviceName || state.managedDeviceId}</TableCell>
                  <TableCell>
                    <Chip 
                      label={state.runState}
                      size="small"
                      color={
                        state.runState === 'success' ? 'success' :
                        state.runState === 'fail' ? 'error' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {state.lastStateUpdateDateTime 
                      ? new Date(state.lastStateUpdateDateTime).toLocaleString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {state.errorDescription || state.errorCode || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  /**
   * Render create dialog
   */
  const renderCreateDialog = () => {
    return (
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Script</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Script Name"
              fullWidth
              value={scriptForm.displayName}
              onChange={(e) => setScriptForm({ ...scriptForm, displayName: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={scriptForm.description}
              onChange={(e) => setScriptForm({ ...scriptForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Script Type"
                  fullWidth
                  value={scriptForm.scriptType}
                  onChange={(e) => setScriptForm({ ...scriptForm, scriptType: e.target.value })}
                >
                  <MenuItem value="PowerShell">PowerShell (.ps1)</MenuItem>
                  <MenuItem value="Shell">Shell Script (.sh)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Run As"
                  fullWidth
                  value={scriptForm.runAsAccount}
                  onChange={(e) => setScriptForm({ ...scriptForm, runAsAccount: e.target.value })}
                >
                  <MenuItem value="system">System</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {scriptForm.scriptType === 'PowerShell' && (
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={scriptForm.runAs32Bit}
                      onChange={(e) => setScriptForm({ ...scriptForm, runAs32Bit: e.target.checked })}
                    />
                  }
                  label="Run as 32-bit"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={scriptForm.enforceSignatureCheck}
                      onChange={(e) => setScriptForm({ ...scriptForm, enforceSignatureCheck: e.target.checked })}
                    />
                  }
                  label="Enforce signature check"
                />
              </Box>
            )}

            <TextField
              label="Script Content"
              fullWidth
              multiline
              rows={12}
              value={scriptForm.scriptContent}
              onChange={(e) => setScriptForm({ ...scriptForm, scriptContent: e.target.value })}
              placeholder={scriptForm.scriptType === 'PowerShell' 
                ? '# PowerShell script\nWrite-Host "Hello World"'
                : '#!/bin/bash\necho "Hello World"'
              }
              sx={{ fontFamily: 'monospace' }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateScript}
            disabled={!scriptForm.displayName || !scriptForm.scriptContent}
          >
            Create Script
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  /**
   * Render view dialog
   */
  const renderViewDialog = () => {
    return (
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedScript?.displayName}
          <Chip 
            label={selectedScript?.scriptType}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={scriptContent}
            InputProps={{ readOnly: true }}
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleExportScript(selectedScript)}>
            Export
          </Button>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  /**
   * Render clone dialog
   */
  const renderCloneDialog = () => {
    return (
      <Dialog
        open={cloneDialogOpen}
        onClose={() => setCloneDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clone Script</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Cloning: {selectedScript?.displayName}
            </Alert>
            <TextField
              label="New Script Name"
              fullWidth
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCloneScript} disabled={!cloneName}>
            Clone
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  /**
   * Render import dialog
   */
  const renderImportDialog = () => {
    return (
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Scripts</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select PowerShell (.ps1) or Shell (.sh) script files to import
            </Alert>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 2, py: 2 }}
            >
              <UploadIcon sx={{ mr: 1 }} />
              {importFiles.length > 0 
                ? `${importFiles.length} file(s) selected`
                : 'Select Script Files'
              }
              <input
                type="file"
                accept=".ps1,.sh"
                multiple
                hidden
                onChange={(e) => setImportFiles(Array.from(e.target.files))}
              />
            </Button>

            {importFiles.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files:
                </Typography>
                {Array.from(importFiles).map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImportScripts}
            disabled={importFiles.length === 0}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Script Management & Deployment</Typography>
        <Typography variant="body2" color="textSecondary">
          Manage PowerShell and Shell scripts for Windows, macOS, and Linux devices
        </Typography>
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Scripts" />
          <Tab label="Run States" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper sx={{ p: 2 }}>
        {activeTab === 0 && renderScriptsList()}
        {activeTab === 1 && renderRunStates()}
      </Paper>

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderViewDialog()}
      {renderCloneDialog()}
      {renderImportDialog()}
    </Box>
  );
}
