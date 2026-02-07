/**
 * Migration script to move terminals from Terminal collection to Store.terminals arrays
 * 
 * This script:
 * 1. Finds all terminals in the Terminal collection
 * 2. For each terminal, determines its store based on storeId field
 * 3. Adds the terminal to the store's terminals array
 * 4. Removes the terminal from the Terminal collection (optional - commented out by default)
 * 
 * Usage:
 * Run this script manually or import and call migrateTerminalsToStores()
 */

import mongoose from 'mongoose';
import Store from '../models/Store';
import { Terminal, ITerminal } from '../models/Terminal';
import { sanitizeMongoUri } from '../config/database';

export async function migrateTerminalsToStores(dryRun: boolean = true): Promise<void> {
  console.log('🚀 Starting terminal migration to stores...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (changes will be saved)'}\n`);

  try {
    // Find all terminals
    const terminals = await Terminal.find({});
    console.log(`Found ${terminals.length} terminal(s) to migrate\n`);

    if (terminals.length === 0) {
      console.log('✅ No terminals to migrate. Exiting.');
      return;
    }

    const migrationResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ terminalId: string; error: string }>,
    };

    for (const terminal of terminals) {
      try {
        // Determine storeId
        let storeId: string | null = null;

        if (terminal.storeId) {
          // Store-based terminal
          storeId = terminal.storeId.toLowerCase();
        } else if (terminal.merchantId) {
          // Merchant-based terminal - need to find merchant's store
          const { Merchant } = await import('../models/Merchant');
          const merchant = await Merchant.findById(terminal.merchantId);
          if (merchant && merchant.storeId) {
            storeId = merchant.storeId.toLowerCase();
          }
        }

        if (!storeId) {
          console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): No store ID found`);
          migrationResults.skipped++;
          continue;
        }

        // Find store
        const store = await Store.findOne({ storeId });
        if (!store) {
          console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Store '${storeId}' not found`);
          migrationResults.skipped++;
          migrationResults.errors.push({
            terminalId: terminal.terminalId,
            error: `Store '${storeId}' not found`,
          });
          continue;
        }

        // Check if terminal already exists in store
        if (store.terminals && store.terminals.length > 0) {
          const existing = store.terminals.find(
            (t) => t.terminalId.toUpperCase() === terminal.terminalId.toUpperCase()
          );
          if (existing) {
            console.log(`⚠️  Skipping terminal ${terminal.terminalId} (ID: ${terminal._id}): Already exists in store '${storeId}'`);
            migrationResults.skipped++;
            continue;
          }
        }

        // Create terminal object for store
        const storeTerminal: any = {
          terminalId: terminal.terminalId,
          merchantIdMid: terminal.merchantIdMid || terminal.terminalId, // Use terminalId as fallback if no MID
          name: terminal.name,
          host: terminal.host,
          port: terminal.port,
          connectionType: terminal.connectionType,
          status: terminal.status,
          testMode: terminal.testMode,
          timeout: terminal.timeout,
          description: terminal.description,
          lastConnected: terminal.lastConnected,
          lastError: terminal.lastError,
          createdAt: terminal.createdAt,
          updatedAt: terminal.updatedAt,
        };

        // Add terminal to store
        if (!store.terminals) {
          store.terminals = [];
        }
        store.terminals.push(storeTerminal);

        if (!dryRun) {
          await store.save();
          console.log(`✅ Migrated terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
        } else {
          console.log(`[DRY RUN] Would migrate terminal ${terminal.terminalId} (ID: ${terminal._id}) to store '${storeId}'`);
        }

        migrationResults.success++;
      } catch (error: any) {
        console.error(`❌ Error migrating terminal ${terminal.terminalId} (ID: ${terminal._id}):`, error.message);
        migrationResults.failed++;
        migrationResults.errors.push({
          terminalId: terminal.terminalId,
          error: error.message,
        });
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Success: ${migrationResults.success}`);
    console.log(`  ⚠️  Skipped: ${migrationResults.skipped}`);
    console.log(`  ❌ Failed: ${migrationResults.failed}`);

    if (migrationResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      migrationResults.errors.forEach((err) => {
        console.log(`  - Terminal ${err.terminalId}: ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were saved.');
      console.log('   Run with dryRun=false to apply changes.');
    } else {
      console.log('\n✅ Migration completed!');

      // Optionally delete terminals from Terminal collection
      // Uncomment the following lines if you want to remove terminals from the old collection:
      /*
      console.log('\n🗑️  Removing terminals from Terminal collection...');
      for (const terminal of terminals) {
        try {
          await terminal.deleteOne();
          console.log(`✅ Removed terminal ${terminal.terminalId} from Terminal collection`);
        } catch (error: any) {
          console.error(`❌ Error removing terminal ${terminal.terminalId}:`, error.message);
        }
      }
      */
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// If running this file directly
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-production';
  // Sanitize URI to remove any X.509 parameters
  const sanitizedUri = sanitizeMongoUri(mongoUri);
  
  mongoose
    .connect(sanitizedUri)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      // Run migration in dry-run mode by default
      const dryRun = process.env.DRY_RUN !== 'false';
      return migrateTerminalsToStores(dryRun);
    })
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

