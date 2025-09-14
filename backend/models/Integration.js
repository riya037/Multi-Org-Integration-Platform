const mongoose = require('mongoose');

const integrationConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  sourceOrg: {
    name: { type: String, required: true },
    loginUrl: { type: String, required: true },
    apiVersion: { type: String, default: '58.0' },
    objectType: { type: String, required: true }
  },
  targetOrg: {
    name: { type: String, required: true },
    loginUrl: { type: String, required: true },
    apiVersion: { type: String, default: '58.0' },
    objectType: { type: String, required: true }
  },
  fieldMappings: [{
    sourceField: { type: String, required: true },
    targetField: { type: String, required: true },
    transformationRule: String,
    aiConfidence: { type: Number, min: 0, max: 1 }
  }],
  syncSettings: {
    frequency: { 
      type: String, 
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'realtime'
    },
    direction: {
      type: String,
      enum: ['bidirectional', 'source-to-target', 'target-to-source'],
      default: 'source-to-target'
    },
    conflictResolution: {
      type: String,
      enum: ['source-wins', 'target-wins', 'latest-wins', 'ai-resolve'],
      default: 'ai-resolve'
    }
  },
  aiSettings: {
    enableAIMapping: { type: Boolean, default: true },
    enableConflictResolution: { type: Boolean, default: true },
    confidenceThreshold: { type: Number, default: 0.8 }
  },
  isActive: { type: Boolean, default: true },
  createdBy: String,
  lastSyncTime: Date,
  syncStats: {
    totalSyncs: { type: Number, default: 0 },
    successfulSyncs: { type: Number, default: 0 },
    failedSyncs: { type: Number, default: 0 },
    conflictsResolved: { type: Number, default: 0 },
    averageProcessingTime: Number,
    lastSuccessTime: Date,
    lastFailureTime: Date
  },
  webhookEndpoint: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'syncing'],
    default: 'inactive'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for success rate
integrationConfigSchema.virtual('successRate').get(function() {
  if (this.syncStats.totalSyncs === 0) return 0;
  return ((this.syncStats.successfulSyncs / this.syncStats.totalSyncs) * 100).toFixed(2);
});

// Index for performance
integrationConfigSchema.index({ isActive: 1, status: 1 });
integrationConfigSchema.index({ createdAt: -1 });
integrationConfigSchema.index({ 'sourceOrg.name': 1, 'targetOrg.name': 1 });

// Integration Log Schema
const integrationLogSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  operation: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'SYNC'],
    required: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'CONFLICT', 'PENDING'],
    required: true
  },
  sourceRecordId: String,
  targetRecordId: String,
  recordData: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  conflictDetails: {
    type: [{
      field: String,
      sourceValue: mongoose.Schema.Types.Mixed,
      targetValue: mongoose.Schema.Types.Mixed,
      resolution: String,
      aiRecommendation: String
    }]
  },
  errorMessage: String,
  processingTime: Number,
  aiAnalysis: {
    confidence: Number,
    recommendations: [String],
    entities: [String],
    sentiment: String
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    requestId: String
  }
}, {
  timestamps: true,
  // TTL index to automatically delete old logs (keep for 90 days to save space)
  expires: 90 * 24 * 60 * 60 // 90 days in seconds
});

// Indexes for log querying
integrationLogSchema.index({ integrationId: 1, createdAt: -1 });
integrationLogSchema.index({ status: 1, createdAt: -1 });
integrationLogSchema.index({ operation: 1, createdAt: -1 });
integrationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Sync Statistics Schema for analytics
const syncStatisticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Integration',
    required: true
  },
  totalOperations: { type: Number, default: 0 },
  successfulOperations: { type: Number, default: 0 },
  failedOperations: { type: Number, default: 0 },
  conflictsDetected: { type: Number, default: 0 },
  conflictsResolved: { type: Number, default: 0 },
  averageProcessingTime: Number,
  dataVolume: { type: Number, default: 0 }, // in bytes
  performanceMetrics: {
    p50ProcessingTime: Number,
    p95ProcessingTime: Number,
    p99ProcessingTime: Number,
    throughputPerSecond: Number
  }
}, {
  timestamps: true
});

// Index for time-series queries
syncStatisticsSchema.index({ integrationId: 1, date: -1 });
syncStatisticsSchema.index({ date: -1 });

// Models
const Integration = mongoose.model('Integration', integrationConfigSchema);
const IntegrationLog = mongoose.model('IntegrationLog', integrationLogSchema);
const SyncStatistics = mongoose.model('SyncStatistics', syncStatisticsSchema);

module.exports = {
  Integration,
  IntegrationLog,
  SyncStatistics
};