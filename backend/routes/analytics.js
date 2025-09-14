const express = require('express');
const router = express.Router();
const { Integration, IntegrationLog, SyncStatistics } = require('../models/Integration');

// GET /api/analytics/dashboard - Dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate time range
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const timeMs = timeRanges[timeRange] || timeRanges['24h'];
    const startTime = new Date(Date.now() - timeMs);
    
    // Parallel queries for better performance
    const [
      totalIntegrations,
      activeIntegrations,
      totalLogs,
      successfulSyncs,
      failedSyncs,
      recentLogs,
      performanceData,
      integrationStats
    ] = await Promise.all([
      Integration.countDocuments(),
      Integration.countDocuments({ isActive: true, status: 'active' }),
      IntegrationLog.countDocuments({ createdAt: { $gte: startTime } }),
      IntegrationLog.countDocuments({ 
        createdAt: { $gte: startTime }, 
        status: 'SUCCESS' 
      }),
      IntegrationLog.countDocuments({ 
        createdAt: { $gte: startTime }, 
        status: 'FAILED' 
      }),
      IntegrationLog.find({ createdAt: { $gte: startTime } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('integrationId', 'name')
        .lean(),
      IntegrationLog.aggregate([
        { $match: { createdAt: { $gte: startTime }, processingTime: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
            minProcessingTime: { $min: '$processingTime' }
          }
        }
      ]),
      Integration.aggregate([
        {
          $project: {
            name: 1,
            successRate: 1,
            'syncStats.totalSyncs': 1,
            'syncStats.successfulSyncs': 1,
            'syncStats.failedSyncs': 1,
            lastSyncTime: 1,
            status: 1
          }
        }
      ])
    ]);
    
    // Calculate success rate
    const successRate = totalLogs > 0 ? ((successfulSyncs / totalLogs) * 100).toFixed(2) : 0;
    
    // Generate time series data for charts
    const timeSeriesData = await generateTimeSeriesData(startTime, timeRange);
    
    const dashboard = {
      overview: {
        totalIntegrations,
        activeIntegrations,
        totalSyncsInPeriod: totalLogs,
        successfulSyncs,
        failedSyncs,
        successRate: parseFloat(successRate),
        lastUpdated: new Date().toISOString()
      },
      performance: {
        averageProcessingTime: performanceData[0]?.avgProcessingTime || 0,
        maxProcessingTime: performanceData[0]?.maxProcessingTime || 0,
        minProcessingTime: performanceData[0]?.minProcessingTime || 0,
        throughput: calculateThroughput(totalLogs, timeMs)
      },
      recentActivity: recentLogs.map(log => ({
        id: log._id,
        integrationName: log.integrationId?.name || 'Unknown',
        operation: log.operation,
        status: log.status,
        timestamp: log.createdAt,
        processingTime: log.processingTime
      })),
      timeSeriesData,
      integrationBreakdown: integrationStats.map(stat => ({
        id: stat._id,
        name: stat.name,
        status: stat.status,
        totalSyncs: stat.syncStats?.totalSyncs || 0,
        successfulSyncs: stat.syncStats?.successfulSyncs || 0,
        failedSyncs: stat.syncStats?.failedSyncs || 0,
        successRate: stat.successRate || 0,
        lastSync: stat.lastSyncTime
      }))
    };
    
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/analytics/performance - Performance analytics
router.get('/performance', async (req, res) => {
  try {
    const { integrationId, timeRange = '24h' } = req.query;
    
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const timeMs = timeRanges[timeRange] || timeRanges['24h'];
    const startTime = new Date(Date.now() - timeMs);
    
    const matchStage = { 
      createdAt: { $gte: startTime },
      processingTime: { $exists: true }
    };
    
    if (integrationId) {
      matchStage.integrationId = require('mongoose').Types.ObjectId(integrationId);
    }
    
    const performanceMetrics = await IntegrationLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          avgProcessingTime: { $avg: '$processingTime' },
          maxProcessingTime: { $max: '$processingTime' },
          minProcessingTime: { $min: '$processingTime' },
          totalOperations: { $sum: 1 },
          successfulOps: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
          },
          failedOps: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          processingTimes: { $push: '$processingTime' }
        }
      },
      {
        $addFields: {
          timestamp: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
              hour: '$_id.hour'
            }
          },
          successRate: {
            $multiply: [
              { $divide: ['$successfulOps', '$totalOperations'] },
              100
            ]
          },
          // Calculate percentiles
          p50ProcessingTime: {
            $arrayElemAt: [
              { $sortArray: { input: '$processingTimes', sortBy: 1 } },
              { $floor: { $multiply: [{ $size: '$processingTimes' }, 0.5] } }
            ]
          },
          p95ProcessingTime: {
            $arrayElemAt: [
              { $sortArray: { input: '$processingTimes', sortBy: 1 } },
              { $floor: { $multiply: [{ $size: '$processingTimes' }, 0.95] } }
            ]
          }
        }
      },
      { $sort: { timestamp: 1 } },
      { $limit: 100 } // Limit for performance
    ]);
    
    // Calculate error patterns
    const errorPatterns = await IntegrationLog.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startTime },
          status: 'FAILED',
          errorMessage: { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$errorMessage',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' },
          integrations: { $addToSet: '$integrationId' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      performanceMetrics: performanceMetrics.map(metric => ({
        timestamp: metric.timestamp,
        avgProcessingTime: Math.round(metric.avgProcessingTime),
        maxProcessingTime: metric.maxProcessingTime,
        minProcessingTime: metric.minProcessingTime,
        p50ProcessingTime: Math.round(metric.p50ProcessingTime || 0),
        p95ProcessingTime: Math.round(metric.p95ProcessingTime || 0),
        totalOperations: metric.totalOperations,
        successfulOps: metric.successfulOps,
        failedOps: metric.failedOps,
        successRate: parseFloat(metric.successRate.toFixed(2)),
        throughput: metric.totalOperations // operations per hour
      })),
      errorPatterns: errorPatterns.map(pattern => ({
        errorMessage: pattern._id,
        count: pattern.count,
        lastOccurrence: pattern.lastOccurrence,
        affectedIntegrations: pattern.integrations.length
      })),
      summary: {
        totalDataPoints: performanceMetrics.length,
        timeRange,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// GET /api/analytics/trends - Trend analysis
router.get('/trends', async (req, res) => {
  try {
    const { integrationId, metric = 'volume', period = 'daily' } = req.query;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const matchStage = { createdAt: { $gte: thirtyDaysAgo } };
    if (integrationId) {
      matchStage.integrationId = require('mongoose').Types.ObjectId(integrationId);
    }
    
    const groupBy = period === 'hourly' 
      ? { hour: { $hour: '$createdAt' }, day: { $dayOfYear: '$createdAt' }, year: { $year: '$createdAt' } }
      : { day: { $dayOfYear: '$createdAt' }, year: { $year: '$createdAt' } };
    
    const trends = await IntegrationLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          totalOperations: { $sum: 1 },
          successfulOperations: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
          },
          failedOperations: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          avgProcessingTime: { $avg: '$processingTime' },
          conflictsDetected: {
            $sum: { $cond: [{ $eq: ['$status', 'CONFLICT'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: {
              if: { $eq: ['$totalOperations', 0] },
              then: 0,
              else: {
                $multiply: [
                  { $divide: ['$successfulOperations', '$totalOperations'] },
                  100
                ]
              }
            }
          },
          timestamp: period === 'hourly'
            ? {
                $dateFromParts: {
                  year: '$_id.year',
                  dayOfYear: '$_id.day',
                  hour: '$_id.hour'
                }
              }
            : {
                $dateFromParts: {
                  year: '$_id.year',
                  dayOfYear: '$_id.day'
                }
              }
        }
      },
      { $sort: { timestamp: 1 } }
    ]);
    
    // Calculate trend indicators
    const calculateTrend = (data, field) => {
      if (data.length < 2) return 'stable';
      const recent = data.slice(-7); // Last 7 data points
      const older = data.slice(0, 7); // First 7 data points
      
      const recentAvg = recent.reduce((sum, item) => sum + (item[field] || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, item) => sum + (item[field] || 0), 0) / older.length;
      
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (change > 10) return 'increasing';
      if (change < -10) return 'decreasing';
      return 'stable';
    };
    
    res.json({
      trends: trends.map(trend => ({
        timestamp: trend.timestamp,
        totalOperations: trend.totalOperations,
        successfulOperations: trend.successfulOperations,
        failedOperations: trend.failedOperations,
        successRate: parseFloat(trend.successRate.toFixed(2)),
        avgProcessingTime: Math.round(trend.avgProcessingTime || 0),
        conflictsDetected: trend.conflictsDetected
      })),
      trendAnalysis: {
        volume: calculateTrend(trends, 'totalOperations'),
        successRate: calculateTrend(trends, 'successRate'),
        performance: calculateTrend(trends, 'avgProcessingTime'),
        conflicts: calculateTrend(trends, 'conflictsDetected')
      },
      metadata: {
        period,
        dataPoints: trends.length,
        startDate: thirtyDaysAgo,
        endDate: now,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// Helper function to generate time series data
async function generateTimeSeriesData(startTime, timeRange) {
  const interval = timeRange === '1h' ? 5 * 60 * 1000 : // 5 minutes
                   timeRange === '24h' ? 60 * 60 * 1000 : // 1 hour
                   timeRange === '7d' ? 6 * 60 * 60 * 1000 : // 6 hours
                   24 * 60 * 60 * 1000; // 1 day
  
  const timeSeriesData = await IntegrationLog.aggregate([
    { $match: { createdAt: { $gte: startTime } } },
    {
      $group: {
        _id: {
          timestamp: {
            $toDate: {
              $subtract: [
                { $toLong: '$createdAt' },
                { $mod: [{ $toLong: '$createdAt' }, interval] }
              ]
            }
          }
        },
        totalOperations: { $sum: 1 },
        successfulOperations: {
          $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
        },
        failedOperations: {
          $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.timestamp': 1 } }
  ]);
  
  return timeSeriesData.map(data => ({
    timestamp: data._id.timestamp,
    totalOperations: data.totalOperations,
    successfulOperations: data.successfulOperations,
    failedOperations: data.failedOperations,
    successRate: data.totalOperations > 0 
      ? ((data.successfulOperations / data.totalOperations) * 100).toFixed(2)
      : 0
  }));
}

// Helper function to calculate throughput
function calculateThroughput(operations, timeMs) {
  const operationsPerSecond = operations / (timeMs / 1000);
  return Math.round(operationsPerSecond * 100) / 100; // Round to 2 decimal places
}

module.exports = router;