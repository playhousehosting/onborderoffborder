import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Checkbox,
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
  IconButton,
  Collapse
} from '@mui/material';
import {
  ContentCopy as CloneIcon,
  Preview as PreviewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import intuneCloneService from '../../../services/intune/intuneCloneService';
import intuneExportService from '../../../services/intune/intuneExportService';

const CloneTab = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Source policy selection
  const [availableTypes] = useState(intuneExportService.getAvailablePolicyTypes());
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [sourcePolicies, setSourcePolicies] = useState([]);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  
  // Transformation configuration
  const [transformMode, setTransformMode] = useState('suffix');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState(' - Copy');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [pattern, setPattern] = useState('{name} - Copy');
  
  // Options
  const [cloneAssignments, setCloneAssignments] = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  
  // Preview and results
  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [cloneResults, setCloneResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Load policies when types selected
  useEffect(() => {
    if (selectedTypes.length > 0) {
      loadPolicies();
    } else {
      setSourcePolicies([]);
      setSelectedPolicies([]);
    }
  }, [selectedTypes]);

  const loadPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const exportData = await intuneExportService.exportPolicies(
        selectedTypes,
        { includeAssignments: false },
        null
      );

      const policies = [];
      selectedTypes.forEach(typeKey => {
        const typePolicies = exportData.policies[typeKey] || [];
        typePolicies.forEach(policy => {
          policies.push({
            ...policy,
            policyType: typeKey
          });
        });
      });

      setSourcePolicies(policies);
    } catch (error) {
      console.error('Error loading policies:', error);
      onError(`Failed to load policies: ${error.message}`);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const handleTypeToggle = (typeKey) => {
    setSelectedTypes(prev => 
      prev.includes(typeKey) 
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  const handlePolicyToggle = (policyId) => {
    setSelectedPolicies(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId)
        : [...prev, policyId]
    );
  };

  const handleSelectAllPolicies = () => {
    setSelectedPolicies(sourcePolicies.map(p => p.id));
  };

  const handleClearAllPolicies = () => {
    setSelectedPolicies([]);
  };

  // Generate preview
  const handlePreview = () => {
    const transformation = getTransformation();
    const validation = intuneCloneService.validateTransformation(transformation);

    if (!validation.valid) {
      onError(validation.errors.join(', '));
      return;
    }

    const policiesToClone = sourcePolicies.filter(p => selectedPolicies.includes(p.id));
    const previewData = intuneCloneService.previewTransformations(policiesToClone, transformation);
    
    setPreview(previewData);
    setShowPreview(true);
  };

  // Get transformation object
  const getTransformation = () => {
    const transformation = {};

    if (transformMode === 'prefix' && prefix) {
      transformation.prefix = prefix;
    } else if (transformMode === 'suffix' && suffix) {
      transformation.suffix = suffix;
    } else if (transformMode === 'findReplace' && findText) {
      transformation.find = findText;
      transformation.replace = replaceText;
    } else if (transformMode === 'pattern' && pattern) {
      transformation.pattern = pattern;
    }

    return transformation;
  };

  // Execute clone
  const handleClone = async () => {
    const transformation = getTransformation();
    const validation = intuneCloneService.validateTransformation(transformation);

    if (!validation.valid) {
      onError(validation.errors.join(', '));
      return;
    }

    if (selectedPolicies.length === 0) {
      onError('Please select at least one policy to clone');
      return;
    }

    setLoading(true);
    setProgress(0);
    setCloneResults(null);

    try {
      const policiesToClone = sourcePolicies.filter(p => selectedPolicies.includes(p.id));

      const results = await intuneCloneService.clonePolicies(
        policiesToClone,
        transformation,
        {
          cloneAssignments,
          checkDuplicates
        },
        (progressInfo) => {
          setProgress(progressInfo.percentage);
        }
      );

      setCloneResults(results);
      setShowResults(true);

      if (results.cloned > 0) {
        onSuccess(`Successfully cloned ${results.cloned} ${results.cloned === 1 ? 'policy' : 'policies'}`);
      }
      if (results.failed > 0) {
        onError(`${results.failed} ${results.failed === 1 ? 'policy' : 'policies'} failed to clone`);
      }

    } catch (error) {
      console.error('Clone error:', error);
      onError(`Clone operation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloneIcon /> Bulk Policy Clone
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Clone multiple policies at once with customizable name transformations
      </Typography>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                1️⃣ Select Policy Types
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
                {availableTypes.map(type => (
                  <FormControlLabel
                    key={type.key}
                    control={
                      <Checkbox 
                        checked={selectedTypes.includes(type.key)}
                        onChange={() => handleTypeToggle(type.key)}
                        disabled={loadingPolicies || loading}
                      />
                    }
                    label={type.name}
                  />
                ))}
              </Box>

              {loadingPolicies && <LinearProgress sx={{ mb: 2 }} />}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                2️⃣ Name Transformation
              </Typography>
              
              <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                <FormLabel component="legend">Transformation Mode</FormLabel>
                <RadioGroup value={transformMode} onChange={(e) => setTransformMode(e.target.value)}>
                  <FormControlLabel value="suffix" control={<Radio />} label="Add Suffix" />
                  <FormControlLabel value="prefix" control={<Radio />} label="Add Prefix" />
                  <FormControlLabel value="findReplace" control={<Radio />} label="Find & Replace" />
                  <FormControlLabel value="pattern" control={<Radio />} label="Custom Pattern" />
                </RadioGroup>
              </FormControl>

              {transformMode === 'prefix' && (
                <TextField
                  fullWidth
                  label="Prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="DEV-"
                  helperText="Text to add before policy name"
                  sx={{ mb: 2 }}
                />
              )}

              {transformMode === 'suffix' && (
                <TextField
                  fullWidth
                  label="Suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder=" - Copy"
                  helperText="Text to add after policy name"
                  sx={{ mb: 2 }}
                />
              )}

              {transformMode === 'findReplace' && (
                <>
                  <TextField
                    fullWidth
                    label="Find"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="PROD"
                    helperText="Text to find (case sensitive)"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    label="Replace"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="TEST"
                    helperText="Text to replace with"
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {transformMode === 'pattern' && (
                <TextField
                  fullWidth
                  label="Pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="{name} - Copy"
                  helperText="Use {name} as placeholder"
                  sx={{ mb: 2 }}
                />
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                3️⃣ Options
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={cloneAssignments}
                    onChange={(e) => setCloneAssignments(e.target.checked)}
                  />
                }
                label="Clone Assignments"
              />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={checkDuplicates}
                    onChange={(e) => setCheckDuplicates(e.target.checked)}
                  />
                }
                label="Skip if name exists"
              />

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={loading || selectedPolicies.length === 0}
                  sx={{ mb: 1 }}
                >
                  Preview Changes
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CloneIcon />}
                  onClick={handleClone}
                  disabled={loading || selectedPolicies.length === 0}
                  color="primary"
                >
                  {loading ? 'Cloning...' : 'Clone Policies'}
                </Button>
              </Box>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    {progress}% complete
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Policy Selection & Results Panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {!showPreview && !showResults && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      📋 Select Policies to Clone
                    </Typography>
                    <Box>
                      <Button size="small" onClick={handleSelectAllPolicies} disabled={sourcePolicies.length === 0}>
                        All
                      </Button>
                      <Button size="small" onClick={handleClearAllPolicies}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  {sourcePolicies.length === 0 && !loadingPolicies && (
                    <Alert severity="info">
                      Select policy types above to load available policies
                    </Alert>
                  )}

                  {sourcePolicies.length > 0 && (
                    <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell><strong>Policy Name</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sourcePolicies.map((policy) => (
                            <TableRow 
                              key={policy.id}
                              hover
                              onClick={() => handlePolicyToggle(policy.id)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedPolicies.includes(policy.id)}
                                  onChange={() => handlePolicyToggle(policy.id)}
                                />
                              </TableCell>
                              <TableCell>{policy.displayName || policy.name}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={policy.policyType} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    {selectedPolicies.length} {selectedPolicies.length === 1 ? 'policy' : 'policies'} selected
                  </Typography>
                </>
              )}

              {/* Preview */}
              {showPreview && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PreviewIcon /> Name Transformation Preview
                    </Typography>
                    <Button size="small" onClick={() => setShowPreview(false)}>
                      Back to Selection
                    </Button>
                  </Box>

                  <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Original Name</strong></TableCell>
                          <TableCell><strong>New Name</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.originalName}</TableCell>
                            <TableCell><strong>{item.newName}</strong></TableCell>
                            <TableCell>
                              {item.supportsClone ? (
                                <Chip label="Ready" size="small" color="success" icon={<SuccessIcon />} />
                              ) : (
                                <Chip label="Not Supported" size="small" color="warning" icon={<WarningIcon />} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Results */}
              {showResults && cloneResults && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      ✅ Clone Results
                    </Typography>
                    <Button size="small" onClick={() => setShowResults(false)}>
                      Back to Selection
                    </Button>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                        <Typography variant="h4">{cloneResults.total}</Typography>
                        <Typography variant="caption">Total</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                        <Typography variant="h4">{cloneResults.cloned}</Typography>
                        <Typography variant="caption">Cloned</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                        <Typography variant="h4">{cloneResults.skipped}</Typography>
                        <Typography variant="caption">Skipped</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                        <Typography variant="h4">{cloneResults.failed}</Typography>
                        <Typography variant="caption">Failed</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <TableContainer sx={{ maxHeight: 500, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Original</strong></TableCell>
                          <TableCell><strong>New Name</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cloneResults.details.map((detail, index) => (
                          <TableRow key={index}>
                            <TableCell>{detail.originalName}</TableCell>
                            <TableCell>{detail.newName || '-'}</TableCell>
                            <TableCell>
                              {detail.status === 'success' && (
                                <Chip label="Success" size="small" color="success" icon={<SuccessIcon />} />
                              )}
                              {detail.status === 'skipped' && (
                                <Chip label={`Skipped: ${detail.reason}`} size="small" color="warning" icon={<WarningIcon />} />
                              )}
                              {detail.status === 'failed' && (
                                <Chip label={`Failed: ${detail.error}`} size="small" color="error" icon={<ErrorIcon />} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Help Section */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Clone Tips
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="primary">Suffix Example</Typography>
              <Typography variant="body2" color="textSecondary">
                "Windows 10 Policy" → "Windows 10 Policy - Copy"
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="primary">Prefix Example</Typography>
              <Typography variant="body2" color="textSecondary">
                "Windows 10 Policy" → "TEST-Windows 10 Policy"
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="primary">Find/Replace</Typography>
              <Typography variant="body2" color="textSecondary">
                Replace "PROD" with "DEV" in policy names
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="primary">Pattern Example</Typography>
              <Typography variant="body2" color="textSecondary">
                Pattern: "{name} (v2)" creates versioned copies
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CloneTab;
