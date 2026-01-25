/**
 * Test MongoDB connection script
 * Run this before the migration to verify connectivity
 * 
 * Usage: ts-node src/utils/testMongoConnection.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ensureAdminDatabase } from '../config/database';
import { getDatabaseConnection, getDatabaseName, DATABASE_CONFIG } from './databaseManager';
import { log } from './logger';

dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB Connection...\n');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set');
      console.error('   Please check your .env file');
      process.exit(1);
    }
    
    // Test admin_db connection
    console.log('1. Testing admin_db connection...');
    const adminDbUri = ensureAdminDatabase(mongoUri);
    
    // Mask credentials in URI for logging
    const safeUri = adminDbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`   URI: ${safeUri}`);
    
    await mongoose.connect(adminDbUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    
    console.log('   ✅ Connected to admin_db');
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Ready State: ${mongoose.connection.readyState} (1 = connected)\n`);
    
    // Test distributed database connections
    console.log('2. Testing distributed database connections...');
    let successCount = 0;
    let failCount = 0;
    
    for (let dbId = 1; dbId <= DATABASE_CONFIG.DATABASE_COUNT; dbId++) {
      try {
        const connection = await getDatabaseConnection(dbId);
        if (connection.readyState === 1) {
          console.log(`   ✅ ${getDatabaseName(dbId)} - Connected`);
          successCount++;
        } else {
          console.log(`   ⚠️  ${getDatabaseName(dbId)} - Connection state: ${connection.readyState}`);
          failCount++;
        }
      } catch (error: any) {
        console.log(`   ❌ ${getDatabaseName(dbId)} - Failed: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n   Summary: ${successCount} successful, ${failCount} failed\n`);
    
    // Overall status
    if (failCount === 0) {
      console.log('✅ All connections successful! Ready for migration.\n');
    } else {
      console.log('⚠️  Some connections failed. Migration may still work, but some databases may be unavailable.\n');
    }
    
    await mongoose.disconnect();
    console.log('Connection closed.');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ Connection Test Failed\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your internet connection');
    console.error('  2. Verify MongoDB Atlas cluster is running');
    console.error('  3. Check IP whitelist in MongoDB Atlas Network Access');
    console.error('  4. Verify MONGODB_URI in .env file is correct');
    console.error('  5. Test connection string with MongoDB Compass\n');
    
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      await mongoose.disconnect().catch(() => {});
    }
    
    process.exit(1);
  }
}

// Run test
testConnection();
