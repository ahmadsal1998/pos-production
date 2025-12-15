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
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// User Schema
const userSchema = new mongoose_1.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
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
        // Index is created via compound indexes below
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
// Hash password before saving
userSchema.pre('save', async function (next) {
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
userSchema.methods.comparePassword = async function (candidatePassword) {
    const user = this;
    return bcryptjs_1.default.compare(candidatePassword, user.password);
};
// CRITICAL INDEXES for performance
userSchema.index({ role: 1 });
// storeId index is handled by compound index below
// Unique username per store (for store users) - same username can exist in different stores
userSchema.index({ storeId: 1, username: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
// GLOBAL unique email across ALL stores - prevents same email in multiple stores
userSchema.index({ email: 1 }, { unique: true });
// Create model
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
