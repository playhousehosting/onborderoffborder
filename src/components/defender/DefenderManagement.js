import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BugAntIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import defenderService from '../../services/defenderService';

export default function DefenderManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('alerts');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [secureScore, setSecureScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertFilter, setAlertFilter] = useState({ severity: '', status: '', days: 7 });
  const [incidentFilter, setIncidentFilter] = useState({ status: '', severity: '' });

  const tabs = [
    { id: 'alerts', label: 'Security Alerts', icon: ShieldExclamationIcon },
    { id: 'incidents', label: 'Incidents', icon: ExclamationTriangleIcon },
    { id: 'score', label: 'Secure Score', icon: ChartBarIcon },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: BugAntIcon },
    { id: 'recommendations', label: 'Recommendations', icon: LightBulbIcon }
  ];

  useEffect(() => {
    loadTabData();
  }, [activeTab, alertFilter, incidentFilter]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'alerts':
          await loadAlerts();
          break;
        case 'incidents':
          await loadIncidents();
          break;
        case 'score':
          await loadSecureScore();
          break;
        case 'vulnerabilities':
          await loadVulnerabilities();
          break;
        case 'recommendations':
          await loadRecommendations();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await defenderService.getSecurityAlerts(alertFilter);
      setAlerts(response.value || []);
    } catch (error) {
      toast.error('Failed to load security alerts');
      console.error(error);
    }
  };

  const loadIncidents = async () => {
    try {
      const response = await defenderService.getSecurityIncidents(incidentFilter);
      setIncidents(response.value || []);
    } catch (error) {
      toast.error('Failed to load incidents');
      console.error(error);
    }
  };

  const loadSecureScore = async () => {
    try {
      const score = await defenderService.getSecureScore();
      setSecureScore(score);
    } catch (error) {
      toast.error('Failed to load secure score');
      console.error(error);
    }
  };

  const loadVulnerabilities = async () => {
    try {
      const vulns = await defenderService.getVulnerabilities();
      setVulnerabilities(vulns);
    } catch (error) {
      toast.error('Failed to load vulnerabilities');
      console.error(error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recs = await defenderService.getSecurityRecommendations();
      setRecommendations(recs);
    } catch (error) {
      toast.error('Failed to load recommendations');
      console.error(error);
    }
  };

  const handleUpdateAlert = async (alertId, updates) => {
    try {
      await defenderService.updateAlert(alertId, updates);
      toast.success('Alert updated successfully');
      loadAlerts();
    } catch (error) {
      toast.error('Failed to update alert');
      console.error(error);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      informational: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[severity?.toLowerCase()] || colors.informational;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      inProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      active: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[status] || colors.new;
  };

  const renderAlertsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Severity
            </label>
            <select
              value={alertFilter.severity}
              onChange={(e) => setAlertFilter({ ...alertFilter, severity: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={alertFilter.status}
              onChange={(e) => setAlertFilter({ ...alertFilter, status: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="inProgress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Range
            </label>
            <select
              value={alertFilter.days}
              onChange={(e) => setAlertFilter({ ...alertFilter, days: parseInt(e.target.value) })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alerts..."
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Security Alerts ({alerts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No alerts found</p>
            </div>
          ) : (
            alerts
              .filter(alert => 
                searchTerm === '' || 
                alert.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Category: {alert.category}</span>
                        <span>Source: {alert.detectionSource}</span>
                        <span>Created: {new Date(alert.createdDateTime).toLocaleString()}</span>
                      </div>
                      {alert.recommendedActions && (
                        <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                          <strong>Recommended:</strong> {alert.recommendedActions}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <select
                        value={alert.status}
                        onChange={(e) => handleUpdateAlert(alert.id, { status: e.target.value })}
                        className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="new">New</option>
                        <option value="inProgress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );

  const renderIncidentsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={incidentFilter.status}
              onChange={(e) => setIncidentFilter({ ...incidentFilter, status: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="redirected">Redirected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Severity
            </label>
            <select
              value={incidentFilter.severity}
              onChange={(e) => setIncidentFilter({ ...incidentFilter, severity: e.target.value })}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search incidents..."
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Security Incidents ({incidents.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No incidents found</p>
            </div>
          ) : (
            incidents
              .filter(incident => 
                searchTerm === '' || 
                incident.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                incident.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((incident) => (
                <div key={incident.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          {incident.displayName}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {incident.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>Determination: {incident.determination || 'Unknown'}</span>
                        <span>Assigned: {incident.assignedTo || 'Unassigned'}</span>
                        <span>Updated: {new Date(incident.lastUpdateDateTime).toLocaleString()}</span>
                      </div>
                      {incident.alerts && incident.alerts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Related Alerts ({incident.alerts.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {incident.alerts.map((alert, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {alert.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {incident.tags && incident.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {incident.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSecureScoreTab = () => {
    if (!secureScore) return null;

    const percentage = Math.round((secureScore.currentScore / secureScore.maxScore) * 100);

    return (
      <div className="space-y-6">
        {/* Score Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Microsoft Secure Score
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                  {secureScore.currentScore}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  out of {secureScore.maxScore} points
                </div>
                <div className="mt-4">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
                      >
                        <span className="font-semibold">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Comparison to Other Organizations
              </h4>
              <div className="space-y-3">
                {secureScore.averageComparativeScores?.map((comparison, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{comparison.basis}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Avg: {comparison.averageScore}
                      </span>
                    </div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                        <div
                          style={{ width: `${(comparison.averageScore / secureScore.maxScore) * 100}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gray-400"
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Control Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Security Controls
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {secureScore.controlScores?.map((control, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {control.controlName}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {control.score} / {Math.round(control.score / (control.percentage / 100))}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                        <div
                          style={{ width: `${control.percentage}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {control.percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Category: {control.controlCategory}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enabled Services */}
        {secureScore.enabledServices && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Monitored Services
            </h3>
            <div className="flex flex-wrap gap-2">
              {secureScore.enabledServices.map((service, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-full flex items-center"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVulnerabilitiesTab = () => {
    if (!vulnerabilities) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {vulnerabilities.critical}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Critical</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {vulnerabilities.high}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300 font-medium mt-1">High</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {vulnerabilities.medium}
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mt-1">Medium</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {vulnerabilities.low}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mt-1">Low</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {vulnerabilities.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">Total</div>
          </div>
        </div>

        {/* Top Vulnerabilities */}
        {vulnerabilities.topVulnerabilities && vulnerabilities.topVulnerabilities.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Top Vulnerabilities
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {vulnerabilities.topVulnerabilities.map((vuln) => (
                <div key={vuln.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white">
                          {vuln.id}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(vuln.severity)}`}>
                          {vuln.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {vuln.name}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>CVSS Score: {vuln.cvssScore}</span>
                        <span>Affected Devices: {vuln.affectedDevices}</span>
                        <span>Published: {new Date(vuln.published).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            {vulnerabilities.note ? (
              <div>
                <BugAntIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{vulnerabilities.note}</p>
                <a
                  href="https://security.microsoft.com/vulnerabilities"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  View in Microsoft 365 Defender
                </a>
              </div>
            ) : (
              <div>
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">No vulnerabilities detected</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRecommendationsTab = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Security Recommendations ({recommendations.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Prioritized actions to improve your security posture
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading recommendations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <LightBulbIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No recommendations available</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold">
                        #{rec.rank}
                      </span>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        {rec.displayName}
                      </h4>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {rec.recommendationCategory}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Score Impact:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          +{rec.score} points
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {rec.implementationCost}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">User Impact:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {rec.userImpact}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Product:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {rec.productName}
                        </span>
                      </div>
                    </div>
                    {rec.remediationImpact && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        <strong>Impact:</strong> {rec.remediationImpact}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {rec.actionUrl && (
                      <a
                        href={rec.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        Configure
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Microsoft Defender Security Center
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor and respond to security threats across your organization
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                `}
              >
                <Icon
                  className={`
                    ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    -ml-0.5 mr-2 h-5 w-5
                  `}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'alerts' && renderAlertsTab()}
        {activeTab === 'incidents' && renderIncidentsTab()}
        {activeTab === 'score' && renderSecureScoreTab()}
        {activeTab === 'vulnerabilities' && renderVulnerabilitiesTab()}
        {activeTab === 'recommendations' && renderRecommendationsTab()}
      </div>
    </div>
  );
}
