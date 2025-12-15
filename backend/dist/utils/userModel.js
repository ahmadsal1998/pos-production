"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCollectionName = getUserCollectionName;
exports.getUserModel = getUserModel;
exports.findUserAcrossStores = findUserAcrossStores;
exports.findUserByIdAcrossStores = findUserByIdAcrossStores;
exports.clearUserModelCache = clearUserModelCache;
exports.invalidateUserCaches = invalidateUserCaches;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const databaseManager_1 = require("./databaseManager");
const Store_1 = __importDefault(require("../models/Store"));
const storeUserCache_1 = require("./storeUserCache");
// User Schema (reusable)
const createUserSchema = () => {
    return new mongoose_1.Schema({
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['Admin', 'Manager', 'Cashier'],
            default: 'Cashier',
            required: true,
        },
        permissions: {
            type: [String],
            enum: [
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
            default: [],
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
        },
        lastLogin: {
            type: Date,
        },
        storeId: {
            type: String,
            required: false,
            trim: true,
            lowercase: true,
            default: null,
            // null means system/admin user, string means store-specific user
        },
    }, {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.password;
                return ret;
            },
        },
    });
};
// Hash password before saving
const addPasswordHashing = (schema) => {
    schema.pre('save', async function (next) {
        if (!this.isModified('password')) {
            return next();
        }
        try {
            const salt = await bcryptjs_1.default.genSalt(12);
            const user = this;
            const currentPassword = user.password;
            user.password = await bcryptjs_1.default.hash(currentPassword, salt);
            next();
        }
        catch (error) {
            next(error);
        }
    });
    // Compare password method
    schema.methods.comparePassword = async function (candidatePassword) {
        const user = this;
        return bcryptjs_1.default.compare(candidatePassword, user.password);
    };
};
/**
 * Get the collection name for a store's users
 * @param storeId - Store ID (e.g., 'store1') or null for system users
 * @returns Collection name (e.g., 'store1_users' or 'system_users')
 */
function getUserCollectionName(storeId) {
    if (!storeId) {
        return 'system_users'; // System/admin users collection
    }
    return `${storeId.toLowerCase()}_users`;
}
/**
 * Model cache to avoid recreating models
 */
const userModelCache = new Map();
/**
 * Get the User model for a specific store
 * @param storeId - Store ID (e.g., 'store1') or null for system users
 * @param connection - Mongoose connection to use (optional, will get from database manager if not provided)
 * @returns User model for the store
 */
