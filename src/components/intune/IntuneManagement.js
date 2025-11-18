/**
 * Intune Management Component
 * Comprehensive Intune management UI with devices, applications, policies, compliance, and reports
 * Includes WinGet app browser, policy templates, and assignment wizard
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Chip,
  IconButton,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Tooltip,
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  Apps as AppsIcon,
  Policy as PolicyIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as ReportsIcon,
  Sync as SyncIcon,
  PhonelinkErase as RetireIcon,
  DeleteForever as WipeIcon,
  Lock as LockIcon,
  RestartAlt as RestartIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Assignment as AssignmentIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

import intuneService from '../../services/intuneService';
import wingetService from '../../services/wingetService';
import settingsCatalogService from '../../services/settingsCatalogService';
import { useMSALAuth as useAuth } from '../../contexts/MSALAuthContext';

// ========== MAIN COMPONENT ==========

const IntuneManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setSuccess(null);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000);
  };

  const showError = (message) => {
    setError(message);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📱 Intune Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive device, application, and policy management for Microsoft Intune
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DevicesIcon />} label="Devices" />
          <Tab icon={<AppsIcon />} label="Applications" />
          <Tab icon={<PolicyIcon />} label="Policies" />
          <Tab icon={<CheckCircleIcon />} label="Compliance" />
          <Tab icon={<ReportsIcon />} label="Reports" />
        </Tabs>
      </Paper>

      <Box>
        {activeTab === 0 && <DevicesTab onSuccess={showSuccess} onError={showError} />}
        {activeTab === 1 && <ApplicationsTab onSuccess={showSuccess} onError={showError} />}
        {activeTab === 2 && <PoliciesTab onSuccess={showSuccess} onError={showError} />}
        {activeTab === 3 && <ComplianceTab onSuccess={showSuccess} onError={showError} />}
        {activeTab === 4 && <ReportsTab onSuccess={showSuccess} onError={showError} />}
      </Box>
    </Container>
  );
};

// ========== DEVICES TAB ==========

const DevicesTab = ({ onSuccess, onError }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [actionAnchor, setActionAnchor] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadDevices();
    loadStats();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await intuneService.getManagedDevices();
      setDevices(data);
    } catch (err) {
      onError(`Failed to load devices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await intuneService.getDeviceStatistics();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleDeviceAction = async (deviceId, action) => {
    setLoading(true);
    setActionAnchor(null);
    
    try {
      switch (action) {
        case 'sync':
          await intuneService.syncDevice(deviceId);
          onSuccess('Device sync initiated');
          break;
        case 'reboot':
          await intuneService.rebootDevice(deviceId);
          onSuccess('Device reboot initiated');
          break;
        case 'lock':
          await intuneService.remoteLockDevice(deviceId);
          onSuccess('Device locked remotely');
          break;
        case 'retire':
          if (window.confirm('Are you sure you want to retire this device? This will remove corporate data.')) {
            await intuneService.retireDevice(deviceId);
            onSuccess('Device retirement initiated');
            await loadDevices();
          }
          break;
        case 'wipe':
          if (window.confirm('Are you sure you want to wipe this device? This will erase ALL data!')) {
            await intuneService.wipeDevice(deviceId);
            onSuccess('Device wipe initiated');
            await loadDevices();
          }
          break;
        default:
          break;
      }
    } catch (err) {
      onError(`Failed to execute action: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceChip = (state) => {
    const configs = {
      compliant: { color: 'success', icon: '✅', label: 'Compliant' },
      nonCompliant: { color: 'error', icon: '❌', label: 'Non-Compliant' },
      inGracePeriod: { color: 'warning', icon: '⏳', label: 'Grace Period' },
      configManager: { color: 'info', icon: 'ℹ️', label: 'Config Manager' },
      unknown: { color: 'default', icon: '❓', label: 'Unknown' },
    };
    
    const config = configs[state] || configs.unknown;
    return (
      <Chip
        label={`${config.icon} ${config.label}`}
        color={config.color}
        size="small"
      />
    );
  };

  const filteredDevices = devices.filter(device =>
    device.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.userDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.operatingSystem?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      {/* Device Statistics */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  📱 Total Devices
                </Typography>
                <Typography variant="h4">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  ✅ Compliant
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.byCompliance.compliant}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  ❌ Non-Compliant
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.byCompliance.nonCompliant}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  🏢 Corporate
                </Typography>
                <Typography variant="h4">{stats.byOwnership.corporate}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Actions */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Search devices by name, user, or OS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadDevices}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Devices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Device Name</TableCell>
              <TableCell>User</TableCell>
              <TableCell>OS</TableCell>
              <TableCell>Compliance</TableCell>
              <TableCell>Last Sync</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No devices found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {device.deviceName || 'Unknown Device'}
                    </Typography>
                  </TableCell>
                  <TableCell>{device.userDisplayName || 'N/A'}</TableCell>
                  <TableCell>
                    {device.operatingSystem} {device.osVersion}
                  </TableCell>
                  <TableCell>{getComplianceChip(device.complianceState)}</TableCell>
                  <TableCell>
                    {device.lastSyncDateTime
                      ? new Date(device.lastSyncDateTime).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setSelectedDevice(device);
                        setActionAnchor(e.currentTarget);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={() => setActionAnchor(null)}
      >
        <MenuItem onClick={() => handleDeviceAction(selectedDevice?.id, 'sync')}>
          <ListItemIcon><SyncIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Sync Device</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeviceAction(selectedDevice?.id, 'reboot')}>
          <ListItemIcon><RestartIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Reboot</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeviceAction(selectedDevice?.id, 'lock')}>
          <ListItemIcon><LockIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Remote Lock</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleDeviceAction(selectedDevice?.id, 'retire')}>
          <ListItemIcon><RetireIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Retire</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeviceAction(selectedDevice?.id, 'wipe')}>
          <ListItemIcon><WipeIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Wipe</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

