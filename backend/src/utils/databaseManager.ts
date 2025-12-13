import mongoose, { Connection } from 'mongoose';

/**
 * Configuration for multi-database architecture
 * Each database will contain approximately 20 stores
 */
export const DATABASE_CONFIG = {
  STORES_PER_DATABASE: 20,
  DATABASE_COUNT: 5, // For 100 stores, we need 5 databases
  DATABASE_PREFIX: 'pos_db', // Databases will be named: pos_db_1, pos_db_2, etc.
};

/**
 * Database connection cache
 * Maps database ID to mongoose connection
 */
const databaseConnections: Map<number, Connection> = new Map();

/**
 * Get the base MongoDB URI from environment
 */
function getBaseMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  return uri;
}

/**
 * Get the database name for a given database ID
 * @param databaseId - Database ID (1-5)
 * @returns Database name (e.g., 'pos_db_1')
 */
export function getDatabaseName(databaseId: number): string {
  if (databaseId < 1 || databaseId > DATABASE_CONFIG.DATABASE_COUNT) {
    throw new Error(`Invalid database ID: ${databaseId}. Must be between 1 and ${DATABASE_CONFIG.DATABASE_COUNT}`);
  }
  return `${DATABASE_CONFIG.DATABASE_PREFIX}_${databaseId}`;
}

/**
 * Get the MongoDB URI for a specific database
 * Optimized for MongoDB Atlas (mongodb+srv://) and standard MongoDB URIs
 * @param databaseId - Database ID (1-5)
 * @returns MongoDB URI with database name
 */
function getDatabaseUri(databaseId: number): string {
  const baseUri = getBaseMongoUri();
  const dbName = getDatabaseName(databaseId);
  
  // Handle MongoDB Atlas SRV format: mongodb+srv://user:pass@cluster.net/dbname?options
  // Handle standard format: mongodb://user:pass@host:port/dbname?options
  
  // Find the last slash before query parameters (this separates host from database)
  const queryIndex = baseUri.indexOf('?');
  const uriWithoutQuery = queryIndex > 0 ? baseUri.substring(0, queryIndex) : baseUri;
  const queryString = queryIndex > 0 ? baseUri.substring(queryIndex) : '';
  
  // Find the protocol (mongodb:// or mongodb+srv://)
  const protocolIndex = uriWithoutQuery.indexOf('://');
  if (protocolIndex === -1) {
    throw new Error('Invalid MongoDB URI format: missing protocol');
  }
  
  // Extract everything after the protocol
  const afterProtocol = uriWithoutQuery.substring(protocolIndex + 3);
  
  // Find the first slash after the protocol (this separates host from database)
  const hostEndIndex = afterProtocol.indexOf('/');
  
  if (hostEndIndex === -1) {
    // No database specified in URI, append database name
    return `${uriWithoutQuery}/${dbName}${queryString}`;
  }
  
  // Extract the protocol and host part (everything before the first slash after protocol)
  const protocolAndHost = uriWithoutQuery.substring(0, protocolIndex + 3 + hostEndIndex);
  
  // Remove any trailing slashes from protocol and host
  const cleanProtocolAndHost = protocolAndHost.replace(/\/+$/, '');
  
  // Construct the new URI with the database name
  // Ensure exactly one slash between host and database name
  return `${cleanProtocolAndHost}/${dbName}${queryString}`;
}

/**
 * Connect to a specific database with retry logic
 * @param databaseId - Database ID (1-5)
 * @param retryCount - Current retry attempt (internal use)
 * @returns Mongoose connection
 */
