"use strict";
/**
 * Utility script to check user details in MongoDB
 * Run with: npx ts-node src/utils/checkUser.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = __importDefault(require("../config/database"));
dotenv_1.default.config();
const checkUser = async () => {
    try {
        // Connect to database
        await (0, database_1.default)();
        // Get email from environment variable
        const email = process.env.CHECK_USER_EMAIL;
        if (!email) {
            console.error('❌ Error: CHECK_USER_EMAIL environment variable is not set');
            console.log('   Please set CHECK_USER_EMAIL in your .env file');
            console.log('   Example: CHECK_USER_EMAIL=your-email@example.com\n');
            return;
        }
        console.log('\n🔍 Checking user details...\n');
        // Find user by email
        const user = await User_1.default.findOne({ email: email.toLowerCase() }).select('+password');
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
    }
    catch (error) {
        console.error('❌ Error:', error.message);
    }
    finally {
        // Close connection
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
};
checkUser();
