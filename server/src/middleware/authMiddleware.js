const jwt = require('jsonwebtoken');
const User = require('../models/User');
const cache = require('../utils/cache');

// Fallback JWT secret for demo mode — allows demo to work without .env
const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'demo-fallback-secret-brandos-2024';
};

/**
 * Protect routes — verifies the JWT access token and attaches the
 * authenticated user (minus password) to req.user.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.log?.warn('No auth token provided');
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Only accept access-type tokens for route protection
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type. Use an access token.' });
    }

    // ── DEMO MODE ──────────────────────────────────────
    // If the token is a demo token, construct the user from token payload
    // without hitting the database. This allows the demo to work even when
    // MongoDB is unavailable.
    if (decoded.isDemo) {
      req.user = {
        _id: decoded.id,
        name: 'Demo User',
        email: 'demo@brandos.io',
        role: decoded.role,
        org: decoded.org,
        isDemo: true,
      };
      req.orgId = decoded.org;
      req.tokenPayload = decoded;
      return next();
    }

    // Check Redis blacklist first (fast path)
    const blacklisted = await cache.get(cache.key('blacklist', decoded.id, token.substring(0, 16)));
    if (blacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    // Fetch user from cache or DB
    const cacheKey = cache.key('user', decoded.id);
    let user = await cache.get(cacheKey);

    if (!user) {
      user = await User.findById(decoded.id).select('-password').lean();
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      // Cache user for 5 minutes
      await cache.set(cacheKey, user, 300);
    }

    req.user = user;
    req.orgId = user.org?.toString();

    // Attach decoded token info for downstream use
    req.tokenPayload = decoded;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: err.expiredAt,
      });
    }
    req.log?.warn('Invalid auth token', { error: err.message });
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

/**
 * Optional auth — similar to protect but does not fail if no token.
 * Sets req.user if valid token present, otherwise continues silently.
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Handle demo tokens
    if (decoded.isDemo) {
      req.user = {
        _id: decoded.id,
        name: 'Demo User',
        email: 'demo@brandos.io',
        role: decoded.role,
        org: decoded.org,
        isDemo: true,
      };
      req.orgId = decoded.org;
      req.tokenPayload = decoded;
      return next();
    }

    const user = await User.findById(decoded.id).select('-password').lean();
    if (user) {
      req.user = user;
      req.orgId = user.org?.toString();
      req.tokenPayload = decoded;
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
};

/**
 * Role-based access guard.
 * Must be used after `protect`.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      req.log?.warn(`Role check failed: user has "${req.user.role}", required "${allowedRoles.join(', ')}"`);
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

module.exports = { protect, optionalAuth, requireRole };
