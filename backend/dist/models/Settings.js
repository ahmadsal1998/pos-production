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
exports.settingsSchema = void 0;
exports.getStoreSettingsModel = getStoreSettingsModel;
const mongoose_1 = __importStar(require("mongoose"));
exports.settingsSchema = new mongoose_1.Schema({
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
// CRITICAL INDEXES for performance
// Unique key per store
exports.settingsSchema.index({ storeId: 1, key: 1 }, { unique: true });
// List settings by store
exports.settingsSchema.index({ storeId: 1, createdAt: -1 });
// Create unified model - single collection with storeId
const Settings = mongoose_1.default.model('Settings', exports.settingsSchema);
/**
 * @deprecated Use Settings model directly and filter by storeId
 * Get Settings model - returns the unified Settings model
 * All settings are stored in a single collection with storeId field
 */
async function getStoreSettingsModel(prefix, databaseId) {
    // Return the unified Settings model
    // Always filter queries by storeId when using this model
    return Settings;
}
exports.default = Settings;
