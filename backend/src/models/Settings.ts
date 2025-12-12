import mongoose, { Schema, Document, Model, Connection } from 'mongoose';
import { getDatabaseConnection } from '../utils/databaseManager';
import { getStoreCollectionName } from '../utils/storeCollections';

export interface ISettings {
  _id: mongoose.Types.ObjectId;
  key: string; // Unique key for the setting
  value: string; // Value of the setting
  description?: string; // Description of what this setting does
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsDocument extends Document, Omit<ISettings, '_id'> {
  _id: mongoose.Types.ObjectId;
}

export const settingsSchema = new Schema<SettingsDocument>(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: String,
      required: [true, 'Setting value is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
settingsSchema.index({ key: 1 }, { unique: true });

// Create model
const Settings: Model<SettingsDocument> = mongoose.model<SettingsDocument>('Settings', settingsSchema);

/**
 * Cache for store-specific settings models keyed by database and collection
 */
const storeSettingsModelCache: Map<string, Model<SettingsDocument>> = new Map();

/**
 * Get a store-scoped Settings model that lives in the store's database.
 * This keeps settings isolated per store/database instead of sharing one collection.
 */
export async function getStoreSettingsModel(
  prefix: string,
  databaseId: number
): Promise<Model<SettingsDocument>> {
  const collectionName = getStoreCollectionName(prefix, 'settings');
  const cacheKey = `${databaseId}_${collectionName}`;

  if (storeSettingsModelCache.has(cacheKey)) {
    const cached = storeSettingsModelCache.get(cacheKey)!;
    if (cached.db.readyState === 1) {
      return cached;
    }
    storeSettingsModelCache.delete(cacheKey);
  }

  const connection: Connection = await getDatabaseConnection(databaseId);

  if (connection.models[collectionName]) {
    const model = connection.models[collectionName] as Model<SettingsDocument>;
    storeSettingsModelCache.set(cacheKey, model);
    return model;
  }

  const model = connection.model<SettingsDocument>(collectionName, settingsSchema, collectionName);
  storeSettingsModelCache.set(cacheKey, model);
  return model;
}

export default Settings;

