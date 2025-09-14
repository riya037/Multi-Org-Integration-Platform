const express = require('express');
const router = express.Router();
const { Integration, IntegrationLog } = require('../models/Integration');
const integrationService = require('../services/integrationService');
const aiService = require('../services/aiService');

// POST /api/webhooks/salesforce - Salesforce webhook endpoint
router.post('/salesforce', async (req, res) => {
  try {
    console.log('Received Salesforce webhook:', JSON.stringify(req.body, null, 2));
    
    const { 
      eventType, 
      sobjectType, 
      sobjectId, 
      integrationId,
      recordData,
      changedFields 
    } = req.body;
    
    // Validate required fields
    if (!eventType || !sobjectType || !sobjectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventType, sobjectType, sobjectId' 
      });
    }
    
    // Find relevant integrations
    let integrations;
    if (integrationId) {
      integrations = await Integration.find({ 
        _id: integrationId, 
        isActive: true 
      });
    } else {
      integrations = await Integration.find({
        $or: [
          { 'sourceOrg.objectType': sobjectType },
          { 'targetOrg.objectType': sobjectType }
        ],
        isActive: true,
        status: 'active'
      });
    }
    
    if (integrations.length === 0) {
      console.log(`No active integrations found for ${sobjectType}`);
      return res.json({ 
        message: 'No active integrations found',
        processed: 0 
      });
    }
    
    // Process webhook for each relevant integration
    const processingPromises = integrations.map(integration => 
      processWebhookForIntegration({
        integration,
        eventType,
        sobjectType,
        sobjectId,
        recordData,
        changedFields
      })
    );
    
    const results = await Promise.allSettled(processingPromises);
    
    // Emit real-time updates
    const io = req.app.get('socketio');
    io.emit('webhook-received', {
      eventType,
      sobjectType,
      sobjectId,
      integrationsProcessed: integrations.length,
      results: results.map(r => r.status)
    });
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      message: 'Webhook processed',
      eventType,
      sobjectType,
      sobjectId,
      integrationsProcessed: integrations.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        integrationId: integrations[index]._id,
        integrationName: integrations[index].name,
        status: result.status,
        ...(result.status === 'rejected' ? { error: result.reason.message } : { data: result.value })
      }))
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error.message 
    });
  }
});

// POST /api/webhooks/external - Generic external system webhook
router.post('/external', async (req, res) => {
  try {
    console.log('Received external webhook:', JSON.stringify(req.body, null, 2));
    
    const { 
      source, 
      eventType, 
      entityType, 
      entityId, 
      data,
      timestamp 
    } = req.body;
    
    // Log the webhook
    const webhookLog = new IntegrationLog({
      operation: 'WEBHOOK',
      status: 'PENDING',
      sourceRecordId: entityId,
      recordData: { 
        source, 
        eventType, 
        entityType, 
        data, 
        timestamp: timestamp || new Date() 
      },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        requestId: generateRequestId()
      }
    });
    
    await webhookLog.save();
    
    // Emit real-time update
    const io = req.app.get('socketio');
    io.emit('external-webhook-received', {
      source,
      eventType,
      entityType,
      entityId,
      timestamp: new Date()
    });
    
    res.json({
      message: 'External webhook received and logged',
      webhookId: webhookLog._id,
      source,
      eventType
    });
    
  } catch (error) {
    console.error('External webhook processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process external webhook',
      details: error.message 
    });
  }
});

// GET /api/webhooks/logs - Get webhook processing logs
router.get('/logs', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      eventType, 
      status,
      integrationId,
      startDate,
      endDate 
    } = req.query;
    
    const query = {};
    
    if (eventType) query.operation = eventType;
    if (status) query.status = status;
    if (integrationId) query.integrationId = integrationId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const logs = await IntegrationLog.find(query)
      .populate('integrationId', 'name sourceOrg targetOrg')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await IntegrationLog.countDocuments(query);
    
    res.json({
      logs: logs.map(log => ({
        id: log._id,
        integrationId: log.integrationId?._id,
        integrationName: log.integrationId?.name,
        operation: log.operation,
        status: log.status,
        sourceRecordId: log.sourceRecordId,
        targetRecordId: log.targetRecordId,
        processingTime: log.processingTime,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
        metadata: log.metadata
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch webhook logs',
      details: error.message 
    });
  }
});

