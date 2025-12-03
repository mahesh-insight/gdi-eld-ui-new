// src/lib/cache/serverCache.js
/**
 * Universal Server Cache System
 * Scales from low to high-level applications
 * Supports: Memory -> Redis -> Database progression
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_MEMORY_ENTRIES = 1000; // Prevent memory overflow
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Cache implementation interface
class CacheAdapter {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, data, ttl) { throw new Error('Not implemented'); }
  async delete(key) { throw new Error('Not implemented'); }
  async clear() { throw new Error('Not implemented'); }
  async getStats() { throw new Error('Not implemented'); }
}

// 1. MEMORY CACHE - For low/mid applications
class MemoryCache extends CacheAdapter {
  constructor() {
    super();
    if (!global.appCache) {
      global.appCache = new Map();
      this.startCleanupTimer();
    }
  }

  async get(key) {
    const cached = global.appCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      global.appCache.delete(key);
      return null;
    }

    return cached.data;
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    // Memory protection
    if (global.appCache.size >= MAX_MEMORY_ENTRIES) {
      this.evictOldest();
    }

    global.appCache.set(key, {
      data,
      expiry: Date.now() + ttl,
      created: Date.now()
    });
  }

  async delete(key) {
    return global.appCache.delete(key);
  }

  async clear() {
    global.appCache.clear();
  }

  async getStats() {
    const memory = process.memoryUsage();
    return {
      type: 'memory',
      entries: global.appCache.size,
      memoryUsage: {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`
      },
      keys: Array.from(global.appCache.keys()).slice(0, 10) // First 10 keys
    };
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, value] of global.appCache.entries()) {
      if (value.created < oldestTime) {
        oldestTime = value.created;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      global.appCache.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of global.appCache.entries()) {
      if (now > value.expiry) {
        global.appCache.delete(key);
      }
    }
  }

  startCleanupTimer() {
    if (!global.cacheCleanupTimer) {
      global.cacheCleanupTimer = setInterval(() => {
        this.cleanup();
      }, CLEANUP_INTERVAL);
    }
  }
}

// 2. REDIS CACHE - For high-level applications
class RedisCache extends CacheAdapter {
  constructor(redisClient) {
    super();
    this.redis = redisClient;
  }

  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    try {
      await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key) {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async clear() {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }

  async getStats() {
    try {
      const info = await this.redis.info('memory');
      return {
        type: 'redis',
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {})
      };
    } catch (error) {
      return { type: 'redis', error: error.message };
    }
  }
}

// 3. CACHE MANAGER - Auto-selects best implementation
class CacheManager {
  constructor() {
    this.cache = this.initializeCache();
  }

  initializeCache() {
    // Try Redis first (production)
    if (process.env.REDIS_URL) {
      try {
        // Lazy load Redis to avoid bundle bloat
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL);
        console.log('🚀 Cache: Using Redis for high-performance caching');
        return new RedisCache(redis);
      } catch (error) {
        console.warn('⚠️ Cache: Redis unavailable, falling back to memory');
      }
    }

    // Fallback to memory cache
    console.log('🚀 Cache: Using in-memory caching');
    return new MemoryCache();
  }

  // Universal cache interface
  async get(key) {
    const start = Date.now();
    const result = await this.cache.get(key);
    const duration = Date.now() - start;
    
    if (result) {
      console.log(`🎯 Cache HIT: ${key} (${duration}ms)`);
    } else {
      console.log(`❌ Cache MISS: ${key} (${duration}ms)`);
    }
    
    return result;
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    const start = Date.now();
    await this.cache.set(key, data, ttl);
    const duration = Date.now() - start;
    console.log(`💾 Cache SET: ${key} (${duration}ms)`);
  }

  async getOrSet(key, fetchFn, ttl = DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    console.log(`🔄 Cache: Fetching fresh data for ${key}`);
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  async delete(key) {
    return await this.cache.delete(key);
  }

  async clear() {
    return await this.cache.clear();
  }

  async getStats() {
    return await this.cache.getStats();
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern) {
    const stats = await this.getStats();
    if (stats.keys) {
      const keysToDelete = stats.keys.filter(key => 
        key.includes(pattern) || key.match(new RegExp(pattern))
      );
      
      for (const key of keysToDelete) {
        await this.delete(key);
      }
      
      console.log(`🧹 Cache: Invalidated ${keysToDelete.length} keys matching "${pattern}"`);
    }
  }

  async invalidateUser(userId) {
    await this.invalidatePattern(`-${userId}-`);
  }

  async invalidatePage(pageName) {
    await this.invalidatePattern(`${pageName}-`);
  }
}

// Singleton cache manager
let cacheInstance = null;

export function getCache() {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
}

// Utility functions for easy usage
export async function getCached(key) {
  const cache = getCache();
  return await cache.get(key);
}

export async function setCached(key, data, ttl) {
  const cache = getCache();
  return await cache.set(key, data, ttl);
}

export async function getOrSetCached(key, fetchFn, ttl) {
  const cache = getCache();
  return await cache.getOrSet(key, fetchFn, ttl);
}

export async function invalidateCache(pattern) {
  const cache = getCache();
  return await cache.invalidatePattern(pattern);
}

export async function getCacheStats() {
  const cache = getCache();
  return await cache.getStats();
}

// Export cache manager for direct access
export { CacheManager };