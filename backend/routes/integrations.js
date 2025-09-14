const express = require('express');
const router = express.Router();
const { Integration, IntegrationLog } = require('../models/Integration');
const integrationService = require('../services/integrationService');
const aiService = require('../services/aiService');
const Joi = require('joi');

// Validation schemas
const createIntegrationSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().max(500),
  sourceOrg: Joi.object({
    name: Joi.string().required(),
    loginUrl: Joi.string().uri().required(),
    apiVersion: Joi.string().default('58.0'),
    objectType: Joi.string().required()
  }).required(),
  targetOrg: Joi.object({
    name: Joi.string().required(),
    loginUrl: Joi.string().uri().required(),
    apiVersion: Joi.string().default('58.0'),
    objectType: Joi.string().required()
  }).required(),
  fieldMappings: Joi.array().items(Joi.object({
    sourceField: Joi.string().required(),
    targetField: Joi.string().required(),
    transformationRule: Joi.string(),
    aiConfidence: Joi.number().min(0).max(1)
  })),
  syncSettings: Joi.object({
    frequency: Joi.string().valid('realtime', 'hourly', 'daily', 'weekly'),
    direction: Joi.string().valid('bidirectional', 'source-to-target', 'target-to-source'),
    conflictResolution: Joi.string().valid('source-wins', 'target-wins', 'latest-wins', 'ai-resolve')
  })
});

// GET /api/integrations - Get all integrations
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'sourceOrg.name': { $regex: search, $options: 'i' } },
        { 'targetOrg.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const integrations = await Integration.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Integration.countDocuments(query);
    
    res.json({
      integrations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalIntegrations: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// GET /api/integrations/:id - Get specific integration
router.get('/:id', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(integration);
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

// POST /api/integrations - Create new integration
router.post('/', async (req, res) => {
  try {
    const { error, value } = createIntegrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    // Generate AI field mappings if not provided
    if (!value.fieldMappings || value.fieldMappings.length === 0) {
      console.log('Generating AI field mappings...');
      const aiMappings = await aiService.generateFieldMappings(
        value.sourceOrg.objectType,
        value.targetOrg.objectType
      );
      value.fieldMappings = aiMappings;
    }
    
    const integration = new Integration(value);
    await integration.save();
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('integration-created', { integration });
    
    res.status(201).json({
      message: 'Integration created successfully',
      integration
    });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// PUT /api/integrations/:id - Update integration
router.put('/:id', async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('integration-updated', { integration });
    
    res.json({
      message: 'Integration updated successfully',
      integration
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// DELETE /api/integrations/:id - Delete integration
router.delete('/:id', async (req, res) => {
  try {
    const integration = await Integration.findByIdAndDelete(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Delete associated logs
    await IntegrationLog.deleteMany({ integrationId: req.params.id });
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('integration-deleted', { integrationId: req.params.id });
    
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// POST /api/integrations/:id/sync - Trigger manual sync
router.post('/:id/sync', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (!integration.isActive) {
      return res.status(400).json({ error: 'Integration is not active' });
    }
    
    // Update integration status
    integration.status = 'syncing';
    await integration.save();
    
    // Emit socket event for real-time updates
    const io = req.app.get('socketio');
    io.emit('sync-started', { integrationId: req.params.id });
    
    // Trigger sync (async process)
    integrationService.performSync(integration).then(result => {
      io.emit('sync-completed', { 
        integrationId: req.params.id,
        result 
      });
    }).catch(error => {
      io.emit('sync-failed', { 
        integrationId: req.params.id,
        error: error.message 
      });
    });
    
    res.json({
      message: 'Sync triggered successfully',
      integrationId: req.params.id,
      status: 'syncing'
    });
  } catch (error) {
    console.error('Sync trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// GET /api/integrations/:id/logs - Get integration logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, operation } = req.query;
    
    const query = { integrationId: req.params.id };
    if (status) query.status = status;
    if (operation) query.operation = operation;
    
    const logs = await IntegrationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await IntegrationLog.countDocuments(query);
    
    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/integrations/:id/test-connection - Test connection
router.post('/:id/test-connection', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const testResult = await integrationService.testConnection(integration);
    
    res.json({
      message: 'Connection test completed',
      result: testResult
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// GET /api/integrations/:id/field-suggestions - Get AI field mapping suggestions
router.get('/:id/field-suggestions', async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const suggestions = await aiService.generateFieldMappings(
      integration.sourceOrg.objectType,
      integration.targetOrg.objectType
    );
    
    res.json({
      suggestions,
      metadata: {
        sourceObject: integration.sourceOrg.objectType,
        targetObject: integration.targetOrg.objectType,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Field suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate field suggestions' });
  }
});

module.exports = router;