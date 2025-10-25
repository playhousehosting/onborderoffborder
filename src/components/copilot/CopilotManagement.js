import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  ClockIcon,
  UsersIcon,
  LightBulbIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { copilotService } from '../../services/copilotService';

export default function CopilotManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('usage');
  const [loading, setLoading] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [adoptionData, setAdoptionData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [timePeriod, setTimePeriod] = useState('30d');

  const tabs = [
    { id: 'usage', label: 'Usage Analytics', icon: ChartBarIcon },
    { id: 'adoption', label: 'User Adoption', icon: UserGroupIcon },
    { id: 'activity', label: 'Activity Reports', icon: DocumentChartBarIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }
  ];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'usage') {
        const data = await copilotService.getCopilotUsage();
        setUsageData(data);
      } else if (activeTab === 'adoption') {
        const data = await copilotService.getUserAdoption();
        setAdoptionData(data);
      } else if (activeTab === 'activity') {
        const data = await copilotService.getActivityReports();
        setActivityData(data);
      } else if (activeTab === 'settings') {
        const data = await copilotService.getCopilotSettings();
        setSettingsData(data);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendDirection }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {trend && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trendDirection === 'up' ? (
                      <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                    ) : (
                      <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                    )}
                    <span className="ml-1">{trend}</span>
                  </div>
                )}
              </dd>
              {subtitle && <dd className="text-sm text-gray-500 mt-1">{subtitle}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsageTab = () => {
    if (!usageData) return null;

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Users"
            value={usageData.totalActiveUsers.toLocaleString()}
            subtitle="Last 30 days"
            icon={UsersIcon}
            trend="+12.3%"
            trendDirection="up"
          />
          <StatCard
            title="Total Interactions"
            value={usageData.totalInteractions.toLocaleString()}
            subtitle={`${usageData.averageInteractionsPerUser} per user avg`}
            icon={SparklesIcon}
            trend="+8.5%"
            trendDirection="up"
          />
          <StatCard
            title="Time Saved"
            value={`${usageData.totalTimeSavedHours.toLocaleString()}h`}
            subtitle="Estimated productivity gain"
            icon={ClockIcon}
            trend="+15.2%"
            trendDirection="up"
          />
          <StatCard
            title="Adoption Rate"
            value={`${usageData.adoptionRate}%`}
            subtitle="Of licensed users"
            icon={ArrowTrendingUpIcon}
            trend="+5.3%"
            trendDirection="up"
          />
        </div>

        {/* Top Features */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Features by Usage</h3>
          <div className="space-y-4">
            {usageData.topFeatures.map((feature, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{feature.feature}</span>
                  <span className="text-sm text-gray-500">
                    {feature.usage.toLocaleString()} uses ({feature.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${feature.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Active Users</h3>
            <div className="space-y-3">
              {usageData.trends.dailyActiveUsers.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{day.date}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(day.count / 500) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {day.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Interactions</h3>
            <div className="space-y-3">
              {usageData.trends.weeklyInteractions.map((week, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{week.week}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(week.count / 4000) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {(week.count / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdoptionTab = () => {
    if (!adoptionData) return null;

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Licensed Users"
            value={adoptionData.totalLicensedUsers.toLocaleString()}
            subtitle="Total Copilot licenses"
            icon={UsersIcon}
          />
          <StatCard
            title="Active Users"
            value={adoptionData.activeUsers.toLocaleString()}
            subtitle="Used in last 30 days"
            icon={SparklesIcon}
            trend="+19%"
            trendDirection="up"
          />
          <StatCard
            title="Adoption Rate"
            value={`${adoptionData.adoptionRate}%`}
            subtitle="Overall adoption"
            icon={ArrowTrendingUpIcon}
            trend="+5.3%"
            trendDirection="up"
          />
          <StatCard
            title="New Users"
            value={adoptionData.newUsersThisMonth.toLocaleString()}
            subtitle="This month"
            icon={UserGroupIcon}
            trend="+23%"
            trendDirection="up"
          />
        </div>

        {/* Engagement Levels */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Engagement Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {adoptionData.userEngagement.highEngagement}
              </div>
              <div className="text-sm text-green-700 mt-1">High Engagement</div>
              <div className="text-xs text-green-600 mt-1">&gt;20 interactions/month</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">
                {adoptionData.userEngagement.mediumEngagement}
              </div>
              <div className="text-sm text-yellow-700 mt-1">Medium Engagement</div>
              <div className="text-xs text-yellow-600 mt-1">5-20 interactions/month</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="text-3xl font-bold text-red-600">
                {adoptionData.userEngagement.lowEngagement}
              </div>
              <div className="text-sm text-red-700 mt-1">Low Engagement</div>
              <div className="text-xs text-red-600 mt-1">&lt;5 interactions/month</div>
            </div>
          </div>
        </div>

        {/* Department Adoption */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Adoption by Department</h3>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Users
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adoption Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adoptionData.departmentAdoption.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.department}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.totalUsers}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.activeUsers}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dept.rate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            dept.rate >= 75 ? 'bg-green-500' :
                            dept.rate >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${dept.rate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Users by Interactions</h3>
          <div className="space-y-3">
            {adoptionData.topUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.displayName.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                    <p className="text-xs text-gray-500">{user.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.interactions}</p>
                  <p className="text-xs text-gray-500">interactions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderActivityTab = () => {
    if (!activityData) return null;

    return (
      <div className="space-y-6">
        {/* Business Outcomes */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Outcomes</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Productivity Gain"
              value={`${activityData.businessOutcomes.productivityGain.value}%`}
              subtitle={activityData.businessOutcomes.productivityGain.description}
              icon={ArrowTrendingUpIcon}
            />
            <StatCard
              title="Time Saved"
              value={`${activityData.businessOutcomes.timeSaved.value.toLocaleString()}h`}
              subtitle={activityData.businessOutcomes.timeSaved.description}
              icon={ClockIcon}
            />
            <StatCard
              title="Content Created"
              value={activityData.businessOutcomes.contentCreated.value.toLocaleString()}
              subtitle={activityData.businessOutcomes.contentCreated.description}
              icon={DocumentChartBarIcon}
            />
            <StatCard
              title="Meetings Optimized"
              value={activityData.businessOutcomes.meetingsOptimized.value.toLocaleString()}
              subtitle={activityData.businessOutcomes.meetingsOptimized.description}
              icon={LightBulbIcon}
            />
          </div>
        </div>

        {/* Usage Patterns */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Usage Hours</h3>
          <div className="flex items-end justify-between h-64 space-x-2">
            {activityData.usagePatterns.peakUsageHours.map((hour, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-blue-600 rounded-t-lg transition-all duration-500"
                     style={{ height: `${(hour.usage / 160) * 100}%` }} />
                <div className="text-xs text-gray-600 mt-2 whitespace-nowrap">{hour.hour}</div>
                <div className="text-xs font-medium text-gray-900">{hour.usage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Used Apps */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Most Used Apps</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activityData.usagePatterns.mostUsedApps.map((app, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{app.app}</span>
                  <SparklesIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {app.interactions.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">interactions</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {activityData.qualityMetrics.userSatisfaction}
              </div>
              <div className="text-sm text-gray-600 mt-2">User Satisfaction</div>
              <div className="text-xs text-gray-500 mt-1">out of 5</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {activityData.qualityMetrics.accuracyRating}
              </div>
              <div className="text-sm text-gray-600 mt-2">Accuracy Rating</div>
              <div className="text-xs text-gray-500 mt-1">out of 5</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">
                {activityData.qualityMetrics.promptSuccessRate}%
              </div>
              <div className="text-sm text-gray-600 mt-2">Success Rate</div>
              <div className="text-xs text-gray-500 mt-1">prompts resolved</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">
                {activityData.qualityMetrics.averageResponseTime}s
              </div>
              <div className="text-sm text-gray-600 mt-2">Avg Response Time</div>
              <div className="text-xs text-gray-500 mt-1">seconds</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    if (!settingsData) return null;

    return (
      <div className="space-y-6">
        {/* Licensing Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Important:</strong> Microsoft 365 Copilot requires a separate license.
                Many settings are managed through the Microsoft 365 admin center.
              </p>
            </div>
          </div>
        </div>

        {/* License Overview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">License Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {settingsData.licensingInfo.totalLicenses}
              </div>
              <div className="text-sm text-blue-700 mt-1">Total Licenses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {settingsData.licensingInfo.assignedLicenses}
              </div>
              <div className="text-sm text-green-700 mt-1">Assigned</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-600">
                {settingsData.licensingInfo.availableLicenses}
              </div>
              <div className="text-sm text-gray-700 mt-1">Available</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Copilot Features</h3>
          <div className="space-y-4">
            {Object.entries(settingsData.features).map(([key, feature]) => (
              <div key={key} className="flex items-start p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {feature.enabled && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Enabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                  {feature.respects && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {feature.respects.map((item, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {feature.configuredVia && (
                    <p className="mt-2 text-xs text-gray-500">
                      Configured via: {feature.configuredVia}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Governance & Security</h3>
          <div className="space-y-4">
            {Object.entries(settingsData.governance).map(([key, gov]) => (
              <div key={key} className="flex items-start p-4 bg-gray-50 rounded-lg">
                <ShieldCheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <p className="mt-1 text-sm text-gray-500">{gov.description}</p>
                  {typeof gov === 'object' && Object.keys(gov).length > 2 && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(gov).filter(([k]) => k !== 'enabled' && k !== 'description').map(([k, v]) => (
                        <div key={k} className="text-xs text-gray-600">
                          <strong>{k.replace(/([A-Z])/g, ' $1').trim()}:</strong> {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Center Features */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Cog6ToothIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Admin Center Exclusive Features</h4>
              <p className="mt-2 text-sm text-yellow-700">
                The following features are only available in the Microsoft 365 admin center:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                {settingsData.adminCenterExclusive.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-yellow-600">
                Navigate to: <strong>Microsoft 365 admin center → Copilot → Settings</strong>
              </p>
            </div>
          </div>
        </div>

        {/* API Availability */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">API Availability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">Available via Graph API</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {Object.entries(settingsData.apiAvailability).filter(([, v]) => v.includes('Graph')).map(([key, value]) => (
                  <li key={key} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}: {value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-900 mb-2">Admin Center Only</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(settingsData.apiAvailability).filter(([, v]) => v.includes('Admin center')).map(([key, value]) => (
                  <li key={key} className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}: {value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center">
          <SparklesIcon className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Microsoft 365 Copilot</h1>
            <p className="mt-1 text-sm text-gray-600">
              Usage analytics, adoption metrics, and settings management
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'usage' && renderUsageTab()}
            {activeTab === 'adoption' && renderAdoptionTab()}
            {activeTab === 'activity' && renderActivityTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </>
        )}
      </div>
    </div>
  );
}
