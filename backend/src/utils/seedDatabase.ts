import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { ensureAdminDatabase } from '../config/database';

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
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

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: 'admin@pos.com' }, { username: 'admin' }],
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists. Skipping seed...');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    console.log('🌱 Seeding admin user...');
    const adminUser = await User.create({
      fullName: 'Admin User',
      username: 'admin',
      email: 'admin@pos.com',
      password: 'password123',
      role: 'Admin',
      permissions: [
        'dashboard',
        'products',
        'categories',
        'brands',
        'purchases',
        'expenses',
        'salesToday',
        'salesHistory',
        'posRetail',
        'posWholesale',
        'refunds',
        'preferences',
        'users',
      ],
      status: 'Active',
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@pos.com');
    console.log('🔑 Password: password123');
    console.log('👤 Username: admin');

    await mongoose.disconnect();
    console.log('✅ Database seeding completed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run seed
seedDatabase();

