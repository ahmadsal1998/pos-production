import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ensureAdminDatabase, sanitizeMongoUri } from '../config/database';
import { getDatabaseConnection, getDatabaseName, DATABASE_CONFIG } from './databaseManager';
import { getCustomerPaymentModel } from './customerPaymentModel';
import Store from '../models/Store';
import { log } from './logger';

// Load environment variables
dotenv.config();

/**
 * Migration script to move customer payments from store-specific collections
 * in distributed databases to a unified collection in admin_db
 * 
 * Source collections: {storeNumber}_customer_payments in pos_db_1, pos_db_2, etc.
 * Target collection: customer_payments in admin_db
 * 
 * Safety features:
 * - No data deletion (original collections kept intact)
 * - Detailed logging
 * - Rollback support
 * - Error handling with recovery
 */

interface MigrationStats {
  totalRead: number;
  totalMigrated: number;
  totalErrors: number;
  storesProcessed: string[];
  errors: Array<{ store: string; error: string }>;
}

interface RollbackInfo {
  migratedIds: string[];
  storeId: string;
  collectionName: string;
}

/**
 * Get storeId from store number or prefix
 */
async function getStoreIdFromNumber(storeNumber: number): Promise<string | null> {
  try {
    const store = await Store.findOne({ storeNumber }).lean();
    if (store) {
      return store.storeId.toLowerCase().trim();
    }
    
    // Try to find by prefix (in case storeNumber maps to prefix)
    const stores = await Store.find().lean();
    const storeByPrefix = stores.find(s => s.prefix === storeNumber.toString() || s.prefix === `store${storeNumber}`);
    if (storeByPrefix) {
      return storeByPrefix.storeId.toLowerCase().trim();
    }
    
    return null;
  } catch (error: any) {
    log.error(`Error finding store for number ${storeNumber}`, error);
    return null;
  }
}

/**
 * Get storeId from prefix
 */
async function getStoreIdFromPrefix(prefix: string): Promise<string | null> {
  try {
    const normalizedPrefix = prefix.toLowerCase().trim();
    const store = await Store.findOne({ prefix: normalizedPrefix }).lean();
    if (store) {
      return store.storeId.toLowerCase().trim();
    }
    return null;
  } catch (error: any) {
    log.error(`Error finding store for prefix ${prefix}`, error);
    return null;
  }
}

/**
 * Extract store number from collection name (e.g., "1_customer_payments" -> 1)
 */
