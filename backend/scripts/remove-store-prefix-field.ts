/**
 * Migration: Remove the deprecated `prefix` field from Store documents.
 * Run after deploying the prefix removal (Store model, admin API, frontend).
 *
 * Usage: npx ts-node scripts/remove-store-prefix-field.ts
 * Or:    node dist/scripts/remove-store-prefix-field.js (after building)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pos';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error('No database connection');

    const coll = db.collection('stores');
    const result = await coll.updateMany(
      { prefix: { $exists: true } },
      { $unset: { prefix: '' } }
    );
    console.log(`✓ Removed \`prefix\` field from ${result.modifiedCount} store(s).`);

    try {
      await coll.dropIndex('prefix_1');
      console.log('✓ Dropped index \`prefix_1\` on stores.');
    } catch (e: any) {
      if (e.code === 27 || (e.message && e.message.includes('index not found'))) {
        console.log('  (prefix_1 index did not exist, skipping)');
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
