"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var databaseManager_exports = {};
__export(databaseManager_exports, {
  DATABASE_CONFIG: () => DATABASE_CONFIG,
  closeAllDatabases: () => closeAllDatabases,
  connectToDatabase: () => connectToDatabase,
  determineDatabaseForStore: () => determineDatabaseForStore,
  getConnectionCount: () => getConnectionCount,
  getDatabaseConnection: () => getDatabaseConnection,
  getDatabaseIdForStore: () => getDatabaseIdForStore,
  getDatabaseName: () => getDatabaseName,
  initializeAllDatabases: () => initializeAllDatabases
});
module.exports = __toCommonJS(databaseManager_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_database = require("../config/database");
var import_logger = require("./logger");
const DATABASE_CONFIG = {
  STORES_PER_DATABASE: 20,
  DATABASE_COUNT: 5,
  // For 100 stores, we need 5 databases
  DATABASE_PREFIX: "pos_db"
  // Databases will be named: pos_db_1, pos_db_2, etc.
};
const databaseConnections = /* @__PURE__ */ new Map();
function getBaseMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return (0, import_database.sanitizeMongoUri)(uri);
}
function getDatabaseName(databaseId) {
  if (databaseId < 1 || databaseId > DATABASE_CONFIG.DATABASE_COUNT) {
    throw new Error(`Invalid database ID: ${databaseId}. Must be between 1 and ${DATABASE_CONFIG.DATABASE_COUNT}`);
  }
  return `${DATABASE_CONFIG.DATABASE_PREFIX}_${databaseId}`;
}
function getDatabaseUri(databaseId) {
  const baseUri = getBaseMongoUri();
  const dbName = getDatabaseName(databaseId);
  const queryIndex = baseUri.indexOf("?");
  const uriWithoutQuery = queryIndex > 0 ? baseUri.substring(0, queryIndex) : baseUri;
  const queryString = queryIndex > 0 ? baseUri.substring(queryIndex) : "";
  const protocolIndex = uriWithoutQuery.indexOf("://");
  if (protocolIndex === -1) {
    throw new Error("Invalid MongoDB URI format: missing protocol");
  }
  const afterProtocol = uriWithoutQuery.substring(protocolIndex + 3);
  const hostEndIndex = afterProtocol.indexOf("/");
  if (hostEndIndex === -1) {
    return `${uriWithoutQuery}/${dbName}${queryString}`;
  }
  const protocolAndHost = uriWithoutQuery.substring(0, protocolIndex + 3 + hostEndIndex);
  const cleanProtocolAndHost = protocolAndHost.replace(/\/+$/, "");
  return `${cleanProtocolAndHost}/${dbName}${queryString}`;
}
async function connectToDatabase(databaseId, retryCount = 0) {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1e3;
  if (databaseConnections.has(databaseId)) {
    const connection = databaseConnections.get(databaseId);
    if (connection.readyState === 1) {
      return connection;
    }
    databaseConnections.delete(databaseId);
    try {
      await connection.close();
    } catch (error) {
    }
  }
  const dbName = getDatabaseName(databaseId);
  const uri = getDatabaseUri(databaseId);
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName)) {
    throw new Error(`Invalid database name: ${dbName}. Database names can only contain letters, numbers, underscores, and hyphens.`);
  }
  if (dbName.length > 64) {
    throw new Error(`Database name too long: ${dbName}. Maximum length is 64 characters.`);
  }
  try {
    const uriForLogging = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    if (retryCount === 0) {
      import_logger.log.info(`Connecting to database ${dbName}`, { uri: uriForLogging });
    } else {
      import_logger.log.info(`Retrying connection to database ${dbName} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    }
    const connection = import_mongoose.default.createConnection(uri, {
      maxPoolSize: 2,
      // Reduced to save memory
      minPoolSize: 0,
      // Don't maintain minimum connections
      serverSelectionTimeoutMS: 3e4,
      // Increased to 30 seconds for better reliability
      socketTimeoutMS: 6e4,
      // Increased to 60 seconds
      connectTimeoutMS: 3e4,
      // Increased to 30 seconds
      retryWrites: true,
      w: "majority",
      // Add DNS caching and connection options
      family: 4
      // Force IPv4 to avoid IPv6 issues
    });
    await connection.asPromise();
    import_logger.log.info(`Connected to database: ${dbName}`);
    databaseConnections.set(databaseId, connection);
    return connection;
  } catch (error) {
    const errorMessage = error.message || "Unknown error";
    const isNetworkError = errorMessage.includes("ETIMEOUT") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ERR_INTERNET_DISCONNECTED") || errorMessage.includes("timeout") || errorMessage.includes("network");
    if (isNetworkError && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      import_logger.log.warn(`Network error connecting to ${dbName}: ${errorMessage}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectToDatabase(databaseId, retryCount + 1);
    }
    import_logger.log.error(`Error connecting to database ${dbName}`, error, { errorMessage });
    throw new Error(`Failed to connect to database ${dbName}: ${errorMessage}`);
  }
}
async function getDatabaseConnection(databaseId) {
  return connectToDatabase(databaseId);
}
async function determineDatabaseForStore(StoreModel) {
  let totalStores = 0;
  if (StoreModel) {
    try {
      totalStores = await StoreModel.countDocuments();
    } catch (error) {
      import_logger.log.error("Error counting stores", error);
    }
  }
  const databaseId = Math.floor(totalStores / DATABASE_CONFIG.STORES_PER_DATABASE) + 1;
  const finalDatabaseId = Math.min(databaseId, DATABASE_CONFIG.DATABASE_COUNT);
  import_logger.log.info(`Assigning store ${totalStores + 1} to database ${finalDatabaseId}`);
  return finalDatabaseId;
}
async function getDatabaseIdForStore(storeId, StoreModel) {
  if (!StoreModel) {
    throw new Error("StoreModel is required to get database ID for store");
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    let store = await StoreModel.findOne({ prefix: normalizedStoreId }).lean();
    if (!store) {
      store = await StoreModel.findOne({ storeId: normalizedStoreId }).lean();
    }
    if (store && store.databaseId) {
      return store.databaseId;
    }
    return null;
  } catch (error) {
    import_logger.log.error(`Error getting database ID for store ${storeId}`, error);
    throw new Error(`Failed to get database ID for store: ${error.message}`);
  }
}
async function initializeAllDatabases() {
  import_logger.log.info("Initializing all database connections (lazy loading recommended instead)...");
  for (let i = 1; i <= DATABASE_CONFIG.DATABASE_COUNT; i++) {
    try {
      await connectToDatabase(i);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      import_logger.log.error(`Failed to connect to database ${i}`, error);
    }
  }
  import_logger.log.info(`Initialized ${databaseConnections.size} database connections`);
}
async function closeAllDatabases() {
  import_logger.log.info("Closing all database connections...");
  const closePromises = Array.from(databaseConnections.values()).map((connection) => {
    return connection.close().catch((error) => {
      import_logger.log.error("Error closing database connection", error);
    });
  });
  await Promise.all(closePromises);
  databaseConnections.clear();
  import_logger.log.info("All database connections closed");
}
function getConnectionCount() {
  return databaseConnections.size;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DATABASE_CONFIG,
  closeAllDatabases,
  connectToDatabase,
  determineDatabaseForStore,
  getConnectionCount,
  getDatabaseConnection,
  getDatabaseIdForStore,
  getDatabaseName,
  initializeAllDatabases
});
