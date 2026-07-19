const logger = require('../utils/logger');

/**
 * 404 handler for unknown routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Central error handler — keeps error responses consistent across the API.
 * Logs structured error info via Winston.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose missing schema (strict mode)
  if (err.name === 'StrictModeError') {
    statusCode = 400;
    message = `Field "${err.path}" is not allowed in the schema`;
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // Log error with context
  const logMeta = {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    userId: req.user?._id?.toString(),
    orgId: req.orgId,
  };

  if (statusCode >= 500) {
    logger.error(`[${req.requestId}] ${err.message}`, {
      ...logMeta,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  } else if (statusCode >= 400) {
    logger.warn(`[${req.requestId}] ${err.message}`, logMeta);
  }

  res.status(statusCode).json({
    message,
    code: err.code || undefined,
    requestId: req.requestId,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