function extractStoreNumberFromCollection(collectionName: string): number | null {
  const match = collectionName.match(/^(\d+)_customer_payments$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extract prefix from collection name (e.g., "store1_customer_payments" -> "store1")
 */
function extractPrefixFromCollection(collectionName: string): string | null {
  const match = collectionName.match(/^([a-z0-9_]+)_customer_payments$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Migrate payments from a specific collection
 */
async function migrateCollection(
  sourceConnection: mongoose.Connection,
  collectionName: string,
  targetModel: mongoose.Model<any>,
  stats: MigrationStats
): Promise<RollbackInfo[]> {
  const rollbackInfo: RollbackInfo[] = [];
  
  try {
    // Extract store identifier from collection name
    const storeNumber = extractStoreNumberFromCollection(collectionName);
    const prefix = extractPrefixFromCollection(collectionName);
    
    let storeId: string | null = null;
    let useDocumentStoreId = false; // Flag to use storeId from documents
    
    // Special case: if collection is just "customer_payments", check if documents have storeId
    if (collectionName === 'customer_payments') {
      log.info(`Collection ${collectionName} appears to be a unified collection. Checking if documents have storeId...`);
      
      if (!sourceConnection.db) {
        throw new Error(`Database connection for ${collectionName} is not available`);
      }
      
      // Check a sample document to see if it has storeId
      const sampleDoc = await sourceConnection.db.collection(collectionName).findOne({});
      if (sampleDoc && sampleDoc.storeId) {
        log.info(`Documents in ${collectionName} already have storeId. Will migrate using document storeId values.`);
        useDocumentStoreId = true;
        // Set a dummy storeId for logging purposes (won't be used since useDocumentStoreId is true)
        storeId = 'from_document';
      } else {
        log.warn(`Collection ${collectionName} has no storeId in documents and no store identifier in name. Skipping...`);
        stats.errors.push({ store: collectionName, error: 'Could not extract store identifier and documents have no storeId' });
        return rollbackInfo;
      }
    } else if (storeNumber) {
      storeId = await getStoreIdFromNumber(storeNumber);
      if (!storeId) {
        log.warn(`Could not find storeId for store number ${storeNumber} from collection ${collectionName}`);
        // Try using storeNumber as storeId (fallback)
        storeId = storeNumber.toString();
      }
    } else if (prefix) {
      storeId = await getStoreIdFromPrefix(prefix);
      if (!storeId) {
        log.warn(`Could not find storeId for prefix ${prefix} from collection ${collectionName}`);
        // Try using prefix as storeId (fallback)
        storeId = prefix;
      }
    } else {
      log.error(`Could not extract store identifier from collection name: ${collectionName}`);
      stats.errors.push({ store: collectionName, error: 'Could not extract store identifier' });
      return rollbackInfo;
    }
    
    // At this point, storeId should be set (unless useDocumentStoreId is true)
    if (!storeId && !useDocumentStoreId) {
      log.error(`Could not determine storeId for collection ${collectionName}`);
      stats.errors.push({ store: collectionName, error: 'Could not determine storeId' });
      return rollbackInfo;
    }
    
    const normalizedStoreId = storeId ? storeId.toLowerCase().trim() : 'unknown';
    log.info(`Migrating collection ${collectionName} for storeId: ${normalizedStoreId}`);
    
    // Get source collection
    if (!sourceConnection.db) {
      throw new Error(`Database connection for ${collectionName} is not available`);
    }
    const sourceCollection = sourceConnection.db.collection(collectionName);
    const count = await sourceCollection.countDocuments();
    
    if (count === 0) {
      log.info(`Collection ${collectionName} is empty, skipping...`);
      return rollbackInfo;
    }
    
    log.info(`Found ${count} documents in ${collectionName}`);
    stats.totalRead += count;
    
    // Read documents in batches
    const batchSize = 100;
    let processed = 0;
    let migrated = 0;
    let errors = 0;
    
    let cursor = sourceCollection.find({}).batchSize(batchSize);
    
    while (await cursor.hasNext()) {
      const batch: any[] = [];
      const batchRollback: RollbackInfo[] = [];
      
      // Collect a batch
      for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
        const doc = await cursor.next();
        if (doc) {
          batch.push(doc);
        }
      }
      
      if (batch.length === 0) break;
      
      // Transform documents for target collection
      const transformedDocs = batch.map(doc => {
        // Determine storeId: use document's storeId if available and useDocumentStoreId is true,
        // otherwise use the extracted normalizedStoreId
        let docStoreId: string;
        if (useDocumentStoreId && doc.storeId) {
          docStoreId = doc.storeId.toLowerCase().trim();
        } else if (doc.storeId) {
          // Document has storeId but we also have extracted one - prefer document's if it's valid
          docStoreId = doc.storeId.toLowerCase().trim();
        } else {
          // Use extracted storeId
          docStoreId = normalizedStoreId;
        }
        
        return {
          customerId: doc.customerId,
          storeId: docStoreId, // Always set storeId
          date: doc.date || doc.createdAt || new Date(),
          amount: doc.amount,
          method: doc.method,
          invoiceId: doc.invoiceId || null,
          notes: doc.notes || null,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        };
      });
      
      // Insert into target collection
      try {
        const result = await targetModel.insertMany(transformedDocs, { ordered: false });
        migrated += result.length;
        
        // Track for rollback
        result.forEach((doc: any) => {
          batchRollback.push({
            migratedIds: [doc._id.toString()],
            storeId: normalizedStoreId,
            collectionName: collectionName,
          });
        });
        
        rollbackInfo.push(...batchRollback);
        processed += batch.length;
        
        log.info(`Migrated batch: ${processed}/${count} documents from ${collectionName}`);
      } catch (insertError: any) {
        // Handle duplicate key errors (documents might already exist)
        if (insertError.code === 11000 || insertError.name === 'BulkWriteError') {
          // Try inserting one by one to identify which ones failed
          for (const doc of transformedDocs) {
            try {
              const result = await targetModel.create(doc);
              migrated++;
              rollbackInfo.push({
                migratedIds: [result._id.toString()],
                storeId: normalizedStoreId,
                collectionName: collectionName,
              });
            } catch (singleError: any) {
              if (singleError.code !== 11000) {
                // Not a duplicate, log the error
                errors++;
                log.error(`Error migrating document from ${collectionName}`, singleError);
                stats.errors.push({ 
                  store: collectionName, 
                  error: `Document migration error: ${singleError.message}` 
                });
              } else {
                // Duplicate, skip
                log.warn(`Document already exists in target collection, skipping...`);
              }
            }
          }
        } else {
          errors += batch.length;
          log.error(`Error inserting batch from ${collectionName}`, insertError);
          stats.errors.push({ 
            store: collectionName, 
            error: `Batch insert error: ${insertError.message}` 
          });
        }
        processed += batch.length;
      }
    }
    
    stats.totalMigrated += migrated;
    stats.totalErrors += errors;
    
    if (migrated > 0) {
      stats.storesProcessed.push(normalizedStoreId);
    }
    
    log.info(`Completed migration of ${collectionName}: ${migrated} migrated, ${errors} errors`);
    
  } catch (error: any) {
    log.error(`Error migrating collection ${collectionName}`, error);
    stats.errors.push({ 
      store: collectionName, 
      error: `Collection migration error: ${error.message}` 
    });
  }
  
  return rollbackInfo;
}

/**
 * Connect to MongoDB with retry logic
 */
async function connectWithRetry(uri: string, retryCount: number = 0): Promise<void> {
  const MAX_RETRIES = 5;
  const INITIAL_RETRY_DELAY = 2000; // 2 seconds

  try {
    if (retryCount === 0) {
      log.info('Connecting to MongoDB...');
    } else {
      log.info(`Retrying MongoDB connection (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      log.info('Already connected to MongoDB');
      return;
    }

    // Connect with optimized options for Atlas
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 60000, // 60 seconds
      connectTimeoutMS: 30000, // 30 seconds
      retryWrites: true,
      w: 'majority',
      family: 4, // Force IPv4 to avoid IPv6 issues
      maxPoolSize: 10,
    });

    log.info(`✅ Connected to MongoDB: ${mongoose.connection.host}`);
    log.info(`Database: ${mongoose.connection.name}`);
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    const isNetworkError = 
      errorMessage.includes('ETIMEOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('querySrv') ||
      errorMessage.includes('ECONNRESET');

    // Retry on network errors
    if (isNetworkError && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      log.warn(`Network error: ${errorMessage}`);
      log.warn(`Retrying in ${delay / 1000} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(uri, retryCount + 1);
    }

    // Provide helpful error messages
    if (errorMessage.includes('querySrv') || errorMessage.includes('ECONNREFUSED')) {
      log.error('❌ MongoDB Connection Failed');
      log.error('Possible causes:');
      log.error('  1. Network connectivity issue - check your internet connection');
      log.error('  2. MongoDB Atlas cluster is paused or unavailable');
      log.error('  3. IP address not whitelisted in MongoDB Atlas Network Access');
      log.error('  4. Incorrect connection string in MONGODB_URI');
      log.error('  5. Firewall blocking MongoDB connections');
      log.error('');
      log.error('Troubleshooting steps:');
      log.error('  - Check MongoDB Atlas dashboard: https://cloud.mongodb.com');
      log.error('  - Verify your IP is whitelisted in Network Access');
      log.error('  - Test connection string with MongoDB Compass');
      log.error('  - Verify MONGODB_URI in .env file');
    }

    throw error;
  }
}

/**
 * Main migration function
 */
export async function migrateCustomerPayments(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalRead: 0,
    totalMigrated: 0,
    totalErrors: 0,
    storesProcessed: [],
    errors: [],
  };
  
  const rollbackData: RollbackInfo[] = [];
  
  try {
    log.info('=== Starting Customer Payments Migration ===');
    log.info('Source: Store-specific collections in distributed databases');
    log.info('Target: Unified customer_payments collection in admin_db');
    
    // Connect to admin_db with retry logic
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set. Please check your .env file.');
    }
    
    // Validate URI format
    if (!mongoUri.includes('mongodb://') && !mongoUri.includes('mongodb+srv://')) {
      throw new Error('Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
    }
    
    const adminDbUri = ensureAdminDatabase(mongoUri);
    log.info('Attempting to connect to admin_db...');
    
    await connectWithRetry(adminDbUri);
    log.info('✅ Connected to admin_db');
    
    // Get target model
    const targetModel = getCustomerPaymentModel();
    log.info('Target model initialized: customer_payments in admin_db');
    
    // Get all stores to understand the mapping
    const stores = await Store.find().lean();
    log.info(`Found ${stores.length} stores in database`);
    
    // Process each database (pos_db_1, pos_db_2, etc.)
    for (let dbId = 1; dbId <= DATABASE_CONFIG.DATABASE_COUNT; dbId++) {
      try {
        log.info(`\n=== Processing database ${dbId} (${getDatabaseName(dbId)}) ===`);
        
        const sourceConnection = await getDatabaseConnection(dbId);
        if (!sourceConnection.db) {
          log.error(`Database connection for ${getDatabaseName(dbId)} is not available`);
          continue;
        }
        const db = sourceConnection.db;
        const collections = await db.listCollections().toArray();
        
        // Find all customer_payments collections
        const paymentCollections = collections
          .map(c => c.name)
          .filter(name => name.includes('customer_payments'));
        
        log.info(`Found ${paymentCollections.length} customer_payments collections in ${getDatabaseName(dbId)}`);
        
        for (const collectionName of paymentCollections) {
          try {
            const collectionRollback = await migrateCollection(
              sourceConnection,
              collectionName,
              targetModel,
              stats
            );
            rollbackData.push(...collectionRollback);
          } catch (error: any) {
            log.error(`Error processing collection ${collectionName}`, error);
            stats.errors.push({ 
              store: collectionName, 
              error: `Processing error: ${error.message}` 
            });
          }
        }
      } catch (error: any) {
        log.error(`Error processing database ${dbId}`, error);
        stats.errors.push({ 
          store: `Database ${dbId}`, 
          error: `Database processing error: ${error.message}` 
        });
      }
    }
    
    // Save rollback data to a file (optional, for manual rollback if needed)
    // In a production environment, you might want to save this to a file or database
    log.info(`\n=== Migration Summary ===`);
    log.info(`Total documents read: ${stats.totalRead}`);
    log.info(`Total documents migrated: ${stats.totalMigrated}`);
    log.info(`Total errors: ${stats.totalErrors}`);
    log.info(`Stores processed: ${stats.storesProcessed.length}`);
    log.info(`Rollback data entries: ${rollbackData.length}`);
    
    if (stats.errors.length > 0) {
      log.warn(`\n=== Errors Encountered ===`);
      stats.errors.forEach((err, idx) => {
        log.warn(`${idx + 1}. Store: ${err.store}, Error: ${err.error}`);
      });
    }
    
    log.info('\n=== Migration Completed ===');
    log.info('IMPORTANT: Original collections have NOT been deleted.');
    log.info('They remain intact as backup. Delete them only after verifying migration success.');
    
    return stats;
    
  } catch (error: any) {
    log.error('Fatal error during migration', error);
    throw error;
  } finally {
    // Don't disconnect - let the caller handle it
    // await mongoose.disconnect();
  }
}

/**
 * Rollback function to remove migrated data (use with caution!)
 * This will delete the migrated documents from admin_db
 */
export async function rollbackCustomerPaymentsMigration(rollbackData: RollbackInfo[]): Promise<void> {
  if (rollbackData.length === 0) {
    log.warn('No rollback data provided. Nothing to rollback.');
    return;
  }
  
  try {
    log.info('=== Starting Rollback ===');
    log.warn('WARNING: This will delete migrated data from admin_db!');
    
    const targetModel = getCustomerPaymentModel();
    let deleted = 0;
    
    for (const rollback of rollbackData) {
      try {
        const result = await targetModel.deleteMany({
          _id: { $in: rollback.migratedIds.map(id => new mongoose.Types.ObjectId(id)) }
        });
        deleted += result.deletedCount || 0;
      } catch (error: any) {
        log.error(`Error rolling back for ${rollback.collectionName}`, error);
      }
    }
    
    log.info(`Rollback completed: ${deleted} documents deleted from admin_db`);
    log.info('Original collections in distributed databases remain intact.');
    
  } catch (error: any) {
    log.error('Error during rollback', error);
    throw error;
  }
}

/**
 * CLI entry point for migration
 */
if (require.main === module) {
  migrateCustomerPayments()
    .then((stats) => {
      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Statistics:`, JSON.stringify(stats, null, 2));
      mongoose.disconnect().then(() => {
        console.log('Database connection closed.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error closing connection:', err);
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message);
      console.error('\nPlease check:');
      console.error('  1. Your internet connection');
      console.error('  2. MongoDB Atlas cluster status');
      console.error('  3. IP whitelist in MongoDB Atlas');
      console.error('  4. MONGODB_URI in .env file');
      
      // Try to disconnect if connected
      if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        mongoose.disconnect().catch(() => {
          // Ignore disconnect errors
        });
      }
      
      process.exit(1);
    });
}
