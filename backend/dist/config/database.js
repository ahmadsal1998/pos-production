"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdminDatabase = ensureAdminDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Ensure the MongoDB URI includes the admin_db database name
 * @param uri - Original MongoDB URI
 * @returns MongoDB URI with admin_db as the database name
 */
function ensureAdminDatabase(uri) {
    const ADMIN_DB_NAME = 'admin_db';
    // Handle MongoDB Atlas SRV format: mongodb+srv://user:pass@cluster.net/dbname?options
    // Handle standard format: mongodb://user:pass@host:port/dbname?options
    // Find the last slash before query parameters (this separates host from database)
    const queryIndex = uri.indexOf('?');
    const uriWithoutQuery = queryIndex > 0 ? uri.substring(0, queryIndex) : uri;
    const queryString = queryIndex > 0 ? uri.substring(queryIndex) : '';
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
        return `${uriWithoutQuery}/${ADMIN_DB_NAME}${queryString}`;
    }
    // Extract the protocol and host part (everything before the first slash after protocol)
    const protocolAndHost = uriWithoutQuery.substring(0, protocolIndex + 3 + hostEndIndex);
    // Remove any trailing slashes from protocol and host
    const cleanProtocolAndHost = protocolAndHost.replace(/\/+$/, '');
    // Construct the new URI with the admin_db database name
    // Ensure exactly one slash between host and database name
    return `${cleanProtocolAndHost}/${ADMIN_DB_NAME}${queryString}`;
}
/**
 * Connect to the main database (for Store model and other shared data)
 * This is separate from the distributed databases used for store-specific data
 * Note: Distributed databases are connected lazily when needed
 */
const connectDB = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 1000; // 1 second
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        // Ensure the connection string uses admin_db as the database name
        const uriWithAdminDb = ensureAdminDatabase(mongoUri);
        if (retryCount === 0) {
            console.log('🔗 Connecting to main MongoDB database...');
        }
        else {
            console.log(`🔄 Retrying main MongoDB connection (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        }
        // Connect with options to prevent automatic collection creation
        // Individual models can override this with autoCreate: false in their schema options
        const conn = await mongoose_1.default.connect(uriWithAdminDb, {
            autoCreate: true, // Allow auto-creation (models can override with autoCreate: false)
            autoIndex: true, // Create indexes automatically for better query performance
            serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
            socketTimeoutMS: 60000, // Increased to 60 seconds
            connectTimeoutMS: 30000, // Increased to 30 seconds
            retryWrites: true,
            w: 'majority',
            family: 4, // Force IPv4 to avoid IPv6 issues
        });
        console.log(`✅ Main MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        // Note: Distributed databases are connected lazily when first accessed
        // This prevents memory issues and unnecessary connections at startup
    }
    catch (error) {
        const errorMessage = error?.message || 'Unknown error';
        const isNetworkError = errorMessage.includes('ETIMEOUT') ||
            errorMessage.includes('ENOTFOUND') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('network') ||
            errorMessage.includes('querySrv');
        // Retry on network errors
        if (isNetworkError && retryCount < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
            console.warn(`⚠️ Network error connecting to main database: ${errorMessage}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectDB(retryCount + 1);
        }
        console.error('❌ MongoDB connection error:', errorMessage);
        console.error('Full error:', error);
        // Don't exit the process - let the caller handle the error
        // This allows the server to start even if MongoDB isn't available
        throw error;
    }
};
exports.default = connectDB;
