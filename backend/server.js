const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Import routes
const integrationRoutes = require('./routes/integrations');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection (Free MongoDB Atlas)
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/multiorg-integration';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5, // Limit connections for free tier
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('socketio', io);

// Routes
app.use('/api/integrations', integrationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Org Integration Platform API',
    version: '1.0.0',
    status: 'active',
    documentation: '/api/docs',
    endpoints: {
      integrations: '/api/integrations',
      analytics: '/api/analytics',
      webhooks: '/api/webhooks',
      health: '/api/health'
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Multi-Org Integration Platform API Documentation',
    version: '1.0.0',
    description: 'AI-powered integration platform for Salesforce multi-org synchronization',
    endpoints: {
      'GET /api/integrations': 'Get all integrations',
      'POST /api/integrations': 'Create new integration',
      'PUT /api/integrations/:id': 'Update integration',
      'DELETE /api/integrations/:id': 'Delete integration',
      'POST /api/integrations/:id/sync': 'Trigger sync',
      'GET /api/analytics/dashboard': 'Get dashboard metrics',
      'GET /api/analytics/performance': 'Get performance data',
      'POST /api/webhooks/salesforce': 'Salesforce webhook endpoint',
      'GET /api/health': 'Health check endpoint'
    },
    author: 'Riya Singh',
    github: 'https://github.com/riya037/multi-org-integration-platform'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Multi-Org Integration Platform API running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Docs: http://localhost:${PORT}/api/docs`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close();
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;