export async function connectToDatabase(databaseId: number, retryCount: number = 0): Promise<Connection> {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000; // 1 second

  // Check if connection already exists and is ready
  if (databaseConnections.has(databaseId)) {
    const connection = databaseConnections.get(databaseId)!;
    if (connection.readyState === 1) {
      return connection;
    }
    // Remove stale connection
    databaseConnections.delete(databaseId);
    // Close the stale connection to prevent memory leaks
    try {
      await connection.close();
    } catch (error) {
      // Ignore errors when closing stale connection
    }
  }

  const dbName = getDatabaseName(databaseId);
  const uri = getDatabaseUri(databaseId);

  // Validate database name (MongoDB restrictions)
  if (!/^[a-zA-Z0-9_-]+$/.test(dbName)) {
    throw new Error(`Invalid database name: ${dbName}. Database names can only contain letters, numbers, underscores, and hyphens.`);
  }
  
  if (dbName.length > 64) {
    throw new Error(`Database name too long: ${dbName}. Maximum length is 64 characters.`);
  }

  try {
    // Log the URI (without credentials) for debugging
    const uriForLogging = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    if (retryCount === 0) {
      console.log(`🔗 Connecting to database ${dbName} with URI: ${uriForLogging}`);
    } else {
      console.log(`🔄 Retrying connection to database ${dbName} (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    }
    
    // Create a new connection for this database with optimized settings for Atlas
    const connection = mongoose.createConnection(uri, {
      maxPoolSize: 2, // Reduced to save memory
      minPoolSize: 0, // Don't maintain minimum connections
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds for better reliability
      socketTimeoutMS: 60000, // Increased to 60 seconds
      connectTimeoutMS: 30000, // Increased to 30 seconds
      retryWrites: true,
      w: 'majority',
      // Add DNS caching and connection options
      family: 4, // Force IPv4 to avoid IPv6 issues
    });

    // Wait for connection (timeout is handled by serverSelectionTimeoutMS)
    await connection.asPromise();
    
    console.log(`✅ Connected to database: ${dbName}`);
    
    // Cache the connection
    databaseConnections.set(databaseId, connection);
    
    return connection;
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    const isNetworkError = 
      errorMessage.includes('ETIMEOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network');

    // Retry on network errors
    if (isNetworkError && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      console.warn(`⚠️ Network error connecting to ${dbName}: ${errorMessage}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectToDatabase(databaseId, retryCount + 1);
    }

    // Log error and throw
    console.error(`❌ Error connecting to database ${dbName}:`, errorMessage);
    throw new Error(`Failed to connect to database ${dbName}: ${errorMessage}`);
  }
}

/**
 * Get the connection for a specific database
 * @param databaseId - Database ID (1-5)
 * @returns Mongoose connection (connects if not already connected)
 */
export async function getDatabaseConnection(databaseId: number): Promise<Connection> {
  return connectToDatabase(databaseId);
}

/**
 * Determine which database a new store should be assigned to
 * This distributes stores evenly across databases
 * @param StoreModel - The Store model to query (passed to avoid circular dependency)
 * @returns Database ID (1-5)
 */
export async function determineDatabaseForStore(StoreModel?: any): Promise<number> {
  let totalStores = 0;
  
  // If StoreModel is provided, query the actual count
  if (StoreModel) {
    try {
      totalStores = await StoreModel.countDocuments();
    } catch (error) {
      console.error('Error counting stores:', error);
      // Fall back to default
    }
  }
  
  // Calculate which database this store should go to
  // Distribute evenly: stores 0-19 -> db1, 20-39 -> db2, etc.
  const databaseId = Math.floor(totalStores / DATABASE_CONFIG.STORES_PER_DATABASE) + 1;
  
  // Ensure we don't exceed the maximum number of databases
  const finalDatabaseId = Math.min(databaseId, DATABASE_CONFIG.DATABASE_COUNT);
  
  console.log(`📊 Assigning store ${totalStores + 1} to database ${finalDatabaseId}`);
  
  return finalDatabaseId;
}

/**
 * Get database ID for an existing store
 * This queries the Store model to get the databaseId
 * @param storeId - Store ID or prefix
 * @param StoreModel - The Store model to query (passed to avoid circular dependency)
 * @returns Database ID or null if store not found
 */
export async function getDatabaseIdForStore(
  storeId: string,
  StoreModel?: any
): Promise<number | null> {
  if (!StoreModel) {
    throw new Error('StoreModel is required to get database ID for store');
  }
  
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Try to find by prefix first
    let store = await StoreModel.findOne({ prefix: normalizedStoreId }).lean();
    
    // If not found, try by storeId
    if (!store) {
      store = await StoreModel.findOne({ storeId: normalizedStoreId }).lean();
    }
    
    if (store && store.databaseId) {
      return store.databaseId;
    }
    
    return null;
  } catch (error: any) {
    console.error(`Error getting database ID for store ${storeId}:`, error);
    throw new Error(`Failed to get database ID for store: ${error.message}`);
  }
}

/**
 * Initialize all database connections
 * NOTE: This is optional and not recommended for startup
 * Databases are connected lazily when first accessed
 * Use this only if you need to pre-warm connections
 */
export async function initializeAllDatabases(): Promise<void> {
  console.log('🔄 Initializing all database connections (lazy loading recommended instead)...');
  
  // Connect sequentially to avoid overwhelming the system
  for (let i = 1; i <= DATABASE_CONFIG.DATABASE_COUNT; i++) {
    try {
      await connectToDatabase(i);
      // Small delay between connections to prevent memory spikes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`⚠️ Failed to connect to database ${i}:`, error.message);
      // Continue with other databases even if one fails
    }
  }
  
  console.log(`✅ Initialized ${databaseConnections.size} database connections`);
}

/**
 * Close all database connections
 */
export async function closeAllDatabases(): Promise<void> {
  console.log('🔄 Closing all database connections...');
  
  const closePromises = Array.from(databaseConnections.values()).map((connection) => {
    return connection.close().catch((error) => {
      console.error('Error closing database connection:', error);
    });
  });
  
  await Promise.all(closePromises);
  databaseConnections.clear();
  console.log('✅ All database connections closed');
}

/**
 * Get connection count (for monitoring)
 */
export function getConnectionCount(): number {
  return databaseConnections.size;
}

