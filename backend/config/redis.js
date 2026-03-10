const Redis = require('ioredis');
// Redis configuration with in-memory fallback for development without a Redis server
let redisConnected = false;
const realRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 times if no Redis
    return 2000;
  }
});

const mockCache = new Map();
const redis = {
  get: async (key) => (redisConnected ? realRedis.get(key) : mockCache.get(key)),
  set: async (key, val, ex, ttl) => (redisConnected ? realRedis.set(key, val, ex, ttl) : mockCache.set(key, val)),
  del: async (key) => (redisConnected ? realRedis.del(key) : mockCache.delete(key)),
  on: (event, handler) => realRedis.on(event, handler)
};

realRedis.on('connect', () => { redisConnected = true; console.log('Redis connected'); });
realRedis.on('error', (err) => { redisConnected = false; });
module.exports = redis;