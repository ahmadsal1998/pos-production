/**
 * Utility script to check user details in MongoDB
 * Run with: npx ts-node src/utils/checkUser.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import connectDB from '../config/database';

dotenv.config();

const checkUser = async () => {
  try {
    // Connect to database
    await connectDB();

    const email = 'salamea1998@gmail.com';

    console.log('\n🔍 Checking user details...\n');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    console.log('✅ User found!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', user.email);
    console.log('👤 Username:', user.username);
    console.log('👨‍💼 Full Name:', user.fullName);
    console.log('🔐 Role:', user.role);
    console.log('📊 Status:', user.status);
    console.log('🔑 Has Password:', user.password ? 'Yes (hashed)' : 'No');
    console.log('📝 Created At:', user.createdAt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check status
    if (user.status !== 'Active') {
      console.log('⚠️  WARNING: User status is not "Active"');
      console.log('   You need to set status to "Active" to allow login.\n');
    }

    // Check if password exists
    if (!user.password) {
      console.log('⚠️  WARNING: User does not have a password set');
      console.log('   You need to set a password using the reset password flow.\n');
    }

    console.log('💡 Login Tips:');
    console.log('   - Use email: ' + user.email);
    console.log('   - Or username: ' + user.username);
    console.log('   - Password: (the password that was set when user was created)');
    console.log('   - If you forgot password, use the forgot password flow\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkUser();

