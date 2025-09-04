const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, syncDatabase } = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const contractRoutes = require('./routes/contractRoutes');
const taskRoutes = require('./routes/taskRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const financialRoutes = require('./routes/financialRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const riskRoutes = require('./routes/riskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const designRoutes = require('./routes/designRoutes');
const jobCostRoutes = require('./routes/jobCostRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'VVD Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/job-costs', jobCostRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    await testConnection();
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;