import mongoose, { Schema, Document, Model } from 'mongoose';

// Terminal subdocument interface for embedded terminals
export interface ITerminal {
  _id?: mongoose.Types.ObjectId;
  terminalId: string; // TID - Terminal ID from payment processor
  merchantIdMid: string; // MID - Merchant ID from payment processor
  name: string; // Friendly name for the terminal
  host: string; // IP address or hostname
  port: number; // Port number (default: 12000)
  connectionType: 'ethernet' | 'usb' | 'serial';
  status: 'Active' | 'Inactive' | 'Maintenance';
  testMode: boolean; // Test mode enabled for this terminal
  timeout: number; // Payment timeout in milliseconds
  description?: string;
  lastConnected?: Date;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStore {
  _id: mongoose.Types.ObjectId;
  storeNumber: number; // Sequential store number (1, 2, 3, 4, 5...)
  storeId: string;
  name: string;
  prefix: string;
  databaseId: number; // Database ID (1-5) where this store's data is stored
  terminals: ITerminal[]; // Array of terminals for this store
  subscriptionStartDate: Date; // Subscription start date
  subscriptionEndDate: Date; // Subscription end date
  isActive: boolean; // Whether the store account is active (subscription status)
  isTrialAccount: boolean; // Whether this is a trial account (uses _test collections)
  // Contact information
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreDocument extends Document, Omit<IStore, '_id'> {
  _id: mongoose.Types.ObjectId;
}

// Terminal subdocument schema
const terminalSchema = new Schema<ITerminal>(
  {
    terminalId: {
      type: String,
      required: [true, 'Terminal ID (TID) is required'],
      trim: true,
      uppercase: true,
    },
    merchantIdMid: {
      type: String,
      required: [true, 'Merchant ID (MID) is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Terminal name is required'],
      trim: true,
    },
    host: {
      type: String,
      required: [true, 'Terminal host/IP is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          // Basic validation for IP address or hostname
          return /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/.test(v);
        },
        message: 'Invalid host/IP address format',
      },
    },
    port: {
      type: Number,
      required: [true, 'Port is required'],
      default: 12000,
      min: [1, 'Port must be between 1 and 65535'],
      max: [65535, 'Port must be between 1 and 65535'],
    },
    connectionType: {
      type: String,
      enum: ['ethernet', 'usb', 'serial'],
      required: [true, 'Connection type is required'],
      default: 'ethernet',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Maintenance'],
      default: 'Active',
    },
    testMode: {
      type: Boolean,
      default: false,
    },
    timeout: {
      type: Number,
      default: 60000, // 60 seconds
      min: [1000, 'Timeout must be at least 1000ms'],
    },
    description: {
      type: String,
      trim: true,
    },
    lastConnected: {
      type: Date,
    },
    lastError: {
      type: String,
    },
  },
  {
    timestamps: true,
    _id: true, // Enable _id for terminal subdocuments
  }
);

const storeSchema = new Schema<StoreDocument>(
  {
    storeNumber: {
      type: Number,
      required: [true, 'Store number is required'],
      min: [1, 'Store number must be at least 1'],
    },
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    prefix: {
      type: String,
      required: [true, 'Store prefix is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, 'Prefix must contain only lowercase letters, numbers, and underscores'],
    },
    databaseId: {
      type: Number,
      required: [true, 'Database ID is required'],
      min: 1,
      max: 5, // Based on DATABASE_CONFIG.DATABASE_COUNT
    },
    terminals: {
      type: [terminalSchema],
      default: [],
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    subscriptionEndDate: {
      type: Date,
      default: function() {
        // Default to 1 year from now for existing stores without subscription data
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isTrialAccount: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Contact information
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
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
        // Transform terminal _id to id
        if (ret.terminals && Array.isArray(ret.terminals)) {
          ret.terminals = ret.terminals.map((term: any) => {
            if (term._id) {
              term.id = term._id;
              delete term._id;
            }
            return term;
          });
        }
        return ret;
      },
    },
  }
);

// Indexes
storeSchema.index({ storeNumber: 1 }, { unique: true });
storeSchema.index({ storeId: 1 });
storeSchema.index({ prefix: 1 });
storeSchema.index({ databaseId: 1 });

// Create model
const Store: Model<StoreDocument> = mongoose.model<StoreDocument>('Store', storeSchema);

export default Store;

