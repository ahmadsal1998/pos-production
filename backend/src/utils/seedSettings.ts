import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from '../models/Settings';
import { ensureAdminDatabase } from '../config/database';

// Load environment variables
dotenv.config();

const seedSettings = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI as string;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    const uriWithAdminDb = ensureAdminDatabase(mongoUri);
    await mongoose.connect(uriWithAdminDb);
    console.log('✅ Connected to MongoDB');

    // Default settings to seed
    const defaultSettings = [
      {
        key: 'subscription_contact_number',
        value: '0593202029',
        description: 'رقم الاتصال المعروض في صفحة انتهاء الاشتراك',
      },
      {
        key: 'currency',
        value: 'ILS|₪|Israeli Shekel',
        description: 'Default currency for the system (format: CODE|SYMBOL|NAME)',
      },
    ];

    // Seed each setting if it doesn't exist
    for (const setting of defaultSettings) {
      const existingSetting = await Settings.findOne({ key: setting.key });
      
      if (existingSetting) {
        console.log(`ℹ️  Setting "${setting.key}" already exists. Skipping...`);
      } else {
        console.log(`🌱 Seeding setting "${setting.key}"...`);
        await Settings.create(setting);
        console.log(`✅ Setting "${setting.key}" created successfully!`);
      }
    }

    console.log('📞 Default contact number: 0593202029');
    console.log('💰 Default currency: ILS (₪)');

    await mongoose.disconnect();
    console.log('✅ Settings seeding completed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding settings:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedSettings();
}

export default seedSettings;

