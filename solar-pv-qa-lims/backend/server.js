require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const serviceRequestRoutes = require('./routes/serviceRequests');
const sampleRoutes = require('./routes/samples');
const testPlanRoutes = require('./routes/testPlans');
const reportRoutes = require('./routes/reports');
const labFacilityRoutes = require('./routes/labFacilities');
const certificationRoutes = require('./routes/certifications');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - critical for Railway deployment (proper IP detection behind reverse proxy)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/test-plans', testPlanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/lab-facilities', labFacilityRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Solar PV QA LIMS API',
    version: '1.0.0',
    description: 'Laboratory Information Management System for Solar PV Quality Assurance',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user'
      },
      serviceRequests: {
        'GET /api/service-requests': 'List all service requests',
        'POST /api/service-requests': 'Create a new service request',
        'GET /api/service-requests/:id': 'Get service request by ID',
        'PUT /api/service-requests/:id': 'Update service request',
        'DELETE /api/service-requests/:id': 'Delete service request'
      },
      samples: {
        'GET /api/samples': 'List all samples',
        'POST /api/samples': 'Register a new sample',
        'GET /api/samples/:id': 'Get sample by ID',
        'PUT /api/samples/:id': 'Update sample',
        'DELETE /api/samples/:id': 'Delete sample',
        'GET /api/samples/:id/chain-of-custody': 'Get sample chain of custody'
      },
      testPlans: {
        'GET /api/test-plans': 'List all test plans',
        'POST /api/test-plans': 'Create a new test plan',
        'GET /api/test-plans/:id': 'Get test plan by ID',
        'PUT /api/test-plans/:id': 'Update test plan',
        'DELETE /api/test-plans/:id': 'Delete test plan',
        'POST /api/test-plans/:id/results': 'Add test results'
      },
      reports: {
        'GET /api/reports': 'List all reports',
        'POST /api/reports': 'Generate a new report',
        'GET /api/reports/:id': 'Get report by ID',
        'GET /api/reports/:id/download': 'Download report'
      },
      labFacilities: {
        'GET /api/lab-facilities': 'List all lab facilities',
        'POST /api/lab-facilities': 'Create a new lab facility',
        'GET /api/lab-facilities/:id': 'Get lab facility by ID',
        'PUT /api/lab-facilities/:id': 'Update lab facility'
      },
      certifications: {
        'GET /api/certifications': 'List all certifications',
        'POST /api/certifications': 'Create a new certification',
        'GET /api/certifications/:id': 'Get certification by ID',
        'GET /api/certifications/:id/download': 'Download certificate'
      },
      dashboard: {
        'GET /api/dashboard/stats': 'Get dashboard statistics',
        'GET /api/dashboard/recent-activity': 'Get recent activity',
        'GET /api/dashboard/kpis': 'Get key performance indicators'
      }
    },
    standards: [
      'IEC 61215 - Crystalline Silicon Terrestrial PV Modules',
      'IEC 61730 - PV Module Safety Qualification',
      'IEC 62716 - Ammonia Corrosion Testing',
      'IEC 61701 - Salt Mist Corrosion Testing',
      'IEC 62804 - PID Testing',
      'UL 1703 - Safety Standard for Flat-Plate PV Modules'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Solar PV QA LIMS API running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
