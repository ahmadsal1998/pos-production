import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerminal extends Document {
  merchantId?: mongoose.Types.ObjectId; // Optional: Reference to Merchant (for merchant-based terminals)
  storeId?: string; // Optional: Direct store linkage (for store-based terminals)
  merchantIdMid?: string; // MID - Merchant ID from payment processor (required if storeId is set, optional if merchantId is set)
  terminalId: string; // TID - Terminal ID from payment processor
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
  createdAt: Date;
  updatedAt: Date;
}

const terminalSchema = new Schema<ITerminal>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: false,
      index: true,
      default: null,
    },
    storeId: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    merchantIdMid: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: null,
    },
    terminalId: {
      type: String,
      required: [true, 'Terminal ID (TID) is required'],
      trim: true,
      uppercase: true,
      index: true,
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
      index: true,
    },
    testMode: {
      type: Boolean,
      default: false,
      index: true,
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

// Pre-save validation: Ensure either merchantId OR (storeId + merchantIdMid) is provided
terminalSchema.pre('save', async function (next) {
  const terminal = this as ITerminal;
  
  // If merchantId is provided, that's valid (merchant-based terminal)
  if (terminal.merchantId) {
    return next();
  }
  
  // If no merchantId, then storeId and merchantIdMid must be provided (store-based terminal)
  if (!terminal.storeId || !terminal.merchantIdMid) {
    return next(new Error('Either merchantId OR (storeId + merchantIdMid) must be provided'));
  }
  
  next();
});

// Compound indexes for unique terminal IDs
// Unique terminal ID per merchant (for merchant-based terminals)
terminalSchema.index({ merchantId: 1, terminalId: 1 }, { 
  unique: true, 
  partialFilterExpression: { merchantId: { $ne: null } } 
});

// Unique terminal ID per store (for store-based terminals)
terminalSchema.index({ storeId: 1, terminalId: 1 }, { 
  unique: true, 
  partialFilterExpression: { storeId: { $ne: null } } 
});

// Indexes for querying
terminalSchema.index({ status: 1, testMode: 1 });
terminalSchema.index({ merchantId: 1, status: 1 });
terminalSchema.index({ storeId: 1, status: 1 });

export const Terminal: Model<ITerminal> = mongoose.model<ITerminal>('Terminal', terminalSchema);

