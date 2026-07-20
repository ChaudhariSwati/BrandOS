require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const requestMiddleware = require('./middleware/requestMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", 'https://fonts.googleapis.com'],
    },
  } : false,
}));

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  /^https:\/\/brand-os-bnj3-.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(function (o) {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    if (allowed) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    return callback(null, true); // Allow anyway for public API access
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
}));

app.use(requestMiddleware);

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: function (req, res) {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static('uploads'));
app.use('/api/', apiLimiter);

app.get('/api/health', function (req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    environment: NODE_ENV,
  });
});

app.get('/api/health/ready', function (req, res) {
  var dbState = 'unknown';
  try {
    dbState = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
  } catch (e) {
    dbState = 'not_loaded';
  }
  res.json({ status: 'ready', dbState: dbState });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orgs', require('./routes/orgRoutes'));
app.use('/api/brandkits', require('./routes/brandKitRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/demo', require('./routes/demoRoutes'));

app.use(notFound);
app.use(errorHandler);

// Start server first, then connect DB asynchronously
var server = app.listen(PORT, function () {
  console.log('  Server running on port ' + PORT);
  console.log('  Environment: ' + NODE_ENV);
  console.log('  Client URL: ' + CLIENT_URL);
  console.log('');
});

connectDB().catch(function () {
  console.warn('MongoDB unavailable – demo endpoints still work');
});

connectRedis().catch(function () {
  // non-blocking
});

function shutdown(signal) {
  logger.info(signal + ' received – shutting down');
  server.close(function () {
    var mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      mongoose.disconnect().catch(function () {});
    }
    process.exit(0);
  });
  setTimeout(function () { process.exit(1); }, 10000);
}

process.on('SIGTERM', function () { shutdown('SIGTERM'); });
process.on('SIGINT', function () { shutdown('SIGINT'); });

process.on('unhandledRejection', function (err) {
  logger.error('Unhandled Rejection', { error: err && err.message });
});

process.on('uncaughtException', function (err) {
  logger.error('Uncaught Exception', { error: err && err.message });
  process.exit(1);
});

module.exports = app;
