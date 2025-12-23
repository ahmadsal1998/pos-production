"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = require("../config/database");
// Load environment variables
dotenv_1.default.config();
const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        const uriWithAdminDb = (0, database_1.ensureAdminDatabase)(mongoUri);
        await mongoose_1.default.connect(uriWithAdminDb);
        console.log('✅ Connected to MongoDB');
        // Check if admin user already exists
        const existingAdmin = await User_1.default.findOne({
            $or: [{ email: 'adminn@pos.com' }, { username: 'admin' }],
        });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists. Skipping seed...');
            await mongoose_1.default.disconnect();
            return;
        }
        // Create admin user
        console.log('🌱 Seeding admin user...');
        const adminUser = await User_1.default.create({
            fullName: 'Admin User',
            username: 'admin',
            email: 'adminn@pos.com',
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
        console.log('📧 Email: adminn@pos.com');
        console.log('🔑 Password: password123');
        console.log('👤 Username: admin');
        await mongoose_1.default.disconnect();
        console.log('✅ Database seeding completed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error.message);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
};
// Run seed
seedDatabase();