async function getUserModel(storeId, connection) {
    const collectionName = getUserCollectionName(storeId);
    // Check cache first
    if (userModelCache.has(collectionName)) {
        const cachedModel = userModelCache.get(collectionName);
        // Verify the model is still valid
        if (cachedModel.db.readyState === 1) {
            return cachedModel;
        }
        // Remove stale model from cache
        userModelCache.delete(collectionName);
    }
    let dbConnection;
    if (storeId) {
        // Get database connection for the store
        const databaseId = await (0, databaseManager_1.getDatabaseIdForStore)(storeId, Store_1.default);
        if (!databaseId) {
            throw new Error(`Store "${storeId}" not found or has no database assigned`);
        }
        dbConnection = await (0, databaseManager_1.getDatabaseConnection)(databaseId);
    }
    else {
        // System users - use main connection
        if (connection) {
            dbConnection = connection;
        }
        else {
            dbConnection = mongoose_1.default.connection;
        }
    }
    // Check if model already exists in this connection
    if (dbConnection.models[collectionName]) {
        const model = dbConnection.models[collectionName];
        userModelCache.set(collectionName, model);
        return model;
    }
    // Create schema and add password hashing
    const schema = createUserSchema();
    addPasswordHashing(schema);
    // Add indexes for performance
    schema.index({ role: 1 });
    schema.index({ storeId: 1 });
    schema.index({ email: 1 }); // Index for email lookups
    schema.index({ username: 1 }); // Index for username lookups
    schema.index({ status: 1 }); // Index for status filtering
    // Compound index for store-specific username uniqueness
    schema.index({ storeId: 1, username: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
    // Compound index for store-specific email uniqueness
    schema.index({ storeId: 1, email: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
    // Create model with the collection name on the specific connection
    const model = dbConnection.model(collectionName, schema, collectionName);
    // Cache the model
    userModelCache.set(collectionName, model);
    return model;
}
/**
 * Search for a user across all store collections
 * This is used for login when we don't know which store the user belongs to
 * Optimized with caching to avoid searching all stores when possible
 * @param query - MongoDB query object (e.g., { email: 'user@example.com' })
 * @param storeIdHint - Optional storeId hint to search in a specific store first
 * @returns User document or null
 */
async function findUserAcrossStores(query, storeIdHint) {
    // Extract email or username from query for cache lookup
    const email = query.email || (query.$or && query.$or.find((q) => q.email)?.email);
    const username = query.username || (query.$or && query.$or.find((q) => q.username)?.username);
    // Try cache first if we have email or username
    let cachedStoreId = null;
    if (email) {
        cachedStoreId = (0, storeUserCache_1.getStoreIdForEmail)(email);
    }
    else if (username) {
        cachedStoreId = (0, storeUserCache_1.getStoreIdForUsername)(username);
    }
    // Use storeId hint if provided, otherwise use cached storeId
    const targetStoreId = storeIdHint || cachedStoreId;
    // If we have a target store, search there first
    if (targetStoreId) {
        try {
            const userModel = await getUserModel(targetStoreId);
            const user = await userModel.findOne(query).select('+password');
            if (user) {
                // Cache the mapping for future lookups
                if (user.email)
                    (0, storeUserCache_1.cacheEmailToStore)(user.email, user.storeId ?? null);
                if (user.username)
                    (0, storeUserCache_1.cacheUsernameToStore)(user.username, user.storeId ?? null);
                return user;
            }
        }
        catch (error) {
            console.warn(`⚠️ Could not search users in store ${targetStoreId}: ${error.message}`);
            // Continue to search other stores
        }
    }
    // First, try system users collection
    try {
        const systemUserModel = await getUserModel(null);
        const systemUser = await systemUserModel.findOne(query).select('+password');
        if (systemUser) {
            return systemUser;
        }
    }
    catch (error) {
        // System users collection might not exist yet, continue
    }
    // If we already searched the cached store, skip it in the loop
    const stores = await Store_1.default.find({}).lean();
    for (const store of stores) {
        // Skip if we already searched this store
        if (targetStoreId && store.storeId.toLowerCase() === targetStoreId.toLowerCase()) {
            continue;
        }
        try {
            const userModel = await getUserModel(store.storeId);
            const user = await userModel.findOne(query).select('+password');
            if (user) {
                // Cache the mapping for future lookups
                if (user.email)
                    (0, storeUserCache_1.cacheEmailToStore)(user.email, user.storeId ?? null);
                if (user.username)
                    (0, storeUserCache_1.cacheUsernameToStore)(user.username, user.storeId ?? null);
                return user;
            }
        }
        catch (error) {
            // Store might not have a database assigned yet, skip it
            console.warn(`⚠️ Could not search users in store ${store.storeId}: ${error.message}`);
            continue;
        }
    }
    return null;
}
/**
 * Find user by ID across all store collections
 * @param userId - User ID
 * @param storeId - Optional store ID to narrow search
 * @returns User document or null
 */
async function findUserByIdAcrossStores(userId, storeId) {
    // If storeId is provided, search only in that store's collection
    if (storeId !== undefined) {
        try {
            const userModel = await getUserModel(storeId);
            return await userModel.findById(userId);
        }
        catch (error) {
            console.warn(`⚠️ Could not find user in store ${storeId}: ${error.message}`);
            return null;
        }
    }
    // Search across all collections
    // First, try system users
    try {
        const systemUserModel = await getUserModel(null);
        const systemUser = await systemUserModel.findById(userId);
        if (systemUser) {
            return systemUser;
        }
    }
    catch (error) {
        // System users collection might not exist yet, continue
    }
    // Search in all store collections
    const stores = await Store_1.default.find({}).lean();
    for (const store of stores) {
        try {
            const userModel = await getUserModel(store.storeId);
            const user = await userModel.findById(userId);
            if (user) {
                return user;
            }
        }
        catch (error) {
            console.warn(`⚠️ Could not search users in store ${store.storeId}: ${error.message}`);
            continue;
        }
    }
    return null;
}
/**
 * Clear the user model cache (useful for testing or when connections change)
 */
function clearUserModelCache() {
    userModelCache.clear();
}
/**
 * Invalidate user cache when user is created, updated, or deleted
 * This should be called after any user modification
 */
function invalidateUserCaches(email, username) {
    (0, storeUserCache_1.invalidateUserCache)(email, username);
}
