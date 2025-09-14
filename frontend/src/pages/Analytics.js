import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    performanceMetrics: [],
    errorPatterns: [],
    summary: {}
  });
  const [trendsData, setTrendsData] = useState({
    trends: [],
    trendAnalysis: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('volume');

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [performanceData, trendsResult] = await Promise.all([
        apiService.analytics.getPerformance({ timeRange: selectedTimeRange }),
        apiService.analytics.getTrends({ metric: selectedMetric, period: 'hourly' })
      ]);
      
      setAnalyticsData(performanceData);
      setTrendsData(trendsResult);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange, selectedMetric]);

  // Chart configurations
  const performanceChartData = {
    labels: analyticsData.performanceMetrics?.map(metric => 
      new Date(metric.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    ) || [],
    datasets: [
      {
        label: 'Average Response Time (ms)',
        data: analyticsData.performanceMetrics?.map(metric => metric.avgProcessingTime) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const StatCard = ({ title, value, icon: Icon }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card">
              <div className="card-body animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Performance insights and trend analysis
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
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
          
          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Avg Response Time"
          value="120ms"
          icon={Clock}
        />
        <StatCard
          title="Total Operations"
          value="1,234"
          icon={Activity}
        />
        <StatCard
          title="Error Rate"
          value="2.1%"
          icon={AlertCircle}
        />
        <StatCard
          title="Peak Throughput"
          value="450 ops/hr"
          icon={TrendingUp}
        />
      </div>

      {/* Performance Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Performance Over Time</h3>
          <p className="text-sm text-gray-600">Response time trends</p>
        </div>
        <div className="card-body">
          <div className="chart-container">
            <Line data={performanceChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;