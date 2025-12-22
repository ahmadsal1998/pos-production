"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var redis_exports = {};
__export(redis_exports, {
  cache: () => cache,
  closeRedis: () => closeRedis,
  getRedisClient: () => getRedisClient,
  getRedisClientSync: () => getRedisClientSync,
  getRedisStatus: () => getRedisStatus,
  initRedis: () => initRedis,
  isRedisAvailable: () => isRedisAvailable
});
module.exports = __toCommonJS(redis_exports);
var import_redis = require("redis");
var import_logger = require("./logger");
let redisClient = null;
let redisConnectionAttempted = false;
let redisConnectionFailed = false;
let redisReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2e3;
async function initRedis() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  const isProduction = process.env.NODE_ENV === "production";
  if (redisConnectionFailed && !isProduction) {
    return null;
  }
  if (redisConnectionAttempted && !redisClient && !isProduction) {
    return null;
  }
  redisConnectionAttempted = true;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  if (isProduction || process.env.REDIS_URL) {
    import_logger.log.info(`Redis: Attempting to connect to ${redisUrl.replace(/:[^:@]+@/, ":****@")}...`);
  }
  redisClient = (0, import_redis.createClient)({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        redisReconnectAttempts = retries;
        if (isProduction) {
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            import_logger.log.warn(`Redis: Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Will retry on next operation.`);
            redisConnectionFailed = true;
            return false;
          }
          const delay = Math.min(retries * 500, 5e3);
          if (retries % 5 === 0) {
            import_logger.log.debug(`Redis: Reconnection attempt ${retries}/${MAX_RECONNECT_ATTEMPTS} (delay: ${delay}ms)`);
          }
          return delay;
        }
        if (retries > 3) {
          redisConnectionFailed = true;
          return false;
        }
        return Math.min(retries * 500, 2e3);
      },
      connectTimeout: 1e4,
      // 10 second timeout for production
      keepAlive: 3e4
      // Keep connection alive
    },
    // Production-ready settings
    pingInterval: 3e4
    // Ping every 30 seconds to keep connection alive
  });
  let errorLogged = false;
  redisClient.on("error", (err) => {
    if (!errorLogged || redisReconnectAttempts % 10 === 0) {
      if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
        if (!errorLogged) {
          if (isProduction || process.env.REDIS_URL) {
            import_logger.log.warn("Redis: Not available (connection refused). Caching will be disabled.");
            if (!isProduction) {
              import_logger.log.info("To enable caching, start Redis: redis-server");
            } else {
              import_logger.log.warn("Check REDIS_URL environment variable and ensure Redis server is running.");
            }
          }
          errorLogged = true;
        }
        redisConnectionFailed = true;
      } else {
        if (isProduction || process.env.REDIS_URL) {
          import_logger.log.error(`Redis error: ${err.message}`, err);
        }
        if (!isProduction) {
          redisConnectionFailed = true;
        }
      }
    }
  });
  redisClient.on("ready", () => {
    if (isProduction || process.env.REDIS_URL) {
      import_logger.log.info("Redis: Connected and ready for caching");
    }
    redisConnectionFailed = false;
    redisReconnectAttempts = 0;
    errorLogged = false;
  });
  redisClient.on("reconnecting", () => {
    if (isProduction || process.env.REDIS_URL) {
      if (redisReconnectAttempts % 5 === 0) {
        import_logger.log.debug("Redis: Reconnecting...");
      }
    }
  });
  redisClient.on("connect", () => {
    if (isProduction || process.env.REDIS_URL) {
      import_logger.log.debug("Redis: Connection established");
    }
    redisConnectionFailed = false;
  });
  try {
    await redisClient.connect();
    await redisClient.ping();
    if (isProduction || process.env.REDIS_URL) {
      import_logger.log.info("Redis: Connection verified and ready");
    }
    return redisClient;
  } catch (error) {
    if (!errorLogged) {
      if (isProduction || process.env.REDIS_URL) {
        if (isProduction) {
          import_logger.log.error("Redis: Initial connection failed. Will retry on operations.", error);
          import_logger.log.warn("The system will continue without caching until Redis is available.");
        } else {
          import_logger.log.warn("Redis: Connection failed. Caching will be disabled.");
          import_logger.log.info("To enable caching, start Redis: redis-server");
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
async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  const isProduction = process.env.NODE_ENV === "production";
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
function getRedisClientSync() {
  return redisClient && redisClient.isOpen ? redisClient : null;
}
async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}
async function isRedisAvailable() {
  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}
function getRedisStatus() {
  const isConnected = redisClient !== null && redisClient.isOpen;
  return {
    connected: isConnected,
    available: !redisConnectionFailed,
    url: process.env.REDIS_URL || "redis://localhost:6379"
  };
}
const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    const client = await getRedisClient();
    if (!client) return null;
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      if (process.env.NODE_ENV === "development" || !error.message?.includes("Connection")) {
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
  async set(key, value, ttlSeconds = 3600) {
    const client = await getRedisClient();
    if (!client) return false;
    try {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === "development" || !error.message?.includes("Connection")) {
        console.error(`Redis SET error for key ${key}:`, error.message);
      }
      return false;
    }
  },
  /**
   * Delete value from cache
   */
  async del(key) {
    const client = await getRedisClient();
    if (!client) return false;
    try {
      await client.del(key);
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === "development" || !error.message?.includes("Connection")) {
        console.error(`Redis DEL error for key ${key}:`, error.message);
      }
      return false;
    }
  },
  /**
   * Delete multiple keys matching a pattern
   * Note: SCAN is preferred over KEYS in production for large datasets
   */
  async delPattern(pattern) {
    const client = await getRedisClient();
    if (!client) return 0;
    try {
      const isProduction = process.env.NODE_ENV === "production";
      let deletedCount = 0;
      if (isProduction) {
        const iterator = client.scanIterator({
          MATCH: pattern,
          COUNT: 100
        });
        const keysToDelete = [];
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
    } catch (error) {
      if (process.env.NODE_ENV === "development" || !error.message?.includes("Connection")) {
        console.error(`Redis DEL pattern error for ${pattern}:`, error.message);
      }
      return 0;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cache,
  closeRedis,
  getRedisClient,
  getRedisClientSync,
  getRedisStatus,
  initRedis,
  isRedisAvailable
});
