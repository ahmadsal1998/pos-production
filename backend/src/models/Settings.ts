import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings {
  _id: mongoose.Types.ObjectId;
  storeId: string; // REQUIRED: Store ID for multi-tenant isolation
  key: string; // Setting key (unique per store)
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
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
      // Index is created via compound indexes below
    },
    key: {
      type: String,
      required: [true, 'Setting key is required'],
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

// CRITICAL INDEXES for performance
// Unique key per store
settingsSchema.index({ storeId: 1, key: 1 }, { unique: true });
// List settings by store
settingsSchema.index({ storeId: 1, createdAt: -1 });

// Create unified model - single collection with storeId
const Settings: Model<SettingsDocument> = mongoose.model<SettingsDocument>('Settings', settingsSchema);

/**
 * @deprecated Use Settings model directly and filter by storeId
 * Get Settings model - returns the unified Settings model
 * All settings are stored in a single collection with storeId field
 */
export async function getStoreSettingsModel(
  prefix: string,
  databaseId: number
): Promise<Model<SettingsDocument>> {
  // Return the unified Settings model
  // Always filter queries by storeId when using this model
  return Settings;
}

export default Settings;

