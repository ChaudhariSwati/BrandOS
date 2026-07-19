const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Attaches a unique request ID and start time to every request.
 * Also creates a request-scoped child logger.
 */
function requestMiddleware(req, res, next) {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Create a child logger scoped to this request
  req.log = logger.withRequest({
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Set response header for tracing
  res.setHeader('X-Request-Id', req.requestId);

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    req.log[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      statusCode: res.statusCode,
      duration,
    });

    // Add response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
}

module.exports = requestMiddleware;
