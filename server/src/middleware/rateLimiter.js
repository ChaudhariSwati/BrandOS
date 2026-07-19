const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter — 100 requests per minute per IP.
 * Behind a reverse proxy (NGINX, ELB), trust the X-Forwarded-For header.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
});

/**
 * Strict rate limiter for auth endpoints — 10 attempts per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

/**
 * Puppeteer export endpoint limiter — 5 requests per minute per user session.
 * Rendering is CPU-heavy, so we need to protect against abuse.
 * Uses the default IP-based key generator (no custom keyGenerator needed).
 */
const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { message: 'Export rate limit reached. Please wait before exporting again.' },
  skip: (req) => {
    // Allow pro tier users higher limits (checked via org tier in req.user)
    return req.user?.tier === 'pro';
  },
});

module.exports = { apiLimiter, authLimiter, exportLimiter };
