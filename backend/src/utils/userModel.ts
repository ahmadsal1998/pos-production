import mongoose, { Schema, Model, Connection } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/auth.types';
import { getDatabaseConnection, getDatabaseIdForStore } from './databaseManager';
import Store from '../models/Store';
import {
  getStoreIdForEmail,
  getStoreIdForUsername,
  cacheEmailToStore,
  cacheUsernameToStore,
  invalidateUserCache,
} from './storeUserCache';

// MongoDB Document interface
export interface UserDocument extends mongoose.Document, Omit<IUser, '_id'> {
  _id: mongoose.Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema (reusable)
const createUserSchema = (): Schema => {
  return new Schema(
    {
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
    },
    {
      timestamps: true,
      toJSON: {
        transform: function (doc, ret: any) {
          ret.id = ret._id;
          delete ret._id;
          delete ret.__v;
          delete ret.password;
          return ret;
        },
      },
    }
  );
};

// Hash password before saving
const addPasswordHashing = (schema: Schema): void => {
  schema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }

    try {
      const salt = await bcrypt.genSalt(12);
      const user = this as any as UserDocument;
      const currentPassword = user.password as string;
      user.password = await bcrypt.hash(currentPassword, salt);
      next();
    } catch (error: any) {
      next(error);
    }
  });

  // Compare password method
  schema.methods.comparePassword = async function (
    candidatePassword: string
  ): Promise<boolean> {
    const user = this as any as UserDocument;
    return bcrypt.compare(candidatePassword, user.password as string);
  };
};

/**
 * Get the collection name for a store's users
 * @param storeId - Store ID (e.g., 'store1') or null for system users
 * @returns Collection name (e.g., 'store1_users' or 'system_users')
 */
export function getUserCollectionName(storeId: string | null): string {
  if (!storeId) {
    return 'system_users'; // System/admin users collection
  }
  return `${storeId.toLowerCase()}_users`;
}

/**
 * Model cache to avoid recreating models
 */
const userModelCache: Map<string, Model<UserDocument>> = new Map();

/**
 * Get the User model for a specific store
 * @param storeId - Store ID (e.g., 'store1') or null for system users
 * @param connection - Mongoose connection to use (optional, will get from database manager if not provided)
 * @returns User model for the store
 */
export async function getUserModel(
  storeId: string | null,
  connection?: Connection
): Promise<Model<UserDocument>> {
  const collectionName = getUserCollectionName(storeId);
  
  // Check cache first
  if (userModelCache.has(collectionName)) {
    const cachedModel = userModelCache.get(collectionName)!;
    // Verify the model is still valid
    if (cachedModel.db.readyState === 1) {
      return cachedModel;
    }
    // Remove stale model from cache
    userModelCache.delete(collectionName);
  }

  let dbConnection: Connection;

  if (storeId) {
    // Get database connection for the store
    const databaseId = await getDatabaseIdForStore(storeId, Store);
    if (!databaseId) {
      throw new Error(`Store "${storeId}" not found or has no database assigned`);
    }
    dbConnection = await getDatabaseConnection(databaseId);
  } else {
    // System users - use main connection
    if (connection) {
      dbConnection = connection;
    } else {
      dbConnection = mongoose.connection;
    }
  }

  // Check if model already exists in this connection
  if (dbConnection.models[collectionName]) {
    const model = dbConnection.models[collectionName] as Model<UserDocument>;
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
  const model = dbConnection.model<UserDocument>(collectionName, schema, collectionName);
  
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
export async function findUserAcrossStores(
  query: Record<string, any>,
  storeIdHint?: string | null
): Promise<UserDocument | null> {
  // Extract email or username from query for cache lookup
  const email = query.email || (query.$or && query.$or.find((q: any) => q.email)?.email);
  const username = query.username || (query.$or && query.$or.find((q: any) => q.username)?.username);
  
  // Try cache first if we have email or username
  let cachedStoreId: string | null = null;
  if (email) {
    cachedStoreId = getStoreIdForEmail(email);
  } else if (username) {
    cachedStoreId = getStoreIdForUsername(username);
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
        if (user.email) cacheEmailToStore(user.email, user.storeId ?? null);
        if (user.username) cacheUsernameToStore(user.username, user.storeId ?? null);
        return user;
      }
    } catch (error: any) {
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
  } catch (error) {
    // System users collection might not exist yet, continue
  }

  // If we already searched the cached store, skip it in the loop
  const stores = await Store.find({}).lean();
  
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
        if (user.email) cacheEmailToStore(user.email, user.storeId ?? null);
        if (user.username) cacheUsernameToStore(user.username, user.storeId ?? null);
        return user;
      }
    } catch (error: any) {
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
export async function findUserByIdAcrossStores(
  userId: string,
  storeId?: string | null
): Promise<UserDocument | null> {
  // If storeId is provided, search only in that store's collection
  if (storeId !== undefined) {
    try {
      const userModel = await getUserModel(storeId);
      return await userModel.findById(userId);
    } catch (error: any) {
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
  } catch (error) {
    // System users collection might not exist yet, continue
  }

  // Search in all store collections
  const stores = await Store.find({}).lean();
  
  for (const store of stores) {
    try {
      const userModel = await getUserModel(store.storeId);
      const user = await userModel.findById(userId);
      if (user) {
        return user;
      }
    } catch (error: any) {
      console.warn(`⚠️ Could not search users in store ${store.storeId}: ${error.message}`);
      continue;
    }
  }

  return null;
}

/**
 * Clear the user model cache (useful for testing or when connections change)
 */
export function clearUserModelCache(): void {
  userModelCache.clear();
}

/**
 * Invalidate user cache when user is created, updated, or deleted
 * This should be called after any user modification
 */
export function invalidateUserCaches(email?: string, username?: string): void {
  invalidateUserCache(email, username);
}