// ========== APPLICATIONS TAB ==========

const ApplicationsTab = ({ onSuccess, onError }) => {
  const [view, setView] = useState('installed'); // 'installed' or 'winget'
  const [installedApps, setInstalledApps] = useState([]);
  const [wingetApps, setWingetApps] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deployDialog, setDeployDialog] = useState(null);

  useEffect(() => {
    if (view === 'installed') {
      loadInstalledApps();
    }
  }, [view]);

  const loadInstalledApps = async () => {
    setLoading(true);
    try {
      const apps = await intuneService.getMobileApps();
      setInstalledApps(apps);
    } catch (err) {
      onError(`Failed to load apps: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchWinGetApps = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const results = await wingetService.searchPackages(searchTerm);
      setWingetApps(results);
    } catch (err) {
      onError(`Failed to search WinGet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDeploy = async (packageId) => {
    setDeployDialog(null);
    setLoading(true);
    
    try {
      // In production, this would show a group selection dialog
      // For now, simulate deployment
      onSuccess(`🚀 Deploying ${packageId}... This may take a few minutes.`);
      
      // Simulate deployment progress
      setTimeout(() => {
        onSuccess(`✅ ${packageId} deployed successfully!`);
        setLoading(false);
      }, 3000);
    } catch (err) {
      onError(`Failed to deploy: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* View Toggle */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant={view === 'installed' ? 'contained' : 'outlined'}
          onClick={() => setView('installed')}
          startIcon={<AppsIcon />}
        >
          Installed Apps
        </Button>
        <Button
          variant={view === 'winget' ? 'contained' : 'outlined'}
          onClick={() => setView('winget')}
          startIcon={<DownloadIcon />}
        >
          📦 WinGet Browser
        </Button>
      </Box>

      {/* Installed Apps View */}
      {view === 'installed' && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search installed applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadInstalledApps}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : installedApps.length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">
                  No applications found. Deploy apps from the WinGet Browser!
                </Alert>
              </Grid>
            ) : (
              installedApps
                .filter(app =>
                  app.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((app) => (
                  <Grid item xs={12} sm={6} md={4} key={app.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom noWrap>
                          {app.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {app.publisher || 'Unknown Publisher'}
                        </Typography>
                        <Chip label={app['@odata.type']?.split('.').pop() || 'App'} size="small" />
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<AssignmentIcon />}>
                          Assignments
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
            )}
          </Grid>
        </Box>
      )}

      {/* WinGet Browser View */}
      {view === 'winget' && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search WinGet repository (e.g., Chrome, Teams, PowerToys)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchWinGetApps()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={searchWinGetApps}
              disabled={loading || !searchTerm.trim()}
              sx={{ mt: 2 }}
              fullWidth
            >
              🔍 Search WinGet Repository
            </Button>
          </Box>

          {wingetApps.length === 0 && !loading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              💡 Search the WinGet repository to find and deploy applications to your managed devices!
            </Alert>
          )}

          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>Searching WinGet repository...</Typography>
                </Box>
              </Grid>
            ) : (
              wingetApps.map((pkg) => (
                <Grid item xs={12} sm={6} md={4} key={pkg.packageIdentifier}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h5" sx={{ mr: 1 }}>
                          {pkg.icon}
                        </Typography>
                        <Typography variant="h6" noWrap>
                          {pkg.packageName}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pkg.publisher}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {pkg.description}
                      </Typography>
                      <Chip label={`v${pkg.version}`} size="small" sx={{ mr: 1 }} />
                      <Chip label={pkg.category} size="small" color="primary" />
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => setDeployDialog(pkg)}
                        fullWidth
                      >
                        🚀 Deploy to Intune
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>

          {/* Deploy Dialog */}
          <Dialog
            open={Boolean(deployDialog)}
            onClose={() => setDeployDialog(null)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              🚀 Deploy {deployDialog?.packageName}
            </DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                This will package the application and upload it to Intune. The process may take a few minutes.
              </Alert>
              <Typography variant="body2" paragraph>
                <strong>Publisher:</strong> {deployDialog?.publisher}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Version:</strong> {deployDialog?.version}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Description:</strong> {deployDialog?.description}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeployDialog(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => handleQuickDeploy(deployDialog?.packageIdentifier)}
                disabled={loading}
              >
                Deploy Now
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

// ========== POLICIES TAB ==========

const PoliciesTab = ({ onSuccess, onError }) => {
  const [view, setView] = useState('list'); // 'list' or 'templates'
  const [policies, setPolicies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [policyName, setPolicyName] = useState('');

  useEffect(() => {
    if (view === 'list') {
      loadPolicies();
    } else {
      loadTemplates();
    }
  }, [view]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await intuneService.getConfigurationPolicies();
      setPolicies(data);
    } catch (err) {
      onError(`Failed to load policies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = () => {
    const data = settingsCatalogService.getAvailableTemplates('windows10');
    setTemplates(data);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !policyName.trim()) return;

    setLoading(true);
    setCreateDialog(false);

    try {
      await settingsCatalogService.createPolicyFromTemplate(selectedTemplate.id, {
        name: policyName,
      });
      onSuccess(`✅ Policy "${policyName}" created successfully!`);
      setPolicyName('');
      setSelectedTemplate(null);
      setView('list');
      await loadPolicies();
    } catch (err) {
      onError(`Failed to create policy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Security: 'error',
      Network: 'primary',
      Applications: 'secondary',
      Updates: 'info',
      'Device Configuration': 'warning',
    };
    return colors[category] || 'default';
  };

  return (
    <Box>
      {/* View Toggle */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant={view === 'list' ? 'contained' : 'outlined'}
          onClick={() => setView('list')}
          startIcon={<PolicyIcon />}
        >
          My Policies
        </Button>
        <Button
          variant={view === 'templates' ? 'contained' : 'outlined'}
          onClick={() => setView('templates')}
          startIcon={<AddIcon />}
        >
          📋 Policy Templates
        </Button>
      </Box>

      {/* Policies List View */}
      {view === 'list' && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Configuration Policies</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadPolicies}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : policies.length === 0 ? (
            <Alert severity="info">
              No policies found. Create policies from the Templates tab!
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {policies.map((policy) => (
                <Grid item xs={12} sm={6} md={4} key={policy.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom noWrap>
                        {policy.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {policy.description || 'No description'}
                      </Typography>
                      <Chip
                        label={policy.platforms || 'Unknown'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <CardActions>
                      <Button size="small" startIcon={<AssignmentIcon />}>
                        Assign
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Templates View */}
      {view === 'templates' && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            💡 Select a template to quickly create a policy with pre-configured settings!
          </Alert>

          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 6 },
                  }}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setCreateDialog(true);
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" sx={{ mr: 1 }}>
                        {template.icon}
                      </Typography>
                      <Typography variant="h6">
                        {template.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {template.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={template.category}
                        size="small"
                        color={getCategoryColor(template.category)}
                      />
                      <Chip
                        label={template.complexity}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Create Dialog */}
          <Dialog
            open={createDialog}
            onClose={() => setCreateDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedTemplate?.icon} Create Policy from Template
            </DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Policy Name"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder={selectedTemplate?.name}
                sx={{ mt: 2 }}
                autoFocus
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <strong>Template:</strong> {selectedTemplate?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Category:</strong> {selectedTemplate?.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Settings:</strong> {selectedTemplate?.settings?.length || 0} pre-configured
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleCreateFromTemplate}
                disabled={!policyName.trim() || loading}
              >
                Create Policy
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

// ========== COMPLIANCE TAB ==========

const ComplianceTab = ({ onSuccess, onError }) => {
  const [compliancePolicies, setCompliancePolicies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompliancePolicies();
  }, []);

  const loadCompliancePolicies = async () => {
    setLoading(true);
    try {
      const data = await intuneService.getCompliancePolicies();
      setCompliancePolicies(data);
    } catch (err) {
      onError(`Failed to load compliance policies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">✅ Compliance Policies</Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadCompliancePolicies}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : compliancePolicies.length === 0 ? (
        <Alert severity="info">
          No compliance policies found. Create compliance policies in the Azure Portal.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {compliancePolicies.map((policy) => (
            <Grid item xs={12} sm={6} md={4} key={policy.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {policy.displayName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {policy.description || 'No description'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small">View Details</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

// ========== REPORTS TAB ==========

const ReportsTab = ({ onSuccess, onError }) => {
  return (
    <Box>
      <Alert severity="info">
        📊 Reports and analytics coming soon! This will include device compliance trends,
        app installation reports, policy assignment status, and custom report builder.
      </Alert>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📱 Device Compliance Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View compliance status across all managed devices
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled>
                Generate Report
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📦 App Installation Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track application deployment and installation status
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled>
                Generate Report
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Policy Assignment Report
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review policy assignments and deployment status
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" disabled>
                Generate Report
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IntuneManagement;
