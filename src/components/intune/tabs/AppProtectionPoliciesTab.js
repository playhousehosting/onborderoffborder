import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  FileCopy as CloneIcon,
  Apple as AppleIcon,
  Android as AndroidIcon,
  Computer as WindowsIcon,
  Assignment as AssignmentIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import intuneAppProtectionService from '../../../services/intune/intuneAppProtectionService';

function AppProtectionPoliciesTab() {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState({ ios: [], android: [], windows: [] });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('ios');
  const [templateLevel, setTemplateLevel] = useState('standard');

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allPolicies = await intuneAppProtectionService.getAllAppProtectionPolicies();
      setPolicies(allPolicies);
    } catch (err) {
      console.error('Failed to load app protection policies:', err);
      setError(err.message || 'Failed to load app protection policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    try {
      const templates = intuneAppProtectionService.getPolicyTemplates(selectedPlatform);
      const template = templates[templateLevel];

      if (!template) {
        throw new Error('Template not found');
      }

      let createdPolicy;
      if (selectedPlatform === 'ios') {
        createdPolicy = await intuneAppProtectionService.createIOSAppProtectionPolicy(template);
      } else if (selectedPlatform === 'android') {
        createdPolicy = await intuneAppProtectionService.createAndroidAppProtectionPolicy(template);
      }

      setCreateDialogOpen(false);
      await loadPolicies();
      setError(null);
      
      // Show success message
      alert(`Successfully created ${selectedPlatform.toUpperCase()} app protection policy: ${template.displayName}`);
    } catch (err) {
      console.error('Failed to create policy:', err);
      setError(err.message || 'Failed to create app protection policy');
    }
  };

  const handleDeletePolicy = async (policyId, platform) => {
    if (!window.confirm('Are you sure you want to delete this app protection policy?')) {
      return;
    }

    try {
      await intuneAppProtectionService.deleteAppProtectionPolicy(policyId, platform);
      await loadPolicies();
      setError(null);
      alert('App protection policy deleted successfully');
    } catch (err) {
      console.error('Failed to delete policy:', err);
      setError(err.message || 'Failed to delete app protection policy');
    }
  };

  const handleViewDetails = async (policy, platform) => {
    setSelectedPolicy({ ...policy, platform });
    setDetailDialogOpen(true);
  };

  const handleDownloadPolicy = (policy, platform) => {
    intuneAppProtectionService.downloadPolicyJSON(policy, platform);
  };

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return <AppleIcon />;
      case 'android':
        return <AndroidIcon />;
      case 'windows':
        return <WindowsIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return '#000000';
      case 'android':
        return '#3DDC84';
      case 'windows':
        return '#0078D4';
      default:
        return '#666666';
    }
  };

  const renderPolicyCard = (policy, platform) => {
    const settings = intuneAppProtectionService.extractPolicySettings(policy, platform);
    
    return (
      <Card key={policy.id} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: getPlatformColor(platform) }}>
                {getPlatformIcon(platform)}
              </Box>
              <Box>
                <Typography variant="h6">{policy.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {policy.description || 'No description'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="View Details">
                <IconButton size="small" onClick={() => handleViewDetails(policy, platform)}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download Configuration">
                <IconButton size="small" onClick={() => handleDownloadPolicy(policy, platform)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Policy">
                <IconButton size="small" color="error" onClick={() => handleDeletePolicy(policy.id, platform)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Data Protection</Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {settings.dataProtection?.preventBackup ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="Backup Prevention" secondary={settings.dataProtection?.preventBackup ? 'Enabled' : 'Disabled'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {settings.dataProtection?.encryptAppData ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText primary="App Data Encryption" secondary={settings.dataProtection?.encryptAppData ? 'Enabled' : 'Disabled'} />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Access Requirements</Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {settings.accessRequirements?.pinRequired ? <CheckIcon color="success" /> : <CloseIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText 
                    primary="PIN Required" 
                    secondary={settings.accessRequirements?.pinRequired 
                      ? `${settings.accessRequirements.pinType} (${settings.accessRequirements.minimumPinLength} chars)`
                      : 'Not required'
                    } 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Offline Grace Period" 
                    secondary={settings.accessRequirements?.offlineGracePeriod || 'Not set'} 
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Data Transfer</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Inbound: ${settings.dataTransfer?.allowedDataIngress || 'N/A'}`} 
                  size="small" 
                  variant="outlined"
                />
                <Chip 
                  label={`Outbound: ${settings.dataTransfer?.allowedDataEgress || 'N/A'}`} 
                  size="small" 
                  variant="outlined"
                />
                <Chip 
                  label={`Clipboard: ${settings.dataTransfer?.allowedClipboardSharing || 'N/A'}`} 
                  size="small" 
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Created: {policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'Unknown'} • 
              Modified: {policy.lastModifiedDateTime ? new Date(policy.lastModifiedDateTime).toLocaleDateString() : 'Unknown'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderPoliciesList = (platformPolicies, platform) => {
    if (platformPolicies.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No {platform.toUpperCase()} app protection policies found. Create one using templates.
        </Alert>
      );
    }

    return (
      <Box>
        {platformPolicies.map(policy => renderPolicyCard(policy, platform))}
      </Box>
    );
  };

  const renderDetailDialog = () => {
    if (!selectedPolicy) return null;

    const settings = intuneAppProtectionService.extractPolicySettings(
      selectedPolicy,
      selectedPolicy.platform
    );

    return (
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ color: getPlatformColor(selectedPolicy.platform) }}>
              {getPlatformIcon(selectedPolicy.platform)}
            </Box>
            {selectedPolicy.displayName}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {selectedPolicy.description || 'No description'}
          </Typography>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Data Protection Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Prevent Backup:</strong> {settings.dataProtection?.preventBackup ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Encrypt App Data:</strong> {settings.dataProtection?.encryptAppData ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Min OS Version:</strong> {settings.dataProtection?.minimumRequiredOSVersion || 'Not set'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Warning OS Version:</strong> {settings.dataProtection?.minimumWarningOSVersion || 'Not set'}</Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Access Requirements</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>PIN Required:</strong> {settings.accessRequirements?.pinRequired ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>PIN Type:</strong> {settings.accessRequirements?.pinType || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Min PIN Length:</strong> {settings.accessRequirements?.minimumPinLength || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Max PIN Retries:</strong> {settings.accessRequirements?.maxPinRetries || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Offline Grace Period:</strong> {settings.accessRequirements?.offlineGracePeriod || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Offline Wipe Period:</strong> {settings.accessRequirements?.offlineWipeGracePeriod || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Data Transfer Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Allowed Data Ingress:</strong> {settings.dataTransfer?.allowedDataIngress || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Allowed Data Egress:</strong> {settings.dataTransfer?.allowedDataEgress || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Clipboard Sharing:</strong> {settings.dataTransfer?.allowedClipboardSharing || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Conditional Launch</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Max Device Threat Level:</strong> {settings.conditionalLaunch?.maxAllowedDeviceThreatLevel || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Device Compliance Required:</strong> {settings.conditionalLaunch?.disableAppIfJailbroken ? 'Yes' : 'No'}</Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadPolicy(selectedPolicy, selectedPolicy.platform)}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon /> App Protection Policies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Mobile Application Management (MAM) policies for iOS, Android, and Windows
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Policies">
            <IconButton onClick={loadPolicies} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setCreateDialogOpen(true)}
            disabled={loading}
          >
            Create from Template
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #00000015 0%, #00000005 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AppleIcon sx={{ mr: 1, color: '#000000' }} />
                <Typography variant="body2" color="text.secondary">iOS Policies</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {policies.ios.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #3DDC8415 0%, #3DDC8405 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AndroidIcon sx={{ mr: 1, color: '#3DDC84' }} />
                <Typography variant="body2" color="text.secondary">Android Policies</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {policies.android.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #0078D415 0%, #0078D405 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WindowsIcon sx={{ mr: 1, color: '#0078D4' }} />
                <Typography variant="body2" color="text.secondary">Windows Policies</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {policies.windows.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d215 0%, #1976d205 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SecurityIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="body2" color="text.secondary">Total Policies</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {policies.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Platform Tabs */}
      {!loading && (
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab icon={<AppleIcon />} label="iOS" />
            <Tab icon={<AndroidIcon />} label="Android" />
            <Tab icon={<WindowsIcon />} label="Windows" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            {activeTab === 0 && renderPoliciesList(policies.ios, 'ios')}
            {activeTab === 1 && renderPoliciesList(policies.android, 'android')}
            {activeTab === 2 && renderPoliciesList(policies.windows, 'windows')}
          </Box>
        </Paper>
      )}

      {/* Create from Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create App Protection Policy from Template</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              label="Platform"
            >
              <MenuItem value="ios">iOS</MenuItem>
              <MenuItem value="android">Android</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Security Level</InputLabel>
            <Select
              value={templateLevel}
              onChange={(e) => setTemplateLevel(e.target.value)}
              label="Security Level"
            >
              <MenuItem value="basic">Basic - Minimal restrictions</MenuItem>
              <MenuItem value="standard">Standard - Balanced security</MenuItem>
              <MenuItem value="strict">Strict - Maximum security</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info">
            Templates provide pre-configured policies based on industry best practices. 
            You can modify them after creation to meet your specific requirements.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateFromTemplate}>
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Policy Detail Dialog */}
      {renderDetailDialog()}
    </Box>
  );
}

export default AppProtectionPoliciesTab;