// POST /api/webhooks/test - Test webhook endpoint
router.post('/test', async (req, res) => {
  try {
    const testPayload = {
      eventType: 'TEST',
      sobjectType: 'Account',
      sobjectId: 'test-record-id',
      recordData: {
        Name: 'Test Account',
        Phone: '+1234567890',
        Email: 'test@example.com'
      },
      changedFields: ['Name', 'Phone', 'Email'],
      timestamp: new Date().toISOString(),
      source: 'webhook-test'
    };
    
    // Log the test webhook
    const testLog = new IntegrationLog({
      operation: 'TEST',
      status: 'SUCCESS',
      sourceRecordId: testPayload.sobjectId,
      recordData: testPayload,
      processingTime: Math.floor(Math.random() * 100) + 50, // Simulate processing time
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        requestId: generateRequestId(),
        testMode: true
      }
    });
    
    await testLog.save();
    
    // Emit real-time update
    const io = req.app.get('socketio');
    io.emit('webhook-test-completed', {
      testId: testLog._id,
      payload: testPayload,
      timestamp: new Date()
    });
    
    res.json({
      message: 'Test webhook completed successfully',
      testId: testLog._id,
      payload: testPayload,
      status: 'SUCCESS'
    });
    
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ 
      error: 'Test webhook failed',
      details: error.message 
    });
  }
});

// Helper function to process webhook for a specific integration
async function processWebhookForIntegration({
  integration,
  eventType,
  sobjectType,
  sobjectId,
  recordData,
  changedFields
}) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    console.log(`Processing webhook for integration: ${integration.name}`);
    
    // Determine if this is a source or target event
    const isSourceEvent = integration.sourceOrg.objectType === sobjectType;
    const isTargetEvent = integration.targetOrg.objectType === sobjectType;
    
    if (!isSourceEvent && !isTargetEvent) {
      throw new Error(`Object type ${sobjectType} not configured for integration ${integration.name}`);
    }
    
    // Create integration log
    const log = new IntegrationLog({
      integrationId: integration._id,
      operation: eventType.toUpperCase(),
      status: 'PENDING',
      sourceRecordId: sobjectId,
      recordData: {
        before: null,
        after: recordData
      },
      metadata: {
        requestId,
        changedFields,
        webhookSource: isSourceEvent ? 'source' : 'target',
        originalEventType: eventType
      }
    });
    
    await log.save();
    
    // Process based on event type and integration direction
    let result;
    
    switch (eventType.toLowerCase()) {
      case 'created':
      case 'insert':
        result = await handleCreateEvent(integration, sobjectType, sobjectId, recordData, isSourceEvent);
        break;
        
      case 'updated':
      case 'update':
        result = await handleUpdateEvent(integration, sobjectType, sobjectId, recordData, changedFields, isSourceEvent);
        break;
        
      case 'deleted':
      case 'delete':
        result = await handleDeleteEvent(integration, sobjectType, sobjectId, isSourceEvent);
        break;
        
      default:
        throw new Error(`Unsupported event type: ${eventType}`);
    }
    
    // Update log with success
    const processingTime = Date.now() - startTime;
    await IntegrationLog.findByIdAndUpdate(log._id, {
      status: 'SUCCESS',
      targetRecordId: result.targetRecordId,
      processingTime,
      aiAnalysis: result.aiAnalysis
    });
    
    // Update integration stats
    await updateIntegrationStats(integration._id, 'SUCCESS', processingTime);
    
    return {
      integrationId: integration._id,
      integrationName: integration.name,
      logId: log._id,
      result,
      processingTime
    };
    
  } catch (error) {
    console.error(`Webhook processing failed for integration ${integration.name}:`, error);
    
    // Update log with failure
    const processingTime = Date.now() - startTime;
    await IntegrationLog.findOneAndUpdate(
      { 
        integrationId: integration._id,
        sourceRecordId: sobjectId,
        'metadata.requestId': requestId
      },
      {
        status: 'FAILED',
        errorMessage: error.message,
        processingTime
      }
    );
    
    // Update integration stats
    await updateIntegrationStats(integration._id, 'FAILED', processingTime);
    
    throw error;
  }
}

