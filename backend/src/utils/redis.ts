import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisConnectionAttempted = false;
let redisConnectionFailed = false;
let redisReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2000;

/**
 * Initialize Redis client with production-ready configuration
 * Connects to Redis server using REDIS_URL or default localhost
 * Fails gracefully if Redis is not available, but keeps retrying in production
 */
export async function initRedis(): Promise<RedisClientType | null> {
  // If we have a working client, return it
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // In production, allow retries even after initial failure
  const isProduction = process.env.NODE_ENV === 'production';
  if (redisConnectionFailed && !isProduction) {
    return null; // In dev, don't retry after failure
  }

  if (redisConnectionAttempted && !redisClient && !isProduction) {
    return null; // In dev, don't retry if already attempted
  }

  redisConnectionAttempted = true;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  console.log(`🔌 Redis: Attempting to connect to ${redisUrl.replace(/:[^:@]+@/, ':****@')}...`);
  
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        redisReconnectAttempts = retries;
        
        // In production, keep retrying with exponential backoff
        if (isProduction) {
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            console.warn(`⚠️  Redis: Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Will retry on next operation.`);
            redisConnectionFailed = true;
            return false; // Stop automatic reconnection, but allow manual retry
          }
          const delay = Math.min(retries * 500, 5000);
          if (retries % 5 === 0) {
            console.log(`🔄 Redis: Reconnection attempt ${retries}/${MAX_RECONNECT_ATTEMPTS} (delay: ${delay}ms)`);
          }
          return delay;
        }
        
        // In development, stop after 3 attempts
        if (retries > 3) {
          redisConnectionFailed = true;
          return false;
        }
        return Math.min(retries * 500, 2000);
      },
      connectTimeout: 10000, // 10 second timeout for production
      keepAlive: 30000, // Keep connection alive
    },
    // Production-ready settings
    pingInterval: 30000, // Ping every 30 seconds to keep connection alive
  });

  // Error handling with better logging
  let errorLogged = false;
  redisClient.on('error', (err: any) => {
    if (!errorLogged || redisReconnectAttempts % 10 === 0) {
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        if (!errorLogged) {
          console.warn('⚠️  Redis: Not available (connection refused). Caching will be disabled.');
          if (!isProduction) {
            console.warn('   To enable caching, start Redis: redis-server');
          } else {
            console.warn('   Check REDIS_URL environment variable and ensure Redis server is running.');
          }
          errorLogged = true;
        }
        redisConnectionFailed = true;
      } else {
        console.error(`❌ Redis error: ${err.message}`);
        // Don't mark as failed for transient errors in production
        if (!isProduction) {
          redisConnectionFailed = true;
        }
      }
    }
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis: Connected and ready for caching');
    redisConnectionFailed = false;
    redisReconnectAttempts = 0;
    errorLogged = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis: Reconnecting...');
  });

  redisClient.on('connect', () => {
    console.log('🔌 Redis: Connection established');
    redisConnectionFailed = false;
  });

  try {
    await redisClient.connect();
    
    // Verify connection with a ping
    await redisClient.ping();
    console.log('✅ Redis: Connection verified and ready');
    
    return redisClient;
  } catch (error: any) {
    if (!errorLogged) {
      if (isProduction) {
        console.error('❌ Redis: Initial connection failed. Will retry on operations.');
        console.error(`   Error: ${error.message}`);
        console.error('   The system will continue without caching until Redis is available.');
      } else {
        console.warn('⚠️  Redis: Connection failed. Caching will be disabled.');
        console.warn('   To enable caching, start Redis: redis-server');
      }
      errorLogged = true;
    }
    
    // In production, don't mark as permanently failed - allow retries
    if (!isProduction) {
      redisConnectionFailed = true;
      redisClient = null;
    }
    return null;
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is not available
 * In production, will attempt to reconnect if connection was lost
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  // If we have a working client, return it
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // In production, try to reconnect if connection was lost
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && redisClient && !redisClient.isOpen) {
    try {
      await redisClient.connect();
      return redisClient;
    } catch (error) {
      // Connection failed, will retry on next call
      return null;
    }
  }

  return null;
}

/**
 * Synchronous version for backward compatibility
 * Use getRedisClient() async version in new code
 */
export function getRedisClientSync(): RedisClientType | null {
  return redisClient && redisClient.isOpen ? redisClient : null;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check if Redis is available and healthy
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): {
  connected: boolean;
  available: boolean;
  url?: string;
} {
  const isConnected = redisClient !== null && redisClient.isOpen;
  return {
    connected: isConnected,
    available: !redisConnectionFailed,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  };
}

/**
 * Cache utility functions with production-ready error handling
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error: any) {
      // Only log errors in development or if it's not a connection issue
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis GET error for key ${key}:`, error.message);
      }
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error: any) {
      // Only log errors in development or if it's not a connection issue
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis SET error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error: any) {
      // Only log errors in development or if it's not a connection issue
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis DEL error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   * Note: SCAN is preferred over KEYS in production for large datasets
   */
  async delPattern(pattern: string): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;

    try {
      // Use SCAN instead of KEYS for production (non-blocking)
      const isProduction = process.env.NODE_ENV === 'production';
      let deletedCount = 0;
      
      if (isProduction) {
        // Use SCAN for production (safer for large datasets)
        const iterator = client.scanIterator({
          MATCH: pattern,
          COUNT: 100,
        });
        
        const keysToDelete: string[] = [];
        for await (const key of iterator) {
          keysToDelete.push(key);
          // Delete in batches of 100
          if (keysToDelete.length >= 100) {
            const count = await client.del(keysToDelete);
            deletedCount += count;
            keysToDelete.length = 0;
          }
        }
        
        // Delete remaining keys
        if (keysToDelete.length > 0) {
          const count = await client.del(keysToDelete);
          deletedCount += count;
        }
      } else {
        // Use KEYS for development (simpler)
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await client.del(keys);
        }
      }
      
      return deletedCount;
    } catch (error: any) {
      // Only log errors in development or if it's not a connection issue
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis DEL pattern error for ${pattern}:`, error.message);
      }
      return 0;
    }
  },
};

