import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  Paper,
  Divider
} from '@mui/material';
import {
  Description as DocumentIcon,
  GetApp as DownloadIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import intuneDocumentationService from '../../../services/intune/intuneDocumentationService';
import intuneExportService from '../../../services/intune/intuneExportService';

const DocumentationTab = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState('html');
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [availableTypes] = useState(intuneExportService.getAvailablePolicyTypes());
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Select/deselect all policy types
  const handleSelectAll = () => {
    setSelectedTypes(availableTypes.map(t => t.key));
  };

  const handleClearAll = () => {
    setSelectedTypes([]);
  };

  const handleTypeToggle = (typeKey) => {
    setSelectedTypes(prev => 
      prev.includes(typeKey) 
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  // Generate documentation
  const handleGenerate = async () => {
    if (selectedTypes.length === 0) {
      onError('Please select at least one policy type');
      return;
    }

    setLoading(true);
    setProgress(0);
    setGeneratedDoc(null);
    setPreviewUrl(null);

    try {
      // Step 1: Export current tenant data (50% of progress)
      const exportData = await intuneExportService.exportPolicies(
        selectedTypes,
        { includeAssignments: true },
        (progressInfo) => {
          setProgress(progressInfo.percentage * 0.5);
        }
      );

      // Step 2: Generate documentation (50% of progress)
      setProgress(50);
      const doc = await intuneDocumentationService.generateDocumentation(
        exportData,
        {
          format,
          includeAssignments,
          includeSettings,
          selectedTypes
        }
      );

      setProgress(100);
      setGeneratedDoc(doc);

      // Create preview for HTML format
      if (format === 'html') {
        const blob = new Blob([doc.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }

      onSuccess(`Documentation generated successfully (${exportData.exportStats.totalExported} policies)`);
    } catch (error) {
      console.error('Documentation generation error:', error);
      onError(`Failed to generate documentation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Download documentation
  const handleDownload = () => {
    if (!generatedDoc) return;

    intuneDocumentationService.downloadDocumentation(
      generatedDoc.content,
      generatedDoc.filename,
      generatedDoc.format
    );
    onSuccess(`Downloaded ${generatedDoc.filename}`);
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DocumentIcon /> Policy Documentation Generator
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Generate professional documentation from your Intune policies in multiple formats
      </Typography>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Configuration
              </Typography>

              {/* Format Selection */}
              <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                <FormLabel component="legend">Output Format</FormLabel>
                <RadioGroup value={format} onChange={(e) => setFormat(e.target.value)}>
                  <FormControlLabel 
                    value="html" 
                    control={<Radio />} 
                    label="HTML (Rich formatting with styling)" 
                  />
                  <FormControlLabel 
                    value="markdown" 
                    control={<Radio />} 
                    label="Markdown (Compatible with GitHub, docs)" 
                  />
                  <FormControlLabel 
                    value="json" 
                    control={<Radio />} 
                    label="JSON (Structured data export)" 
                  />
                </RadioGroup>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              {/* Include Options */}
              <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                <FormLabel component="legend">Include in Documentation</FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeSettings}
                        onChange={(e) => setIncludeSettings(e.target.checked)}
                      />
                    }
                    label="Policy Settings & Configuration"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={includeAssignments}
                        onChange={(e) => setIncludeAssignments(e.target.checked)}
                      />
                    }
                    label="Assignment Details"
                  />
                </FormGroup>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              {/* Policy Type Selection */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <FormLabel component="legend">Policy Types</FormLabel>
                  <Box>
                    <Button size="small" onClick={handleSelectAll}>All</Button>
                    <Button size="small" onClick={handleClearAll}>Clear</Button>
                  </Box>
                </Box>
                <FormGroup>
                  {availableTypes.map(type => (
                    <FormControlLabel
                      key={type.key}
                      control={
                        <Checkbox 
                          checked={selectedTypes.includes(type.key)}
                          onChange={() => handleTypeToggle(type.key)}
                          disabled={loading}
                        />
                      }
                      label={type.name}
                    />
                  ))}
                </FormGroup>
              </Box>

              {/* Generate Button */}
              <Button
                variant="contained"
                fullWidth
                startIcon={<DocumentIcon />}
                onClick={handleGenerate}
                disabled={loading || selectedTypes.length === 0}
                sx={{ mt: 3 }}
              >
                {loading ? 'Generating...' : 'Generate Documentation'}
              </Button>

              {loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    {progress < 50 ? 'Exporting policies...' : 'Generating documentation...'}
                  </Typography>
                </Box>
              )}

              {generatedDoc && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  sx={{ mt: 2 }}
                  color="success"
                >
                  Download {format.toUpperCase()}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Preview/Results Panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PreviewIcon /> Preview & Results
              </Typography>

              {!generatedDoc && !loading && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Select policy types and click "Generate Documentation" to begin
                </Alert>
              )}

              {generatedDoc && (
                <Box sx={{ mt: 2 }}>
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
                    <Typography variant="h6" gutterBottom>
                      ✅ Documentation Generated Successfully!
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={4}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Format
                          </Typography>
                          <Typography variant="body1">
                            <Chip label={format.toUpperCase()} size="small" color="primary" />
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Filename
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {generatedDoc.filename}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Size
                          </Typography>
                          <Typography variant="body1">
                            {(generatedDoc.content.length / 1024).toFixed(1)} KB
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* HTML Preview */}
                  {format === 'html' && previewUrl && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Preview (click download to save full document)
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          height: 600, 
                          overflow: 'auto',
                          border: '2px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <iframe
                          src={previewUrl}
                          title="Documentation Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          }}
                        />
                      </Paper>
                    </Box>
                  )}

                  {/* Markdown Preview */}
                  {format === 'markdown' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Markdown Preview
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          height: 600, 
                          overflow: 'auto',
                          bgcolor: '#f5f5f5',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {generatedDoc.content}
                      </Paper>
                    </Box>
                  )}

                  {/* JSON Preview */}
                  {format === 'json' && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        JSON Preview (formatted)
                      </Typography>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          height: 600, 
                          overflow: 'auto',
                          bgcolor: '#1e1e1e',
                          color: '#d4d4d4',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}
                      >
                        <pre style={{ margin: 0 }}>
                          {generatedDoc.content}
                        </pre>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Help Section */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ℹ️ About Documentation Generator
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                HTML Format
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Professional-looking documentation with styling, ideal for printing or sharing with stakeholders.
                Includes table of contents, color-coded sections, and responsive design.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Markdown Format
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Plain text format compatible with GitHub, GitLab, and other documentation platforms.
                Easy to version control and integrate into existing documentation workflows.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                JSON Format
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Structured data export suitable for further processing, integration with other tools,
                or custom report generation. Includes all policy metadata and settings.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentationTab;
