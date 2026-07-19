const winston = require('winston');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure timestamp format is consistent across transports
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'brandos-api' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    // Write error logs to separate file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  // Do not exit on uncaught exceptions — let the process handle it gracefully
  exitOnError: false,
});

// In non-production, also log to the console
if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

/**
 * Creates a child logger with request-specific metadata.
 * @param {object} meta — e.g. { requestId, userId, orgId }
 * @returns {winston.Logger}
 */
logger.withRequest = (meta) => {
  return logger.child(meta);
};

module.exports = logger;
