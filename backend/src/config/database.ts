import mongoose from 'mongoose';

/**
 * Connect to the main database (for Store model and other shared data)
 * This is separate from the distributed databases used for store-specific data
 * Note: Distributed databases are connected lazily when needed
 */
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`✅ Main MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Note: Distributed databases are connected lazily when first accessed
    // This prevents memory issues and unnecessary connections at startup
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;

