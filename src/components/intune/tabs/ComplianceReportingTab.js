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
  LinearProgress,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment as ReportIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PieChart as ChartIcon
} from '@mui/icons-material';
import intuneComplianceReportService from '../../../services/intune/intuneComplianceReportService';

function ComplianceReportingTab() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [reportOptions, setReportOptions] = useState({
    includePolicies: true,
    includeDevices: true,
    includeTrends: false
  });
  const [platformStats, setPlatformStats] = useState(null);
  const [nonCompliantSummary, setNonCompliantSummary] = useState(null);

  useEffect(() => {
    // Auto-generate report on mount
    handleGenerateReport();
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newReport = await intuneComplianceReportService.generateComplianceReport(reportOptions);
      setReport(newReport);
      
      // Fetch additional analytics
      const [platformData, nonCompliantData] = await Promise.all([
        intuneComplianceReportService.getComplianceByPlatform(),
        intuneComplianceReportService.getNonCompliantDevicesSummary()
      ]);
      
      setPlatformStats(platformData);
      setNonCompliantSummary(nonCompliantData);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (report) {
      intuneComplianceReportService.downloadCSVReport(report);
    }
  };

  const handleDownloadJSON = () => {
    if (report) {
      intuneComplianceReportService.downloadJSONReport(report);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return 'success';
      case 'noncompliant':
        return 'error';
      case 'error':
        return 'warning';
      case 'ingraceperiod':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return <CheckCircleIcon fontSize="small" />;
      case 'noncompliant':
        return <ErrorIcon fontSize="small" />;
      case 'error':
        return <WarningIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const renderSummaryCards = () => {
    if (!report?.statistics) return null;

    const cards = [
      {
        title: 'Total Devices',
        value: report.statistics.totalDevices,
        icon: <ChartIcon />,
        color: '#1976d2'
      },
      {
        title: 'Compliant',
        value: report.statistics.compliantDevices,
        icon: <CheckCircleIcon />,
        color: '#2e7d32'
      },
      {
        title: 'Non-Compliant',
        value: report.statistics.nonCompliantDevices,
        icon: <ErrorIcon />,
        color: '#d32f2f'
      },
      {
        title: 'Compliance Rate',
        value: `${report.statistics.complianceRate}%`,
        icon: <TrendingUpIcon />,
        color: '#ed6c02'
      }
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ color: card.color, mr: 1 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: card.color }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderPolicyBreakdown = () => {
    if (!report?.statistics?.policyBreakdown || report.statistics.policyBreakdown.length === 0) {
      return (
        <Alert severity="info">No policy data available</Alert>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Policy Name</strong></TableCell>
              <TableCell><strong>Platform</strong></TableCell>
              <TableCell align="center"><strong>Compliant</strong></TableCell>
              <TableCell align="center"><strong>Non-Compliant</strong></TableCell>
              <TableCell align="center"><strong>Error</strong></TableCell>
              <TableCell align="center"><strong>Total</strong></TableCell>
              <TableCell align="center"><strong>Rate</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.statistics.policyBreakdown.map((policy, index) => (
              <TableRow key={index} hover>
                <TableCell>{policy.policyName}</TableCell>
                <TableCell>
                  <Chip label={policy.platform} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={policy.compliantCount} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={policy.nonCompliantCount} 
                    size="small" 
                    color="error" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={policy.errorCount} 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">{policy.totalDevices}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(policy.complianceRate)} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                      color={parseFloat(policy.complianceRate) >= 80 ? 'success' : 'warning'}
                    />
                    <Typography variant="body2">{policy.complianceRate}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderDeviceDetails = () => {
    if (!report?.deviceStates || report.deviceStates.length === 0) {
      return (
        <Alert severity="info">No device data available</Alert>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell><strong>Device Name</strong></TableCell>
              <TableCell><strong>User</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Platform</strong></TableCell>
              <TableCell><strong>Last Update</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.deviceStates.slice(0, 100).map((device, index) => (
              <TableRow key={index} hover>
                <TableCell>{device.deviceDisplayName || 'Unknown'}</TableCell>
                <TableCell>{device.userPrincipalName || 'Unknown'}</TableCell>
                <TableCell>
                  <Chip 
                    icon={getStatusIcon(device.status)}
                    label={device.status || 'Unknown'} 
                    size="small" 
                    color={getStatusColor(device.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={device.platform || 'Unknown'} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  {device.lastReportedDateTime 
                    ? new Date(device.lastReportedDateTime).toLocaleString()
                    : 'N/A'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {report.deviceStates.length > 100 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing first 100 devices of {report.deviceStates.length} total. Download CSV for complete data.
            </Typography>
          </Box>
        )}
      </TableContainer>
    );
  };

  const renderPlatformAnalytics = () => {
    if (!platformStats) {
      return <Alert severity="info">No platform data available</Alert>;
    }

    return (
      <Grid container spacing={2}>
        {Object.entries(platformStats).map(([platform, stats]) => (
          <Grid item xs={12} md={6} key={platform}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {platform}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Devices</Typography>
                    <Typography variant="h6">{stats.total}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Compliant</Typography>
                    <Typography variant="h6" color="success.main">{stats.compliant}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Non-Compliant</Typography>
                    <Typography variant="h6" color="error.main">{stats.nonCompliant}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Error</Typography>
                    <Typography variant="h6" color="warning.main">{stats.error}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(stats.compliant / stats.total) * 100} 
                    sx={{ height: 8, borderRadius: 1 }}
                    color={(stats.compliant / stats.total) >= 0.8 ? 'success' : 'warning'}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {((stats.compliant / stats.total) * 100).toFixed(1)}% compliance rate
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderNonCompliantSummary = () => {
    if (!nonCompliantSummary) {
      return <Alert severity="info">No non-compliant devices</Alert>;
    }

    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{nonCompliantSummary.totalNonCompliant}</strong> devices are non-compliant or in error state
        </Alert>
        
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Device Name</strong></TableCell>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Last Update</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nonCompliantSummary.devices.map((device, index) => (
                <TableRow key={index} hover>
                  <TableCell>{device.deviceDisplayName || 'Unknown'}</TableCell>
                  <TableCell>{device.userPrincipalName || 'Unknown'}</TableCell>
                  <TableCell>
                    <Chip 
                      icon={getStatusIcon(device.status)}
                      label={device.status || 'Unknown'} 
                      size="small" 
                      color={getStatusColor(device.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {device.lastReportedDateTime 
                      ? new Date(device.lastReportedDateTime).toLocaleString()
                      : 'N/A'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportIcon /> Compliance Reporting
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate comprehensive compliance reports and analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Report">
            <IconButton onClick={handleGenerateReport} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={handleDownloadCSV}
            disabled={!report || loading}
          >
            CSV
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={handleDownloadJSON}
            disabled={!report || loading}
          >
            JSON
          </Button>
          <Button 
            variant="contained" 
            startIcon={<ReportIcon />} 
            onClick={handleGenerateReport}
            disabled={loading}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Report Options */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Report Options</Typography>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox 
                checked={reportOptions.includePolicies}
                onChange={(e) => setReportOptions({...reportOptions, includePolicies: e.target.checked})}
              />
            }
            label="Include Policies"
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={reportOptions.includeDevices}
                onChange={(e) => setReportOptions({...reportOptions, includeDevices: e.target.checked})}
              />
            }
            label="Include Devices"
          />
          <FormControlLabel
            control={
              <Checkbox 
                checked={reportOptions.includeTrends}
                onChange={(e) => setReportOptions({...reportOptions, includeTrends: e.target.checked})}
                disabled
              />
            }
            label="Include Trends (Coming Soon)"
          />
        </FormGroup>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Report Content */}
      {!loading && report && (
        <Box>
          {/* Summary Cards */}
          {renderSummaryCards()}

          {/* Tabbed Content */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Policy Breakdown" />
              <Tab label="Device Details" />
              <Tab label="Platform Analytics" />
              <Tab label="Non-Compliant Devices" />
            </Tabs>
            <Box sx={{ p: 3 }}>
              {activeTab === 0 && renderPolicyBreakdown()}
              {activeTab === 1 && renderDeviceDetails()}
              {activeTab === 2 && renderPlatformAnalytics()}
              {activeTab === 3 && renderNonCompliantSummary()}
            </Box>
          </Paper>

          {/* Report Metadata */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Report generated on {new Date(report.generatedAt).toLocaleString()} • 
              {report.policies.length} policies analyzed • 
              {report.deviceStates.length} devices evaluated
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Empty State */}
      {!loading && !report && !error && (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <ReportIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Report Generated
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click "Generate Report" to create a comprehensive compliance report
          </Typography>
          <Button variant="contained" startIcon={<ReportIcon />} onClick={handleGenerateReport}>
            Generate Report
          </Button>
        </Paper>
      )}
    </Box>
  );
}

export default ComplianceReportingTab;
