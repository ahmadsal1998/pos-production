import { createClient, RedisClientType } from 'redis';
import { log } from './logger';

let redisClient: RedisClientType | null = null;
let redisConnectionAttempted = false;
let redisConnectionFailed = false;
let redisReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2000;

/**
 * Initialize Redis client with production-ready configuration
 */
export async function initRedis(): Promise<RedisClientType | null> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (redisConnectionFailed && !isProduction) {
    return null;
  }

  if (redisConnectionAttempted && !redisClient && !isProduction) {
    return null;
  }

  redisConnectionAttempted = true;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  if (isProduction || process.env.REDIS_URL) {
    log.info(`Redis: Attempting to connect to ${redisUrl.replace(/:[^:@]+@/, ':****@')}...`);
  }
  
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        redisReconnectAttempts = retries;
        
        if (isProduction) {
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            log.warn(`Redis: Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Will retry on next operation.`);
            redisConnectionFailed = true;
            return false;
          }
          const delay = Math.min(retries * 500, 5000);
          if (retries % 5 === 0) {
            log.debug(`Redis: Reconnection attempt ${retries}/${MAX_RECONNECT_ATTEMPTS} (delay: ${delay}ms)`);
          }
          return delay;
        }
        
        if (retries > 3) {
          redisConnectionFailed = true;
          return false;
        }
        return Math.min(retries * 500, 2000);
      },
      connectTimeout: 10000,
      keepAlive: 30000,
    },
    pingInterval: 30000,
  });

  let errorLogged = false;
  redisClient.on('error', (err: any) => {
    if (!errorLogged || redisReconnectAttempts % 10 === 0) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
          if (!errorLogged) {
            if (isProduction || process.env.REDIS_URL) {
              log.warn('Redis: Not available (connection refused). Caching will be disabled.');
              if (!isProduction) {
                log.info('To enable caching, start Redis: redis-server');
              } else {
                log.warn('Check REDIS_URL environment variable and ensure Redis server is running.');
              }
            }
            errorLogged = true;
          }
          redisConnectionFailed = true;
        } else {
          if (isProduction || process.env.REDIS_URL) {
            log.error(`Redis error: ${err.message}`, err);
          }
          if (!isProduction) {
            redisConnectionFailed = true;
          }
        }
    }
  });

  redisClient.on('ready', () => {
    if (isProduction || process.env.REDIS_URL) {
      log.info('Redis: Connected and ready for caching');
    }
    redisConnectionFailed = false;
    redisReconnectAttempts = 0;
    errorLogged = false;
  });

  redisClient.on('reconnecting', () => {
    if (isProduction || process.env.REDIS_URL) {
      if (redisReconnectAttempts % 5 === 0) {
        log.debug('Redis: Reconnecting...');
      }
    }
  });

  redisClient.on('connect', () => {
    if (isProduction || process.env.REDIS_URL) {
      log.debug('Redis: Connection established');
    }
    redisConnectionFailed = false;
  });

  try {
    await redisClient.connect();
    await redisClient.ping();
    if (isProduction || process.env.REDIS_URL) {
      log.info('Redis: Connection verified and ready');
    }
    
    return redisClient;
  } catch (error: any) {
    if (!errorLogged) {
      if (isProduction || process.env.REDIS_URL) {
        if (isProduction) {
          log.error('Redis: Initial connection failed. Will retry on operations.', error);
          log.warn('The system will continue without caching until Redis is available.');
        } else {
          log.warn('Redis: Connection failed. Caching will be disabled.');
          log.info('To enable caching, start Redis: redis-server');
        }
      }
      errorLogged = true;
    }
    
    if (!isProduction) {
      redisConnectionFailed = true;
      redisClient = null;
    }
    return null;
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && redisClient && !redisClient.isOpen) {
    try {
      await redisClient.connect();
      return redisClient;
    } catch (error) {
      return null;
    }
  }

  return null;
}

export function getRedisClientSync(): RedisClientType | null {
  return redisClient && redisClient.isOpen ? redisClient : null;
}

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

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

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis GET error for key ${key}:`, error.message);
      }
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis SET error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis DEL error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  async delPattern(pattern: string): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;

    try {
      const isProduction = process.env.NODE_ENV === 'production';
      let deletedCount = 0;
      
      if (isProduction) {
        const iterator = client.scanIterator({
          MATCH: pattern,
          COUNT: 100,
        });
        
        const keysToDelete: string[] = [];
        for await (const key of iterator) {
          keysToDelete.push(key);
          if (keysToDelete.length >= 100) {
            const count = await client.del(keysToDelete);
            deletedCount += count;
            keysToDelete.length = 0;
          }
        }
        
        if (keysToDelete.length > 0) {
          const count = await client.del(keysToDelete);
          deletedCount += count;
        }
      } else {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await client.del(keys);
        }
      }
      
      return deletedCount;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development' || !error.message?.includes('Connection')) {
        console.error(`Redis DEL pattern error for ${pattern}:`, error.message);
      }
      return 0;
    }
  },
};
