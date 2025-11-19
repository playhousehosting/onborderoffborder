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
  AccordionDetails
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
  Settings as SettingsIcon
} from '@mui/icons-material';
import intuneRegistryService from '../../services/intune/intuneRegistryService';

export default function RegistrySettingsTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policySettings, setPolicySettings] = useState([]);
  
  // Create/Edit dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addSettingDialogOpen, setAddSettingDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Form data
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [registrySettings, setRegistrySettings] = useState([]);
  const [currentSetting, setCurrentSetting] = useState({
    hive: 'HKEY_LOCAL_MACHINE',
    keyPath: '',
    valueName: '',
    valueType: 'String',
    value: '',
    displayName: '',
    description: ''
  });

  // Import
  const [importFile, setImportFile] = useState(null);
  const [importPolicyName, setImportPolicyName] = useState('');
  const [importPolicyDescription, setImportPolicyDescription] = useState('');

  useEffect(() => {
    loadPolicies();
  }, []);

  /**
   * Load custom configuration policies
   */
  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await intuneRegistryService.fetchCustomPolicies();
      setPolicies(data);
      onSuccess('Registry policies loaded');
    } catch (error) {
      console.error('Error loading policies:', error);
      onError('Failed to load registry policies');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load settings for a policy
   */
  const loadPolicySettings = async (policyId) => {
    setLoading(true);
    try {
      const settings = await intuneRegistryService.fetchPolicySettings(policyId);
      setPolicySettings(settings);
      setSelectedPolicy(policyId);
    } catch (error) {
      console.error('Error loading policy settings:', error);
      onError('Failed to load policy settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add setting to list
   */
  const handleAddSetting = () => {
    const validation = intuneRegistryService.validateSetting(currentSetting);
    
    if (!validation.valid) {
      onError(validation.errors.join(', '));
      return;
    }

    setRegistrySettings([...registrySettings, { ...currentSetting }]);
    setCurrentSetting({
      hive: 'HKEY_LOCAL_MACHINE',
      keyPath: '',
      valueName: '',
      valueType: 'String',
      value: '',
      displayName: '',
      description: ''
    });
    setAddSettingDialogOpen(false);
    onSuccess('Setting added to list');
  };

  /**
   * Remove setting from list
   */
  const handleRemoveSetting = (index) => {
    const updated = [...registrySettings];
    updated.splice(index, 1);
    setRegistrySettings(updated);
  };

  /**
   * Create policy with settings
   */
  const handleCreatePolicy = async () => {
    if (!policyName.trim()) {
      onError('Policy name is required');
      return;
    }

    if (registrySettings.length === 0) {
      onError('At least one registry setting is required');
      return;
    }

    setLoading(true);
    try {
      await intuneRegistryService.createRegistryPolicy(
        policyName,
        policyDescription,
        registrySettings
      );
      
      onSuccess('Registry policy created successfully');
      setCreateDialogOpen(false);
      setPolicyName('');
      setPolicyDescription('');
      setRegistrySettings([]);
      loadPolicies();
    } catch (error) {
      console.error('Error creating policy:', error);
      onError('Failed to create registry policy');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Import .reg file
   */
  const handleImportRegFile = async () => {
    if (!importFile) {
      onError('Please select a .reg file');
      return;
    }

    if (!importPolicyName.trim()) {
      onError('Policy name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await intuneRegistryService.importRegFile(
        importFile,
        importPolicyName,
        importPolicyDescription
      );
      
      onSuccess(`Policy created with ${result.settingsCount} registry settings`);
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPolicyName('');
      setImportPolicyDescription('');
      loadPolicies();
    } catch (error) {
      console.error('Error importing .reg file:', error);
      onError('Failed to import .reg file');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export policy settings to .reg file
   */
  const handleExportToRegFile = async (policyId) => {
    setLoading(true);
    try {
      const settings = await intuneRegistryService.fetchPolicySettings(policyId);
      
      // Convert OMA-URI settings back to registry format
      const regSettings = settings.map(s => {
        const uriParts = s.omaUri.split('/');
        const valueName = uriParts[uriParts.length - 1];
        const keyPath = uriParts.slice(4, -1).join('\\');
        const hive = `HKEY_${uriParts[3]}`.replace('HKLM', 'LOCAL_MACHINE')
          .replace('HKCU', 'CURRENT_USER')
          .replace('HKCR', 'CLASSES_ROOT')
          .replace('HKU', 'USERS')
          .replace('HKCC', 'CURRENT_CONFIG');

        return {
          hive,
          keyPath,
          valueName,
          valueType: 'String', // Default, could be enhanced
          value: s.value
        };
      });

      const policy = policies.find(p => p.id === policyId);
      intuneRegistryService.downloadRegFile(
        regSettings,
        `${policy?.displayName || 'policy'}-export.reg`
      );
      
      onSuccess('Registry settings exported');
    } catch (error) {
      console.error('Error exporting settings:', error);
      onError('Failed to export registry settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render policies list
   */
  const renderPoliciesList = () => {
    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Policy
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import .REG File
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPolicies}
          >
            Refresh
          </Button>
        </Box>

        {policies.length === 0 ? (
          <Alert severity="info">
            No custom registry policies found. Create one or import a .reg file to get started.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {policies.map(policy => (
              <Grid item xs={12} md={6} lg={4} key={policy.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 1 }}>
                      <SettingsIcon color="primary" />
                      <Chip 
                        label={`${policy.omaSettings?.length || 0} settings`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {policy.displayName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {policy.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => loadPolicySettings(policy.id)}
                      >
                        View Settings
                      </Button>
                      <Tooltip title="Export to .reg file">
                        <IconButton
                          size="small"
                          onClick={() => handleExportToRegFile(policy.id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  /**
   * Render policy settings viewer
   */
  const renderSettingsViewer = () => {
    if (!selectedPolicy) {
      return (
        <Alert severity="info">
          Select a policy from the Policies tab to view its settings
        </Alert>
      );
    }

    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Policy Settings ({policySettings.length})
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportToRegFile(selectedPolicy)}
          >
            Export to .REG
          </Button>
        </Box>

        {policySettings.length === 0 ? (
          <Alert severity="warning">
            This policy has no OMA-URI settings
          </Alert>
        ) : (
          policySettings.map((setting, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <CodeIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">
                      {setting.displayName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {setting.omaUri}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Description:</strong> {setting.description || 'None'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>OMA-URI:</strong> <code>{setting.omaUri}</code>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Value:</strong> <code>{setting.value}</code>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Type:</strong> {setting['@odata.type']}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    );
  };

  /**
   * Render create policy dialog
   */
  const renderCreateDialog = () => {
    return (
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Registry Policy</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Policy Name"
              fullWidth
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              label="Policy Description"
              fullWidth
              multiline
              rows={2}
              value={policyDescription}
              onChange={(e) => setPolicyDescription(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Registry Settings ({registrySettings.length})
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddSettingDialogOpen(true)}
              >
                Add Setting
              </Button>
            </Box>

            {registrySettings.length === 0 ? (
              <Alert severity="info">
                No registry settings added yet. Click "Add Setting" to begin.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Path</TableCell>
                      <TableCell>Value Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrySettings.map((setting, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {setting.hive}\\{setting.keyPath}
                          </Typography>
                        </TableCell>
                        <TableCell>{setting.valueName}</TableCell>
                        <TableCell>
                          <Chip label={setting.valueType} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {String(setting.value).substring(0, 20)}
                            {String(setting.value).length > 20 ? '...' : ''}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveSetting(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePolicy}
            disabled={!policyName || registrySettings.length === 0}
          >
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  /**
   * Render add setting dialog
   */
  const renderAddSettingDialog = () => {
    return (
      <Dialog
        open={addSettingDialogOpen}
        onClose={() => setAddSettingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Registry Setting</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              select
              label="Registry Hive"
              fullWidth
              value={currentSetting.hive}
              onChange={(e) => setCurrentSetting({ ...currentSetting, hive: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(intuneRegistryService.constructor.HIVES).map(([key, value]) => (
                <MenuItem key={key} value={value}>{value}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Key Path"
              fullWidth
              value={currentSetting.keyPath}
              onChange={(e) => setCurrentSetting({ ...currentSetting, keyPath: e.target.value })}
              placeholder="SOFTWARE\Policies\Microsoft\Windows"
              helperText="Path without the hive (e.g., SOFTWARE\Policies\...)"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Value Name"
              fullWidth
              value={currentSetting.valueName}
              onChange={(e) => setCurrentSetting({ ...currentSetting, valueName: e.target.value })}
              placeholder="DisableAutoPlay"
              sx={{ mb: 2 }}
            />

            <TextField
              select
              label="Value Type"
              fullWidth
              value={currentSetting.valueType}
              onChange={(e) => setCurrentSetting({ ...currentSetting, valueType: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(intuneRegistryService.constructor.VALUE_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={value}>{value}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Value"
              fullWidth
              value={currentSetting.value}
              onChange={(e) => setCurrentSetting({ ...currentSetting, value: e.target.value })}
              placeholder={currentSetting.valueType === 'String' ? 'Text value' : 'Numeric value'}
              helperText={
                currentSetting.valueType === 'Dword' ? 'Enter decimal number (e.g., 1)' :
                currentSetting.valueType === 'Binary' ? 'Enter hex string (e.g., 01AF)' :
                'Enter the value'
              }
              sx={{ mb: 2 }}
            />

            <TextField
              label="Display Name (Optional)"
              fullWidth
              value={currentSetting.displayName}
              onChange={(e) => setCurrentSetting({ ...currentSetting, displayName: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={2}
              value={currentSetting.description}
              onChange={(e) => setCurrentSetting({ ...currentSetting, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSettingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSetting}>
            Add Setting
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
        <DialogTitle>Import .REG File</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Import a Windows Registry (.reg) file to create an Intune policy with all registry settings.
            </Alert>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 2, py: 2 }}
            >
              <UploadIcon sx={{ mr: 1 }} />
              {importFile ? importFile.name : 'Select .REG File'}
              <input
                type="file"
                accept=".reg"
                hidden
                onChange={(e) => setImportFile(e.target.files[0])}
              />
            </Button>

            <TextField
              label="Policy Name"
              fullWidth
              value={importPolicyName}
              onChange={(e) => setImportPolicyName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              label="Policy Description"
              fullWidth
              multiline
              rows={3}
              value={importPolicyDescription}
              onChange={(e) => setImportPolicyDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImportRegFile}
            disabled={!importFile || !importPolicyName}
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
        <Typography variant="h5">Registry Settings Tool</Typography>
        <Typography variant="body2" color="textSecondary">
          Create and manage Windows Registry-based configuration policies
        </Typography>
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Policies" />
          <Tab label="Settings Viewer" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper sx={{ p: 2 }}>
        {activeTab === 0 && renderPoliciesList()}
        {activeTab === 1 && renderSettingsViewer()}
      </Paper>

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderAddSettingDialog()}
      {renderImportDialog()}
    </Box>
  );
}