// Handle create events
async function handleCreateEvent(integration, sobjectType, sobjectId, recordData, isSourceEvent) {
  console.log(`Handling create event for ${sobjectType}:${sobjectId}`);
  
  if (!isSourceEvent) {
    // If this is a target event and we're in bidirectional mode, sync back to source
    if (integration.syncSettings.direction === 'bidirectional') {
      return await integrationService.syncToSource(integration, recordData);
    } else {
      return { message: 'Create event on target - no action needed', targetRecordId: null };
    }
  }
  
  // This is a source event - sync to target
  const mappedData = await integrationService.applyFieldMappings(recordData, integration.fieldMappings);
  
  // Check for conflicts
  const conflicts = await integrationService.detectConflicts(mappedData, integration);
  
  if (conflicts.length > 0) {
    const resolution = await aiService.resolveConflicts(conflicts, integration.syncSettings.conflictResolution);
    mappedData = integrationService.applyConflictResolution(mappedData, resolution);
  }
  
  // Create record in target system
  const targetRecordId = await integrationService.createTargetRecord(mappedData, integration);
  
  return {
    targetRecordId,
    mappedFields: Object.keys(mappedData).length,
    conflictsDetected: conflicts.length,
    aiAnalysis: {
      confidence: 0.9,
      entities: await aiService.analyzeEntities(JSON.stringify(recordData)),
      sentiment: await aiService.analyzeSentiment(JSON.stringify(recordData))
    }
  };
}

// Handle update events
async function handleUpdateEvent(integration, sobjectType, sobjectId, recordData, changedFields, isSourceEvent) {
  console.log(`Handling update event for ${sobjectType}:${sobjectId}, changed fields:`, changedFields);
  
  // Only process if changed fields are mapped in the integration
  const mappedChangedFields = changedFields?.filter(field => 
    integration.fieldMappings.some(mapping => mapping.sourceField === field)
  ) || [];
  
  if (mappedChangedFields.length === 0) {
    return { message: 'No mapped fields changed - no sync needed', targetRecordId: null };
  }
  
  if (!isSourceEvent && integration.syncSettings.direction !== 'bidirectional') {
    return { message: 'Update event on target - no action needed', targetRecordId: null };
  }
  
  // Get the current target record to check for conflicts
  const targetRecord = await integrationService.getTargetRecord(sobjectId, integration);
  
  // Apply field mappings
  const mappedData = await integrationService.applyFieldMappings(recordData, integration.fieldMappings);
  
  // Check for conflicts with target record
  const conflicts = await integrationService.detectUpdateConflicts(mappedData, targetRecord, integration);
  
  if (conflicts.length > 0) {
    const resolution = await aiService.resolveConflicts(conflicts, integration.syncSettings.conflictResolution);
    mappedData = integrationService.applyConflictResolution(mappedData, resolution);
  }
  
  // Update record in target system
  const updateResult = await integrationService.updateTargetRecord(targetRecord.id, mappedData, integration);
  
  return {
    targetRecordId: updateResult.id,
    updatedFields: mappedChangedFields.length,
    conflictsDetected: conflicts.length,
    aiAnalysis: {
      confidence: 0.85,
      entities: await aiService.analyzeEntities(JSON.stringify(recordData)),
      sentiment: await aiService.analyzeSentiment(JSON.stringify(recordData))
    }
  };
}

// Handle delete events
async function handleDeleteEvent(integration, sobjectType, sobjectId, isSourceEvent) {
  console.log(`Handling delete event for ${sobjectType}:${sobjectId}`);
  
  if (!isSourceEvent && integration.syncSettings.direction !== 'bidirectional') {
    return { message: 'Delete event on target - no action needed', targetRecordId: null };
  }
  
  // Find the corresponding record in the target system
  const targetRecord = await integrationService.getTargetRecord(sobjectId, integration);
  
  if (!targetRecord) {
    return { message: 'No corresponding target record found', targetRecordId: null };
  }
  
  // Delete or soft delete the target record based on configuration
  const deleteResult = await integrationService.deleteTargetRecord(targetRecord.id, integration);
  
  return {
    targetRecordId: deleteResult.id,
    deleteType: deleteResult.type, // 'hard' or 'soft'
    aiAnalysis: {
      confidence: 0.95,
      entities: [],
      sentiment: 'NEUTRAL'
    }
  };
}

// Update integration statistics
async function updateIntegrationStats(integrationId, status, processingTime) {
  try {
    const updateData = {
      $inc: {
        'syncStats.totalSyncs': 1,
        [`syncStats.${status.toLowerCase()}Syncs`]: 1
      },
      lastSyncTime: new Date()
    };
    
    if (status === 'SUCCESS') {
      updateData['syncStats.lastSuccessTime'] = new Date();
      updateData['syncStats.averageProcessingTime'] = processingTime;
    } else {
      updateData['syncStats.lastFailureTime'] = new Date();
    }
    
    await Integration.findByIdAndUpdate(integrationId, updateData);
    
  } catch (error) {
    console.error('Failed to update integration stats:', error);
  }
}

// Generate unique request ID
function generateRequestId() {
  return `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;