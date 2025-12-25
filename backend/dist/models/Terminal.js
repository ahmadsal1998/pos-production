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
exports.Terminal = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const terminalSchema = new mongoose_1.Schema({
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: false,
        default: null,
    },
    storeId: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
    },
    merchantIdMid: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
    },
    terminalId: {
        type: String,
        required: [true, 'Terminal ID (TID) is required'],
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
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// Pre-save validation: Ensure either merchantId OR (storeId + merchantIdMid) is provided
terminalSchema.pre('save', async function (next) {
    const terminal = this;
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
exports.Terminal = mongoose_1.default.model('Terminal', terminalSchema);
