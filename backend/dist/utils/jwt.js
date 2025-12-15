"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE,
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRE,
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token) => {
    try {
        // Verify token with detailed error handling
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        // Provide more detailed error information for debugging
        if (error.name === 'TokenExpiredError') {
            console.error('[JWT] Token expired:', {
                expiredAt: error.expiredAt,
                currentTime: new Date(),
            });
            throw new Error('Token expired');
        }
        else if (error.name === 'JsonWebTokenError') {
            console.error('[JWT] Invalid token:', {
                message: error.message,
                secretSet: !!JWT_SECRET,
                secretLength: JWT_SECRET?.length || 0,
            });
            throw new Error('Invalid token');
        }
        else if (error.name === 'NotBeforeError') {
            console.error('[JWT] Token not active yet:', {
                notBefore: error.date,
                currentTime: new Date(),
            });
            throw new Error('Token not active');
        }
        else {
            console.error('[JWT] Token verification error:', {
                name: error.name,
                message: error.message,
            });
            throw new Error('Invalid or expired token');
        }
    }
};
exports.verifyToken = verifyToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
    }
    catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
