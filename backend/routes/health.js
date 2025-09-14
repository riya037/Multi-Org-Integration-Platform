const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Integration, IntegrationLog } = require('../models/Integration');

// GET /api/health - Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'operational',
        database: 'checking...',
        memory: 'checking...',
        integrations: 'checking...'
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Check MongoDB connection
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        healthCheck.services.database = 'operational';
      } else {
        healthCheck.services.database = 'disconnected';
        healthCheck.status = 'degraded';
      }
    } catch (dbError) {
      healthCheck.services.database = 'error';
      healthCheck.services.databaseError = dbError.message;
      healthCheck.status = 'degraded';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    if (memUsageMB.heapUsed > 400) { // Alert if using more than 400MB heap
      healthCheck.services.memory = 'warning';
      healthCheck.status = healthCheck.status === 'healthy' ? 'warning' : healthCheck.status;
    } else {
      healthCheck.services.memory = 'operational';
    }

    healthCheck.metrics.memoryUsageMB = memUsageMB;

    // Check integrations status
    try {
      const [activeIntegrations, totalIntegrations, recentErrors] = await Promise.all([
        Integration.countDocuments({ isActive: true, status: 'active' }),
        Integration.countDocuments(),
        IntegrationLog.countDocuments({ 
          status: 'FAILED', 
          createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        })
      ]);

      healthCheck.services.integrations = 'operational';
      healthCheck.metrics.integrations = {
        total: totalIntegrations,
        active: activeIntegrations,
        recentErrors: recentErrors
      };

      if (recentErrors > 10) {
        healthCheck.services.integrations = 'warning';
        healthCheck.status = healthCheck.status === 'healthy' ? 'warning' : healthCheck.status;
      }
    } catch (integrationError) {
      healthCheck.services.integrations = 'error';
      healthCheck.services.integrationError = integrationError.message;
      healthCheck.status = 'degraded';
    }

    // Set appropriate HTTP status
    const httpStatus = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'warning' ? 200 :
                      503;

    res.status(httpStatus).json(healthCheck);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

// GET /api/health/detailed - Detailed health check with system information
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: formatUptime(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        hostname: require('os').hostname(),
        totalMemory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
        freeMemory: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + 'GB',
        loadAverage: require('os').loadavg(),
        cpuCount: require('os').cpus().length
      },
      database: {
        status: 'checking...',
        connection: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        collections: []
      },
      integrations: {
        status: 'checking...',
        summary: {},
        recentActivity: []
      },
      performance: {
        memoryUsage: formatMemoryUsage(process.memoryUsage()),
        cpuUsage: process.cpuUsage(),
        eventLoopDelay: await measureEventLoopDelay()
      }
    };

    // Detailed MongoDB check
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        
        // Get database stats
        const dbStats = await mongoose.connection.db.stats();
        detailedHealth.database.status = 'operational';
        detailedHealth.database.stats = {
          collections: dbStats.collections,
          dataSize: formatBytes(dbStats.dataSize),
          storageSize: formatBytes(dbStats.storageSize),
          indexes: dbStats.indexes,
          indexSize: formatBytes(dbStats.indexSize)
        };
        
        // Get collection names
        const collections = await mongoose.connection.db.listCollections().toArray();
        detailedHealth.database.collections = collections.map(c => c.name);
      } else {
        detailedHealth.database.status = 'disconnected';
        detailedHealth.status = 'degraded';
      }
    } catch (dbError) {
      detailedHealth.database.status = 'error';
      detailedHealth.database.error = dbError.message;
      detailedHealth.status = 'degraded';
    }

    // Detailed integrations check
    try {
      const [integrationStats, recentLogs] = await Promise.all([
        Integration.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              avgSuccessRate: { $avg: '$syncStats.successfulSyncs' }
            }
          }
        ]),
        IntegrationLog.find()
          .sort({ createdAt: -1 })
          .limit(10)
          .select('operation status createdAt processingTime integrationId')
          .populate('integrationId', 'name')
          .lean()
      ]);

      detailedHealth.integrations.status = 'operational';
      detailedHealth.integrations.summary = {
        byStatus: integrationStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        totalIntegrations: integrationStats.reduce((sum, stat) => sum + stat.count, 0)
      };

      detailedHealth.integrations.recentActivity = recentLogs.map(log => ({
        id: log._id,
        integration: log.integrationId?.name || 'Unknown',
        operation: log.operation,
        status: log.status,
        processingTime: log.processingTime,
        timestamp: log.createdAt
      }));

      // Check for performance issues
      const highErrorRate = recentLogs.filter(log => log.status === 'FAILED').length;
      if (highErrorRate > 5) {
        detailedHealth.integrations.status = 'warning';
        detailedHealth.status = detailedHealth.status === 'healthy' ? 'warning' : detailedHealth.status;
      }

    } catch (integrationError) {
      detailedHealth.integrations.status = 'error';
      detailedHealth.integrations.error = integrationError.message;
      detailedHealth.status = 'degraded';
    }

    // Set appropriate HTTP status
    const httpStatus = detailedHealth.status === 'healthy' ? 200 :
                      detailedHealth.status === 'warning' ? 200 :
                      503;

    res.status(httpStatus).json(detailedHealth);

  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: formatUptime(process.uptime())
    });
  }
});

