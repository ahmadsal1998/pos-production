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
const sequenceSchema = new mongoose_1.Schema({
    storeId: {
        type: String,
        required: true,
        index: true,
        lowercase: true,
        trim: true,
    },
    sequenceType: {
        type: String,
        required: true,
        default: 'invoiceNumber',
        index: true,
    },
    value: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
});
// Compound unique index: one sequence per store per type
sequenceSchema.index({ storeId: 1, sequenceType: 1 }, { unique: true });
// Export the model (using unified collection, no prefix needed)
const Sequence = mongoose_1.default.models.Sequence || mongoose_1.default.model('Sequence', sequenceSchema);
exports.default = Sequence;
