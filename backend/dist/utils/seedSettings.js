"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Settings_1 = __importDefault(require("../models/Settings"));
const database_1 = require("../config/database");
// Load environment variables
dotenv_1.default.config();
const seedSettings = async () => {
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
            const existingSetting = await Settings_1.default.findOne({ key: setting.key });
            if (existingSetting) {
                console.log(`ℹ️  Setting "${setting.key}" already exists. Skipping...`);
            }
            else {
                console.log(`🌱 Seeding setting "${setting.key}"...`);
                await Settings_1.default.create(setting);
                console.log(`✅ Setting "${setting.key}" created successfully!`);
            }
        }
        console.log('📞 Default contact number: 0593202029');
        console.log('💰 Default currency: ILS (₪)');
        await mongoose_1.default.disconnect();
        console.log('✅ Settings seeding completed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding settings:', error.message);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
};
// Run if called directly
if (require.main === module) {
    seedSettings();
}
exports.default = seedSettings;
