const { getRedisClient, isReady } = require('../config/redis');

/**
 * Production caching layer backed by Redis with in-memory fallback.
 *
 * Usage:
 *   const cached = await cache.get('key');
 *   if (!cached) {
 *     cached = await computeExpensiveValue();
 *     await cache.set('key', cached, 3600);
 *   }
 */

// In-memory fallback store (used when Redis is unavailable)
const memoryStore = new Map();

// Default TTL: 10 minutes
const DEFAULT_TTL = 600;

const cache = {
  /**
   * Get a cached value by key.
   * @param {string} key
   * @returns {Promise<*|null>}
   */
  async get(key) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        const raw = await client.get(key);
        if (raw) return JSON.parse(raw);
        return null;
      }
    } catch (err) {
      console.warn(`[Cache] Redis get failed for "${key}": ${err.message}`);
    }

    // Fallback to in-memory
    if (memoryStore.has(key)) {
      const entry = memoryStore.get(key);
      if (entry.expiry > Date.now()) return entry.value;
      memoryStore.delete(key);
    }
    return null;
  },

  /**
   * Set a cached value with optional TTL (seconds).
   * @param {string} key
   * @param {*} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        await client.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      }
    } catch (err) {
      console.warn(`[Cache] Redis set failed for "${key}": ${err.message}`);
    }

    // Fallback to in-memory
    memoryStore.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    // Prevent unbounded memory growth — evict oldest entries if >1000
    if (memoryStore.size > 1000) {
      const oldestKey = memoryStore.keys().next().value;
      memoryStore.delete(oldestKey);
    }
  },

  /**
   * Delete a cached key.
   * @param {string} key
   */
  async del(key) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        await client.del(key);
      }
    } catch (err) {
      console.warn(`[Cache] Redis del failed for "${key}": ${err.message}`);
    }
    memoryStore.delete(key);
  },

  /**
   * Invalidate all cache entries matching a pattern (Redis only).
   * @param {string} pattern — e.g. "brandkits:*"
   */
  async invalidatePattern(pattern) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        let cursor = '0';
        do {
          const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          const keys = result[1];
          if (keys.length > 0) {
            await client.del(...keys);
          }
        } while (cursor !== '0');
      }
    } catch (err) {
      console.warn(`[Cache] Redis pattern invalidation failed: ${err.message}`);
    }
  },

  /**
   * Clear everything (both Redis and in-memory).
   */
  async flushAll() {
    try {
      if (isReady()) {
        const client = getRedisClient();
        await client.flushall();
      }
    } catch (err) {
      console.warn(`[Cache] Redis flush failed: ${err.message}`);
    }
    memoryStore.clear();
  },

  /**
   * Generate a consistent cache key from parts.
   * @param  {...string} parts
   * @returns {string}
   */
  key(...parts) {
    return `brandos:${parts.join(':')}`;
  },

  /** Number of in-memory entries (for monitoring). */
  get memorySize() {
    return memoryStore.size;
  },
};

module.exports = cache;
