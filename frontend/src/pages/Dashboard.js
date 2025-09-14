import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  Globe,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = ({ appData, isConnected }) => {
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalIntegrations: 0,
      activeIntegrations: 0,
      totalSyncsInPeriod: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      successRate: 0
    },
    performance: {
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: 0,
      throughput: 0
    },
    recentActivity: [],
    timeSeriesData: [],
    integrationBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  // Load dashboard data
  const loadDashboardData = async (timeRange = selectedTimeRange) => {
    try {
      setLoading(true);
      const data = await apiService.analytics.getDashboard(timeRange);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  // Chart configurations
  const successRateChartData = {
    labels: ['Successful', 'Failed'],
    datasets: [
      {
        data: [dashboardData.overview.successfulSyncs, dashboardData.overview.failedSyncs],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 2,
      },
    ],
  };

  const timeSeriesChartData = {
    labels: dashboardData.timeSeriesData.map(point => 
      new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Total Operations',
        data: dashboardData.timeSeriesData.map(point => point.totalOperations),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Successful',
        data: dashboardData.timeSeriesData.map(point => point.successfulOperations),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      red: 'text-red-600 bg-red-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      purple: 'text-purple-600 bg-purple-50'
    };

    return (
      <div className="card hover-lift">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ActivityItem = ({ activity }) => {
    const getStatusIcon = (status) => {
      switch (status) {
        case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />;
        default: return <Clock className="w-4 h-4 text-yellow-500" />;
      }
    };

    return (
      <div className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
        <div className="flex-shrink-0">
          {getStatusIcon(activity.status)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.integrationName}
          </p>
          <p className="text-xs text-gray-500">
            {activity.operation} • {new Date(activity.timestamp).toLocaleString()}
          </p>
        </div>
        {activity.processingTime && (
          <div className="text-xs text-gray-400">
            {activity.processingTime}ms
          </div>
        )}
      </div>
    );
  };

  if (loading && dashboardData.overview.totalIntegrations === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time integration platform monitoring
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="form-select text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last Week</option>
            <option value="30d">Last Month</option>
          </select>
          
          {/* Refresh button */}
          <button
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Connection status banner */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Connection Issue
              </p>
              <p className="text-sm text-yellow-700">
                Real-time updates may be delayed. Data shown is from last successful sync.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Integrations"
          value={dashboardData.overview.totalIntegrations}
          icon={Database}
          color="blue"
        />
        <StatCard
          title="Active Integrations"
          value={dashboardData.overview.activeIntegrations}
          icon={Globe}
          color="green"
        />
        <StatCard
          title="Success Rate"
          value={`${dashboardData.overview.successRate}%`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Avg Response Time"
          value={`${Math.round(dashboardData.performance.averageProcessingTime)}ms`}
          icon={Activity}
          color="yellow"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Success rate chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Success Rate</h3>
            <p className="text-sm text-gray-600">Current period breakdown</p>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Doughnut 
                data={successRateChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Time series chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
            <p className="text-sm text-gray-600">Operations over time</p>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Line data={timeSeriesChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity and integration breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <div className="flex items-center space-x-2">
              {isConnected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              <span className="text-sm text-gray-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="card-body">
            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-0">
                {dashboardData.recentActivity.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Integration breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
            <p className="text-sm text-gray-600">Active integrations overview</p>
          </div>
          <div className="card-body">
            {dashboardData.integrationBreakdown.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.integrationBreakdown.slice(0, 5).map((integration, index) => (
                  <div key={integration.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {integration.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {integration.totalSyncs} syncs
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        integration.successRate >= 90 
                          ? 'bg-green-100 text-green-800'
                          : integration.successRate >= 70 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {integration.successRate}%
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        integration.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No integrations configured</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;