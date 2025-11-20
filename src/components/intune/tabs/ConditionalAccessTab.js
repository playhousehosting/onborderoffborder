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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
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
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Block as BlockIcon,
  VpnKey as MFAIcon,
  Devices as DeviceIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import intuneConditionalAccessService from '../../../services/intune/intuneConditionalAccessService';

function ConditionalAccessTab() {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [namedLocations, setNamedLocations] = useState([]);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('mfaAllUsers');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [policiesData, locationsData] = await Promise.all([
        intuneConditionalAccessService.getConditionalAccessPolicies(),
        intuneConditionalAccessService.getNamedLocations().catch(() => [])
      ]);
      
      setPolicies(policiesData);
      setNamedLocations(locationsData);
    } catch (err) {
      console.error('Failed to load conditional access data:', err);
      setError(err.message || 'Failed to load conditional access policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    try {
      const templates = intuneConditionalAccessService.getPolicyTemplates();
      const template = templates[selectedTemplate];

      if (!template) {
        throw new Error('Template not found');
      }

      const validation = intuneConditionalAccessService.validatePolicy(template);
      if (!validation.isValid) {
        throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
      }

      await intuneConditionalAccessService.createConditionalAccessPolicy(template);
      setCreateDialogOpen(false);
      await loadData();
      setError(null);
      
      alert(`Successfully created conditional access policy: ${template.displayName}`);
    } catch (err) {
      console.error('Failed to create policy:', err);
      setError(err.message || 'Failed to create conditional access policy');
    }
  };

  const handleTogglePolicy = async (policy) => {
    try {
      const newState = policy.state === 'enabled' ? 'disabled' : 'enabled';
      
      if (newState === 'enabled') {
        const impact = intuneConditionalAccessService.getPolicyImpact(policy);
        if (!window.confirm(`Enable policy "${policy.displayName}"?\n\nImpact: ${impact.scope} - ${impact.affectedUsers}\nAction: ${impact.action}\n\nThis will take effect immediately.`)) {
          return;
        }
      }

      await intuneConditionalAccessService.updateConditionalAccessPolicy(policy.id, {
        state: newState
      });
      
      await loadData();
      setError(null);
    } catch (err) {
      console.error('Failed to toggle policy:', err);
      setError(err.message || 'Failed to update policy state');
    }
  };

  const handleDeletePolicy = async (policyId, displayName) => {
    if (!window.confirm(`Are you sure you want to delete the policy "${displayName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await intuneConditionalAccessService.deleteConditionalAccessPolicy(policyId);
      await loadData();
      setError(null);
      alert('Conditional access policy deleted successfully');
    } catch (err) {
      console.error('Failed to delete policy:', err);
      setError(err.message || 'Failed to delete conditional access policy');
    }
  };

  const handleViewDetails = (policy) => {
    setSelectedPolicy(policy);
    setDetailDialogOpen(true);
  };

  const handleDownloadPolicy = (policy) => {
    intuneConditionalAccessService.downloadPolicyJSON(policy);
  };

  const getStateChip = (state) => {
    if (state === 'enabled') {
      return <Chip icon={<EnabledIcon />} label="Enabled" color="success" size="small" />;
    } else if (state === 'disabled') {
      return <Chip icon={<DisabledIcon />} label="Disabled" color="default" size="small" />;
    } else {
      return <Chip label={state} size="small" />;
    }
  };

  const getImpactChip = (severity) => {
    if (severity === 'High') {
      return <Chip label="High Impact" color="error" size="small" />;
    } else if (severity === 'Medium') {
      return <Chip label="Medium Impact" color="warning" size="small" />;
    } else {
      return <Chip label="Low Impact" color="success" size="small" />;
    }
  };

  const renderPolicyCard = (policy) => {
    const analysis = intuneConditionalAccessService.analyzePolicyConditions(policy);
    const impact = intuneConditionalAccessService.getPolicyImpact(policy);

    return (
      <Card key={policy.id} variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{policy.displayName}</Typography>
                {getStateChip(policy.state)}
                {getImpactChip(impact.severity)}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {policy.description || 'No description'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={policy.state === 'enabled' ? 'Disable Policy' : 'Enable Policy'}>
                <Switch 
                  checked={policy.state === 'enabled'}
                  onChange={() => handleTogglePolicy(policy)}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="View Details">
                <IconButton size="small" onClick={() => handleViewDetails(policy)}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download Configuration">
                <IconButton size="small" onClick={() => handleDownloadPolicy(policy)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Policy">
                <IconButton size="small" color="error" onClick={() => handleDeletePolicy(policy.id, policy.displayName)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Conditions</Typography>
              <List dense>
                {analysis.userConditions.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Users" 
                      secondary={analysis.userConditions.join(', ')} 
                    />
                  </ListItem>
                )}
                {analysis.appConditions.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Applications" 
                      secondary={analysis.appConditions.join(', ')} 
                    />
                  </ListItem>
                )}
                {analysis.deviceConditions.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Devices" 
                      secondary={analysis.deviceConditions.join(', ')} 
                    />
                  </ListItem>
                )}
                {analysis.locationConditions.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Locations" 
                      secondary={analysis.locationConditions.join(', ')} 
                    />
                  </ListItem>
                )}
                {analysis.riskConditions.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Risk Levels" 
                      secondary={analysis.riskConditions.join(', ')} 
                    />
                  </ListItem>
                )}
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Controls</Typography>
              <List dense>
                {analysis.grantControls.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Grant Controls" 
                      secondary={analysis.grantControls.join(', ')} 
                    />
                  </ListItem>
                )}
                {analysis.sessionControls.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Session Controls" 
                      secondary={analysis.sessionControls.join(', ')} 
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Scope: {impact.scope} • Affected Users: {impact.affectedUsers} • Action: {impact.action}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderDetailDialog = () => {
    if (!selectedPolicy) return null;

    const analysis = intuneConditionalAccessService.analyzePolicyConditions(selectedPolicy);
    const impact = intuneConditionalAccessService.getPolicyImpact(selectedPolicy);
    const validation = intuneConditionalAccessService.validatePolicy(selectedPolicy);

    return (
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              {selectedPolicy.displayName}
            </Box>
            {getStateChip(selectedPolicy.state)}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Impact Summary */}
          <Alert severity={impact.severity === 'High' ? 'error' : impact.severity === 'Medium' ? 'warning' : 'info'} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Policy Impact</Typography>
            <Typography variant="body2">
              <strong>Scope:</strong> {impact.scope} • 
              <strong> Affected Users:</strong> {impact.affectedUsers} • 
              <strong> Action:</strong> {impact.action}
            </Typography>
          </Alert>

          {/* Validation Warnings */}
          {validation.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Warnings</Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.warnings.map((warning, index) => (
                  <li key={index}><Typography variant="body2">{warning}</Typography></li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Conditions */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Conditions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {analysis.userConditions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Users:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analysis.userConditions.join(', ')}
                    </Typography>
                  </Grid>
                )}
                {analysis.appConditions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Applications:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analysis.appConditions.join(', ')}
                    </Typography>
                  </Grid>
                )}
                {analysis.deviceConditions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Devices/Platforms:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analysis.deviceConditions.join(', ')}
                    </Typography>
                  </Grid>
                )}
                {analysis.locationConditions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Locations:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analysis.locationConditions.join(', ')}
                    </Typography>
                  </Grid>
                )}
                {analysis.riskConditions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>Risk Conditions:</strong></Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analysis.riskConditions.join(', ')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Grant Controls */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Grant Controls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.grantControls.length > 0 ? (
                <List dense>
                  {analysis.grantControls.map((control, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={control} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No grant controls configured</Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Session Controls */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Session Controls</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.sessionControls.length > 0 ? (
                <List dense>
                  {analysis.sessionControls.map((control, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={control} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No session controls configured</Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Raw Policy JSON */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Raw Policy JSON</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', maxHeight: 300 }}>
                <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                  {JSON.stringify(selectedPolicy, null, 2)}
                </pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadPolicy(selectedPolicy)}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const getTemplateDescription = (templateKey) => {
    const descriptions = {
      mfaAllUsers: 'Require multi-factor authentication for all users accessing cloud apps',
      blockLegacyAuth: 'Block legacy authentication protocols (e.g., Exchange ActiveSync)',
      requireCompliantDevice: 'Require compliant or hybrid Azure AD joined devices for Windows/macOS',
      blockHighRisk: 'Block sign-ins identified as high risk by Azure AD Identity Protection',
      adminMFA: 'Require MFA specifically for administrator accounts',
      untrustedLocation: 'Require MFA when accessing from untrusted network locations'
    };
    return descriptions[templateKey] || 'No description available';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon /> Conditional Access
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zero Trust security policies for access control and risk-based authentication
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Policies">
            <IconButton onClick={loadData} disabled={loading} color="primary">
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
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Total Policies</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {policies.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2e7d3215 0%, #2e7d3205 100%)' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Enabled</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                {policies.filter(p => p.state === 'enabled').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ed6c0215 0%, #ed6c0205 100%)' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Disabled</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                {policies.filter(p => p.state === 'disabled').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Named Locations</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {namedLocations.length}
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

      {/* Policies List */}
      {!loading && (
        <Box>
          {policies.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Conditional Access Policies
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create policies from templates to implement Zero Trust security
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                Create Policy
              </Button>
            </Paper>
          ) : (
            policies.map(policy => renderPolicyCard(policy))
          )}
        </Box>
      )}

      {/* Create from Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Conditional Access Policy from Template</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Template</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              label="Template"
            >
              <MenuItem value="mfaAllUsers">Require MFA for All Users</MenuItem>
              <MenuItem value="blockLegacyAuth">Block Legacy Authentication</MenuItem>
              <MenuItem value="requireCompliantDevice">Require Compliant Device</MenuItem>
              <MenuItem value="blockHighRisk">Block High Risk Sign-ins</MenuItem>
              <MenuItem value="adminMFA">Require MFA for Administrators</MenuItem>
              <MenuItem value="untrustedLocation">Require MFA from Untrusted Locations</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Selected Template:</strong>
            </Typography>
            <Typography variant="body2">
              {getTemplateDescription(selectedTemplate)}
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mt: 2 }}>
            Policy will be created in <strong>disabled</strong> state. Enable it after reviewing configuration.
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

export default ConditionalAccessTab;
