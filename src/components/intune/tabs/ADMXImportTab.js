import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import admxImportService from '../../../services/intune/admxImportService';

const ADMXImportTab = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: File upload
  const [admxFile, setAdmxFile] = useState(null);
  const [admlFile, setAdmlFile] = useState(null);
  const [admxContent, setAdmxContent] = useState(null);
  const [admlContent, setAdmlContent] = useState(null);

  // Step 2: Parse & preview
  const [admxData, setAdmxData] = useState(null);
  const [admlStrings, setAdmlStrings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedPolicies, setSelectedPolicies] = useState([]);

  // Step 3: Import configuration
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');

  // Step 4: Results
  const [importResult, setImportResult] = useState(null);

  // Handle ADMX file upload
  const handleADMXUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.admx')) {
      onError('Please select an ADMX file (.admx extension)');
      return;
    }

    setAdmxFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAdmxContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Handle ADML file upload
  const handleADMLUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.adml')) {
      onError('Please select an ADML file (.adml extension)');
      return;
    }

    setAdmlFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAdmlContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Parse files
  const handleParse = () => {
    if (!admxContent) {
      onError('Please upload an ADMX file first');
      return;
    }

    setLoading(true);
    try {
      // Validate ADMX
      const validation = admxImportService.validateADMX(admxContent);
      if (!validation.valid) {
        onError(`Invalid ADMX file: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Parse ADMX
      const parsedAdmx = admxImportService.parseADMX(admxContent);
      setAdmxData(parsedAdmx);

      // Parse ADML if provided
      let parsedAdml = {};
      if (admlContent) {
        parsedAdml = admxImportService.parseADML(admlContent);
      }
      setAdmlStrings(parsedAdml);

      // Generate summary
      const policySummary = admxImportService.extractSummary(parsedAdmx, parsedAdml);
      setSummary(policySummary);

      // Select all policies by default
      setSelectedPolicies(parsedAdmx.policies.map(p => p.name));

      // Generate default policy name
      if (admxFile) {
        setPolicyName(`Imported - ${admxFile.name.replace('.admx', '')}`);
      }

      onSuccess('ADMX file parsed successfully');
      setActiveStep(1);
    } catch (error) {
      console.error('Parse error:', error);
      onError(`Failed to parse ADMX: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle policy selection
  const handlePolicyToggle = (policyName) => {
    setSelectedPolicies(prev =>
      prev.includes(policyName)
        ? prev.filter(p => p !== policyName)
        : [...prev, policyName]
    );
  };

  const handleSelectAll = () => {
    setSelectedPolicies(admxData.policies.map(p => p.name));
  };

  const handleClearAll = () => {
    setSelectedPolicies([]);
  };

  // Import to Intune
  const handleImport = async () => {
    if (selectedPolicies.length === 0) {
      onError('Please select at least one policy to import');
      return;
    }

    if (!policyName.trim()) {
      onError('Please enter a policy name');
      return;
    }

    setLoading(true);
    try {
      const result = await admxImportService.importToIntune(
        admxData,
        admlStrings,
        selectedPolicies,
        policyName,
        {
          description: policyDescription
        }
      );

      setImportResult(result);
      onSuccess(`Successfully imported policy: ${policyName}`);
      setActiveStep(3);
    } catch (error) {
      console.error('Import error:', error);
      onError(`Failed to import to Intune: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setActiveStep(0);
    setAdmxFile(null);
    setAdmlFile(null);
    setAdmxContent(null);
    setAdmlContent(null);
    setAdmxData(null);
    setAdmlStrings(null);
    setSummary(null);
    setSelectedPolicies([]);
    setPolicyName('');
    setPolicyDescription('');
    setImportResult(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUploadIcon /> ADMX Import Tool
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Import Windows Group Policy ADMX templates into Intune configuration policies
      </Typography>

      <Grid container spacing={3}>
        {/* Wizard Steps */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>Upload ADMX/ADML Files</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Upload the ADMX policy template and optional ADML language file
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <input
                        accept=".admx"
                        style={{ display: 'none' }}
                        id="admx-upload"
                        type="file"
                        onChange={handleADMXUpload}
                      />
                      <label htmlFor="admx-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<UploadIcon />}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          Select ADMX File
                        </Button>
                      </label>
                      {admxFile && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <strong>{admxFile.name}</strong> loaded
                        </Alert>
                      )}

                      <input
                        accept=".adml"
                        style={{ display: 'none' }}
                        id="adml-upload"
                        type="file"
                        onChange={handleADMLUpload}
                      />
                      <label htmlFor="adml-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<UploadIcon />}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          Select ADML File (Optional)
                        </Button>
                      </label>
                      {admlFile && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <strong>{admlFile.name}</strong> loaded
                        </Alert>
                      )}

                      <Button
                        variant="contained"
                        onClick={handleParse}
                        disabled={!admxFile || loading}
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        Parse Files
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Select Policies</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Choose which policies to import into Intune
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setActiveStep(2)}
                        disabled={selectedPolicies.length === 0}
                        fullWidth
                      >
                        Continue to Import ({selectedPolicies.length} selected)
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Configure & Import</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Set policy name and import to Intune
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Policy Name"
                        value={policyName}
                        onChange={(e) => setPolicyName(e.target.value)}
                        sx={{ mb: 2 }}
                        required
                      />
                      <TextField
                        fullWidth
                        label="Description (Optional)"
                        value={policyDescription}
                        onChange={(e) => setPolicyDescription(e.target.value)}
                        multiline
                        rows={2}
                        sx={{ mb: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={loading || !policyName.trim()}
                        fullWidth
                        color="primary"
                      >
                        {loading ? 'Importing...' : 'Import to Intune'}
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Complete</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Import complete! Start a new import if needed.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleReset}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Import Another ADMX
                    </Button>
                  </StepContent>
                </Step>
              </Stepper>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Content Panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {activeStep === 0 && !admxData && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InfoIcon /> About ADMX Import
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    ADMX files are Windows Group Policy Administrative Templates used to configure Windows settings.
                    This tool converts ADMX policies into Intune configuration policies.
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>What you need:</strong>
                  </Typography>
                  <ul style={{ marginTop: 8 }}>
                    <li>
                      <Typography variant="body2" color="textSecondary">
                        <strong>ADMX file</strong> (.admx) - Contains policy definitions and settings
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" color="textSecondary">
                        <strong>ADML file</strong> (.adml) - Optional, contains display names and descriptions
                      </Typography>
                    </li>
                  </ul>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Where to find ADMX files:</strong>
                  </Typography>
                  <ul style={{ marginTop: 8 }}>
                    <li>
                      <Typography variant="body2" color="textSecondary">
                        C:\Windows\PolicyDefinitions\ (on Windows machines)
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" color="textSecondary">
                        Microsoft Download Center (Office, Edge, etc.)
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" color="textSecondary">
                        Vendor websites (third-party applications)
                      </Typography>
                    </li>
                  </ul>
                </>
              )}

              {activeStep === 1 && summary && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PreviewIcon /> Policy Summary
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                        <Typography variant="h4">{summary.totalPolicies}</Typography>
                        <Typography variant="caption">Total Policies</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                        <Typography variant="h4">{summary.machinePolicies}</Typography>
                        <Typography variant="caption">Machine</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                        <Typography variant="h4">{summary.userPolicies}</Typography>
                        <Typography variant="caption">User</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
                        <Typography variant="h4">{summary.policiesWithElements}</Typography>
                        <Typography variant="caption">Configurable</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      <strong>Select Policies to Import</strong>
                    </Typography>
                    <Box>
                      <Button size="small" onClick={handleSelectAll}>All</Button>
                      <Button size="small" onClick={handleClearAll}>Clear</Button>
                    </Box>
                  </Box>

                  <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox"></TableCell>
                          <TableCell><strong>Policy Name</strong></TableCell>
                          <TableCell><strong>Class</strong></TableCell>
                          <TableCell><strong>Elements</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {admxData.policies.map((policy) => {
                          const displayName = admlStrings[policy.displayName] || policy.displayName || policy.name;
                          return (
                            <TableRow
                              key={policy.name}
                              hover
                              onClick={() => handlePolicyToggle(policy.name)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedPolicies.includes(policy.name)}
                                  onChange={() => handlePolicyToggle(policy.name)}
                                />
                              </TableCell>
                              <TableCell>{displayName}</TableCell>
                              <TableCell>
                                <Chip
                                  label={policy.class || 'Both'}
                                  size="small"
                                  color={policy.class === 'Machine' ? 'primary' : 'secondary'}
                                />
                              </TableCell>
                              <TableCell>{policy.elements.length}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    {selectedPolicies.length} of {admxData.policies.length} policies selected
                  </Typography>
                </>
              )}

              {activeStep === 3 && importResult && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SuccessIcon color="success" /> Import Complete
                  </Typography>

                  <Alert severity="success" sx={{ mb: 3 }}>
                    Policy has been successfully created in Intune!
                  </Alert>

                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>Policy Details:</strong>
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Policy ID
                        </Typography>
                        <Typography variant="body2">
                          {importResult.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Name
                        </Typography>
                        <Typography variant="body2">
                          {importResult.name}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">
                          Description
                        </Typography>
                        <Typography variant="body2">
                          {importResult.description || 'No description'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    You can now assign this policy to groups in the Intune portal or the Policies tab.
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ADMXImportTab;
