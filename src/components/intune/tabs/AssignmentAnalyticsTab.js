import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import intuneAssignmentService from '../../../services/intune/intuneAssignmentService';

export default function AssignmentAnalyticsTab({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [assignmentData, setAssignmentData] = useState(null);
  const [conflictData, setConflictData] = useState(null);
  const [coverageData, setCoverageData] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [filterPolicyType, setFilterPolicyType] = useState('all');
  const [filterConflictType, setFilterConflictType] = useState('all');

  // Load assignments on mount
  useEffect(() => {
    loadAssignments();
  }, []);

  /**
   * Load all assignments
   */
  const loadAssignments = async () => {
    setLoading(true);
    try {
      // Fetch assignments
      const data = await intuneAssignmentService.fetchAllAssignments();
      setAssignmentData(data);

      // Analyze conflicts
      const conflicts = intuneAssignmentService.analyzeAssignmentConflicts(data.assignments);
      setConflictData(conflicts);

      // Generate coverage report
      const coverage = await intuneAssignmentService.generateAssignmentCoverage(data.assignments);
      setCoverageData(coverage);

      onSuccess('Assignment analytics loaded successfully');
    } catch (error) {
      console.error('Error loading assignments:', error);
      onError('Failed to load assignment analytics');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export assignment matrix
   */
  const handleExportMatrix = () => {
    if (!assignmentData) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    intuneAssignmentService.downloadAssignmentMatrix(
      assignmentData.assignments,
      `assignment-matrix-${timestamp}.csv`
    );
    onSuccess('Assignment matrix exported');
  };

  /**
   * Filter assignments by text and policy type
   */
  const getFilteredAssignments = () => {
    if (!assignmentData) return [];

    let filtered = assignmentData.assignments;

    // Filter by policy type
    if (filterPolicyType !== 'all') {
      filtered = filtered.filter(a => a.policyType === filterPolicyType);
    }

    // Filter by text
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = filtered.filter(a => 
        a.policyName.toLowerCase().includes(searchLower) ||
        a.policyTypeName.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  /**
   * Filter conflicts
   */
  const getFilteredConflicts = () => {
    if (!conflictData) return [];

    let filtered = conflictData.conflicts;

    // Filter by conflict type
    if (filterConflictType !== 'all') {
      filtered = filtered.filter(c => c.type === filterConflictType);
    }

    // Filter by text
    if (filterText) {
      const searchLower = filterText.toLowerCase();
      filtered = filtered.filter(c => 
        c.policyTypeName?.toLowerCase().includes(searchLower) ||
        c.message.toLowerCase().includes(searchLower) ||
        c.policies?.some(p => p.name.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  };

  /**
   * Get unique policy types
   */
  const getPolicyTypes = () => {
    if (!assignmentData) return [];
    return [...new Set(assignmentData.assignments.map(a => a.policyType))];
  };

  /**
   * Render summary cards
   */
  const renderSummary = () => {
    if (!assignmentData) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Policies
              </Typography>
              <Typography variant="h4">
                {assignmentData.summary.totalPolicies}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Assignments
              </Typography>
              <Typography variant="h4">
                {assignmentData.summary.totalAssignments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Assigned Groups
              </Typography>
              <Typography variant="h4">
                {assignmentData.summary.assignedGroups}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unassigned Policies
              </Typography>
              <Typography variant="h4" color="warning.main">
                {assignmentData.summary.unassignedPolicies}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  /**
   * Render assignments table
   */
  const renderAssignmentsTable = () => {
    const filtered = getFilteredAssignments();

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Policy Type</TableCell>
              <TableCell>Policy Name</TableCell>
              <TableCell align="center">Assignments</TableCell>
              <TableCell>Assignment Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="textSecondary">
                    No assignments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip 
                      label={item.policyTypeName} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{item.policyName}</TableCell>
                  <TableCell align="center">
                    {item.assignments.length === 0 ? (
                      <Chip label="Unassigned" size="small" color="warning" />
                    ) : (
                      <Chip label={item.assignments.length} size="small" color="success" />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.assignments.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {item.assignments.slice(0, 3).map((assignment, i) => (
                          <Tooltip 
                            key={i}
                            title={`${assignment.intent} - ${assignment.groupMode}`}
                          >
                            <Chip 
                              label={assignment.target?.groupId?.substring(0, 8) || 'Unknown'}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        ))}
                        {item.assignments.length > 3 && (
                          <Chip 
                            label={`+${item.assignments.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No assignments
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  /**
   * Render conflicts view
   */
  const renderConflicts = () => {
    if (!conflictData) return null;

    const filtered = getFilteredConflicts();

    return (
      <Box>
        {/* Conflict Summary */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Conflicts
                </Typography>
                <Typography variant="h4" color="error.main">
                  {conflictData.totalConflicts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Groups with Conflicts
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {conflictData.groupsWithConflicts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ bgcolor: conflictData.totalConflicts === 0 ? 'success.light' : 'transparent' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <Typography variant="h6">
                  {conflictData.totalConflicts === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      No Conflicts
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon color="error" />
                      Needs Attention
                    </Box>
                  )}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Conflict Type Filter */}
        <Box sx={{ mb: 2 }}>
          <TextField
            select
            label="Filter by Conflict Type"
            value={filterConflictType}
            onChange={(e) => setFilterConflictType(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
          >
            <MenuItem value="all">All Conflict Types</MenuItem>
            <MenuItem value="MULTIPLE_POLICIES_SAME_TYPE">Multiple Policies (Same Type)</MenuItem>
            <MenuItem value="CONFLICTING_INTENTS">Conflicting Intents</MenuItem>
          </TextField>
        </Box>

        {/* Conflicts List */}
        {filtered.length === 0 ? (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            No conflicts detected! All assignments are properly configured.
          </Alert>
        ) : (
          filtered.map((conflict, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {conflict.severity === 'ERROR' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <WarningIcon color="warning" />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">
                      {conflict.policyTypeName || conflict.type}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {conflict.message}
                    </Typography>
                  </Box>
                  <Chip 
                    label={conflict.severity}
                    color={conflict.severity === 'ERROR' ? 'error' : 'warning'}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Affected Policies:
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Policy Name</TableCell>
                        <TableCell>Intent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conflict.policies?.map((policy, i) => (
                        <TableRow key={i}>
                          <TableCell>{policy.name}</TableCell>
                          <TableCell>
                            <Chip label={policy.intent || 'N/A'} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    );
  };

  /**
   * Render coverage report
   */
  const renderCoverage = () => {
    if (!coverageData) return null;

    return (
      <Box>
        {/* Group Coverage */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Group Coverage
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="textSecondary">Total Groups</Typography>
              <Typography variant="h5">
                {coverageData.groupCoverage.totalGroups}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="textSecondary">Assigned Groups</Typography>
              <Typography variant="h5" color="success.main">
                {coverageData.groupCoverage.assignedGroups}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="textSecondary">Unassigned Groups</Typography>
              <Typography variant="h5" color="warning.main">
                {coverageData.groupCoverage.unassignedGroups}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography color="textSecondary">Coverage</Typography>
              <Typography variant="h5">
                {coverageData.groupCoverage.coveragePercent}%
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={coverageData.groupCoverage.coveragePercent}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        </Paper>

        {/* Policy Type Coverage */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Policy Type Coverage
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Policy Type</TableCell>
                  <TableCell align="center">Total Policies</TableCell>
                  <TableCell align="center">Assigned</TableCell>
                  <TableCell align="center">Total Assignments</TableCell>
                  <TableCell>Coverage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(coverageData.policyTypeCoverage).map(([type, data]) => {
                  const coverage = data.totalPolicies > 0 
                    ? Math.round((data.assignedPolicies / data.totalPolicies) * 100)
                    : 0;
                  
                  return (
                    <TableRow key={type}>
                      <TableCell>{data.name}</TableCell>
                      <TableCell align="center">{data.totalPolicies}</TableCell>
                      <TableCell align="center">{data.assignedPolicies}</TableCell>
                      <TableCell align="center">{data.totalAssignments}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={coverage}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2">{coverage}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Top Assigned Groups */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top Assigned Groups (Most Policies)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Group ID</TableCell>
                  <TableCell align="center">Policy Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coverageData.topAssignedGroups.map((group, index) => (
                  <TableRow key={group.groupId}>
                    <TableCell>#{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {group.groupId}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={group.policyCount} color="primary" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Assignment Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAssignments}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportMatrix}
            disabled={!assignmentData}
          >
            Export Matrix
          </Button>
        </Box>
      </Box>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary */}
      {renderSummary()}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="All Assignments" />
          <Tab label="Conflicts" />
          <Tab label="Coverage Report" />
        </Tabs>
      </Paper>

      {/* Filters */}
      {activeTab !== 2 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ flex: 1 }}
          />
          {activeTab === 0 && (
            <TextField
              select
              label="Policy Type"
              value={filterPolicyType}
              onChange={(e) => setFilterPolicyType(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All Policy Types</MenuItem>
              {getPolicyTypes().map(type => (
                <MenuItem key={type} value={type}>
                  {assignmentData?.assignments.find(a => a.policyType === type)?.policyTypeName || type}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      )}

      {/* Tab Content */}
      <Paper sx={{ p: 2 }}>
        {activeTab === 0 && renderAssignmentsTable()}
        {activeTab === 1 && renderConflicts()}
        {activeTab === 2 && renderCoverage()}
      </Paper>
    </Box>
  );
}
