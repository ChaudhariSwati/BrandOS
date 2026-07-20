// Vercel serverless entry for BrandOS API
// This avoids the app.listen() call from server/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || '*';

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

app.use(cors({
  origin: [CLIENT_URL, ...(NODE_ENV === 'development' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [])],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time'],
}));

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

// Health check
app.get('/api/health', function (req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', require('../server/src/routes/authRoutes'));
app.use('/api/orgs', require('../server/src/routes/orgRoutes'));
app.use('/api/brandkits', require('../server/src/routes/brandKitRoutes'));
app.use('/api/assets', require('../server/src/routes/assetRoutes'));
app.use('/api/export', require('../server/src/routes/exportRoutes'));
app.use('/api/demo', require('../server/src/routes/demoRoutes'));

// Error handler
app.use(function (err, req, res, next) {
  console.error('Serverless Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;

