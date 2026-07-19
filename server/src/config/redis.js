const Redis = require('ioredis');

let redisClient = null;
let isRedisAvailable = false;

const REDIS_URL = process.env.REDIS_URL || '';

/**
 * Creates and returns a Redis client with reconnection logic.
 * Falls back gracefully to in-memory cache if Redis is unavailable.
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  if (!REDIS_URL) {
    console.warn('[Redis] No REDIS_URL provided — caching will use in-memory fallback');
    return null;
  }

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        console.error('[Redis] Max retry attempts reached — disabling Redis cache');
        isRedisAvailable = false;
        return null; // stop retrying
      }
      return Math.min(times * 200, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected');
    isRedisAvailable = true;
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
    isRedisAvailable = false;
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.connect();
  } catch (err) {
    console.warn('[Redis] Initial connection failed — using in-memory fallback');
    isRedisAvailable = false;
  }
}

function isReady() {
  return isRedisAvailable && redisClient?.status === 'ready';
}

module.exports = { getRedisClient, connectRedis, isReady };
