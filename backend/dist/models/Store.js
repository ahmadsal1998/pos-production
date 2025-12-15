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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Terminal subdocument schema
const terminalSchema = new mongoose_1.Schema({
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
            validator: function (v) {
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
}, {
    timestamps: true,
    _id: true, // Enable _id for terminal subdocuments
});
const storeSchema = new mongoose_1.Schema({
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
        default: function () {
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
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            // Transform terminal _id to id
            if (ret.terminals && Array.isArray(ret.terminals)) {
                ret.terminals = ret.terminals.map((term) => {
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
});
// Indexes
storeSchema.index({ storeNumber: 1 }, { unique: true });
storeSchema.index({ storeId: 1 });
storeSchema.index({ prefix: 1 });
storeSchema.index({ databaseId: 1 });
// Create model
const Store = mongoose_1.default.model('Store', storeSchema);
exports.default = Store;