// GET /api/health/database - Database-specific health check
router.get('/database', async (req, res) => {
  try {
    const dbHealth = {
      status: 'checking...',
      timestamp: new Date().toISOString(),
      connection: {
        state: getConnectionState(mongoose.connection.readyState),
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      performance: {},
      collections: []
    };

    if (mongoose.connection.readyState === 1) {
      // Connection is open
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - startTime;

      // Get database statistics
      const [dbStats, serverStatus] = await Promise.all([
        mongoose.connection.db.stats(),
        mongoose.connection.db.admin().serverStatus()
      ]);

      dbHealth.status = 'operational';
      dbHealth.performance = {
        pingTime: `${pingTime}ms`,
        uptime: formatUptime(serverStatus.uptime),
        connections: serverStatus.connections,
        opcounters: serverStatus.opcounters
      };

      dbHealth.statistics = {
        collections: dbStats.collections,
        documents: dbStats.objects,
        dataSize: formatBytes(dbStats.dataSize),
        storageSize: formatBytes(dbStats.storageSize),
        indexes: dbStats.indexes,
        indexSize: formatBytes(dbStats.indexSize),
        averageObjectSize: formatBytes(dbStats.avgObjSize || 0)
      };

      // Get collection information
      const collections = await mongoose.connection.db.listCollections().toArray();
      dbHealth.collections = await Promise.all(
        collections.map(async (collection) => {
          try {
            const collStats = await mongoose.connection.db.collection(collection.name).stats();
            return {
              name: collection.name,
              documents: collStats.count || 0,
              size: formatBytes(collStats.size || 0),
              avgDocSize: formatBytes(collStats.avgObjSize || 0)
            };
          } catch (error) {
            return {
              name: collection.name,
              error: 'Unable to get stats'
            };
          }
        })
      );

    } else {
      dbHealth.status = 'disconnected';
      dbHealth.error = 'Database connection is not established';
    }

    const httpStatus = dbHealth.status === 'operational' ? 200 : 503;
    res.status(httpStatus).json(dbHealth);

  } catch (error) {
    console.error('Database health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      connection: {
        state: getConnectionState(mongoose.connection.readyState)
      }
    });
  }
});

// GET /api/health/integrations - Integration-specific health check
router.get('/integrations', async (req, res) => {
  try {
    const integrationHealth = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      summary: {},
      details: [],
      metrics: {
        performance: {},
        errors: {}
      }
    };

    // Get integration summary
    const [statusSummary, performanceMetrics, errorMetrics] = await Promise.all([
      Integration.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgSuccessRate: { 
              $avg: {
                $cond: {
                  if: { $gt: ['$syncStats.totalSyncs', 0] },
                  then: {
                    $multiply: [
                      { $divide: ['$syncStats.successfulSyncs', '$syncStats.totalSyncs'] },
                      100
                    ]
                  },
                  else: 0
                }
              }
            }
          }
        }
      ]),
      IntegrationLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
            processingTime: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
            totalOperations: { $sum: 1 }
          }
        }
      ]),
      IntegrationLog.aggregate([
        {
          $match: {
            status: 'FAILED',
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
          }
        },
        {
          $group: {
            _id: '$errorMessage',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    integrationHealth.summary = {
      byStatus: statusSummary.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          avgSuccessRate: Math.round(item.avgSuccessRate || 0)
        };
        return acc;
      }, {}),
      total: statusSummary.reduce((sum, item) => sum + item.count, 0)
    };

    integrationHealth.metrics.performance = performanceMetrics[0] || {
      avgProcessingTime: 0,
      maxProcessingTime: 0,
      totalOperations: 0
    };

    integrationHealth.metrics.errors = {
      recentErrors: errorMetrics.length,
      topErrors: errorMetrics.map(error => ({
        message: error._id,
        count: error.count
      }))
    };

    // Get individual integration details
    const integrations = await Integration.find({}, {
      name: 1,
      status: 1,
      isActive: 1,
      lastSyncTime: 1,
      'syncStats.successfulSyncs': 1,
      'syncStats.totalSyncs': 1,
      'syncStats.lastSuccessTime': 1,
      'syncStats.lastFailureTime': 1
    }).limit(20);

    integrationHealth.details = integrations.map(integration => {
      const successRate = integration.syncStats.totalSyncs > 0 
        ? ((integration.syncStats.successfulSyncs / integration.syncStats.totalSyncs) * 100).toFixed(1)
        : 0;

      let healthStatus = 'healthy';
      if (!integration.isActive) {
        healthStatus = 'inactive';
      } else if (integration.status !== 'active') {
        healthStatus = 'warning';
      } else if (parseFloat(successRate) < 80) {
        healthStatus = 'warning';
      }

      return {
        id: integration._id,
        name: integration.name,
        status: integration.status,
        isActive: integration.isActive,
        healthStatus,
        successRate: `${successRate}%`,
        totalSyncs: integration.syncStats.totalSyncs || 0,
        lastSync: integration.lastSyncTime,
        lastSuccess: integration.syncStats.lastSuccessTime,
        lastFailure: integration.syncStats.lastFailureTime
      };
    });

    // Determine overall status
    const activeIntegrations = integrationHealth.details.filter(i => i.isActive);
    const unhealthyCount = activeIntegrations.filter(i => i.healthStatus !== 'healthy').length;
    const errorRate = errorMetrics.length;

    if (errorRate > 10 || unhealthyCount > activeIntegrations.length * 0.3) {
      integrationHealth.status = 'warning';
    }

    res.json(integrationHealth);

  } catch (error) {
    console.error('Integration health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Helper functions
function getConnectionState(readyState) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[readyState] || 'unknown';
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMemoryUsage(memUsage) {
  return {
    rss: formatBytes(memUsage.rss),
    heapTotal: formatBytes(memUsage.heapTotal),
    heapUsed: formatBytes(memUsage.heapUsed),
    external: formatBytes(memUsage.external),
    arrayBuffers: formatBytes(memUsage.arrayBuffers || 0)
  };
}

async function measureEventLoopDelay() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      resolve(Number(delta / BigInt(1000000))); // Convert to milliseconds
    });
  });
}

module.exports = router;