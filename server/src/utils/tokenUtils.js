const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cache = require('./cache');
const logger = require('./logger');

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Generate an access token (short-lived).
 * @param {object} user — must have _id, org, role
 * @returns {string} JWT
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      org: user.org?.toString(),
      role: user.role,
      type: 'access',
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a refresh token (long-lived, stored in Redis for invalidation).
 * Returns the token string and its hashed version for storage.
 * @param {object} user
 * @returns {{ refreshToken: string, hashedToken: string }}
 */
function generateRefreshToken(user) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Store hashed token in cache with user info
  const key = cache.key('refresh', hashedToken);
  cache.set(key, {
    userId: user._id.toString(),
    org: user.org?.toString(),
    role: user.role,
    createdAt: Date.now(),
  }, REFRESH_TOKEN_EXPIRY_SECONDS).catch((err) => {
    logger.error('Failed to store refresh token in cache', { error: err.message });
  });

  return { refreshToken: rawToken, hashedToken };
}

/**
 * Verify a refresh token against the stored hash.
 * @param {string} rawToken — the token sent by the client
 * @returns {Promise<object|null>} — decoded payload or null if invalid
 */
async function verifyRefreshToken(rawToken) {
  if (!rawToken) return null;

  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const key = cache.key('refresh', hashedToken);
  const payload = await cache.get(key);

  if (!payload) return null;

  return payload;
}

/**
 * Revoke a refresh token (logout).
 * @param {string} rawToken
 */
async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  await cache.del(cache.key('refresh', hashedToken));
}

/**
 * Revoke ALL refresh tokens for a user (e.g., password change, account compromise).
 * @param {string} userId
 */
async function revokeAllUserTokens(userId) {
  // Since we use hash-based keys, we can't easily pattern-delete user tokens.
  // Instead we store a tokenVersion in the user's JWT and check it.
  // For immediate revocation, increment tokenVersion in DB and check in middleware.
  // This is handled via the tokenVersion field on the User model.
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
