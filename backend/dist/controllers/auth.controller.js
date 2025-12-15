"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResetPassword = exports.validateVerifyOTP = exports.validateForgotPassword = exports.validateLogin = exports.resetPassword = exports.verifyOTP = exports.forgotPassword = exports.getContactNumber = exports.logout = exports.getMe = exports.login = void 0;
const express_validator_1 = require("express-validator");
const OTP_1 = __importDefault(require("../models/OTP"));
const Settings_1 = __importDefault(require("../models/Settings"));
const jwt_1 = require("../utils/jwt");
const error_middleware_1 = require("../middleware/error.middleware");
const otp_1 = require("../utils/otp");
const email_1 = require("../utils/email");
const User_1 = __importDefault(require("../models/User"));
const subscriptionManager_1 = require("../utils/subscriptionManager");
// Login controller
exports.login = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    // Check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { emailOrUsername, password, storeId } = req.body;
    // Check admin credentials first (from .env)
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminUsername && adminPassword) {
        if (emailOrUsername.toLowerCase() === adminUsername.toLowerCase() &&
            password === adminPassword) {
            // Admin login successful
            const tokenPayload = {
                userId: 'admin',
                email: adminUsername,
                role: 'Admin',
                storeId: null, // Admin users don't have a store
            };
            const token = (0, jwt_1.generateToken)(tokenPayload);
            const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
            return res.status(200).json({
                success: true,
                message: 'Admin login successful',
                data: {
                    user: {
                        id: 'admin',
                        fullName: 'System Admin',
                        username: adminUsername,
                        email: adminUsername,
                        role: 'Admin',
                        permissions: [],
                        isAdmin: true,
                    },
                    token,
                    refreshToken,
                },
            });
        }
    }
    // Continue with regular store user login
    // Use unified User model - email is globally unique, username is per-store
    // Find user by email or username in unified collection
    const user = await User_1.default.findOne({
        $or: [
            { email: emailOrUsername.toLowerCase() },
            { username: emailOrUsername.toLowerCase() },
        ],
    }).select('+password');
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password',
        });
    }
    // Check if user is active
    if (user.status !== 'Active') {
        return res.status(401).json({
            success: false,
            message: 'Your account has been deactivated. Please contact admin.',
        });
    }
    // Check store subscription status if user belongs to a store
    // Note: We allow login even if subscription expired, but include status in response
    let subscriptionStatus = null;
    if (user.storeId) {
        try {
            subscriptionStatus = await (0, subscriptionManager_1.checkAndUpdateStoreSubscription)(user.storeId);
        }
        catch (error) {
            // If store not found, log but continue (shouldn't happen in normal flow)
            console.error(`Error checking subscription for store ${user.storeId}:`, error.message);
        }
    }
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password',
        });
    }
    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    // Generate tokens
    const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        storeId: user.storeId || null,
    };
    const token = (0, jwt_1.generateToken)(tokenPayload);
    const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
    // Send response
    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id.toString(),
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                storeId: user.storeId || null,
            },
            token,
            refreshToken,
            subscriptionStatus: subscriptionStatus ? {
                isActive: subscriptionStatus.isActive,
                subscriptionExpired: subscriptionStatus.subscriptionExpired,
                subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
            } : null,
        },
    });
});
// Get current user
exports.getMe = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    const userId = req.user?.userId;
    const storeId = req.user?.storeId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'User ID not found in token',
        });
    }
    // Find user in unified collection
    const user = await User_1.default.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Check store subscription status if user belongs to a store
    let subscriptionStatus = null;
    if (user.storeId) {
        try {
            subscriptionStatus = await (0, subscriptionManager_1.checkAndUpdateStoreSubscription)(user.storeId);
        }
        catch (error) {
            // If store not found, log but continue (shouldn't happen in normal flow)
            console.error(`Error checking subscription for store ${user.storeId}:`, error.message);
        }
    }
    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user._id.toString(),
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
                status: user.status,
                lastLogin: user.lastLogin,
            },
            subscriptionStatus: subscriptionStatus ? {
                isActive: subscriptionStatus.isActive,
                subscriptionExpired: subscriptionStatus.subscriptionExpired,
                subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
            } : null,
        },
    });
});
// Logout controller (mostly client-side, but can be used for refresh token invalidation)
exports.logout = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});
// Get contact number for expired subscription page (public endpoint)
exports.getContactNumber = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    const setting = await Settings_1.default.findOne({ key: 'subscription_contact_number' });
    // Default contact number if not set
    const contactNumber = setting?.value || '0593202029';
    res.status(200).json({
        success: true,
        data: {
            contactNumber,
        },
    });
});
// Forgot Password controller (Send OTP)
exports.forgotPassword = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    // Check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { email } = req.body;
    // Find user by email in unified collection (email is globally unique)
    const user = await User_1.default.findOne({
        email: email.toLowerCase(),
    });
    if (!user) {
        // For security, don't reveal if email exists or not
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
        });
    }
    // Check if user is active
    if (user.status !== 'Active') {
        return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact admin.',
        });
    }
    // Delete any existing OTP for this email
    await OTP_1.default.deleteMany({ email: email.toLowerCase() });
    // Generate new OTP
    const code = (0, otp_1.generateOTP)();
    const expiresAt = (0, otp_1.getOTPExpiration)();
    // Save OTP to database
    await OTP_1.default.create({
        email: email.toLowerCase(),
        code,
        expiresAt,
    });
    // Send OTP via email
    console.log(`📨 Sending OTP email to: ${email}`);
    const emailResult = await (0, email_1.sendOTPEmail)(email, code);
    if (!emailResult.success) {
        // If email fails, still return success for security
        // Log error for debugging
        console.error('❌ Failed to send OTP email:', {
            email,
            error: emailResult.error,
            message: emailResult.message,
            hasApiKey: !!process.env.RESEND_API_KEY,
            apiKeyLength: process.env.RESEND_API_KEY?.length || 0,
        });
        // Optionally, you could delete the OTP here if email fails
        // await OTP.deleteMany({ email: email.toLowerCase() });
    }
    else {
        console.log(`✅ OTP email sent successfully to: ${email}`);
    }
    // Return success response
    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
    });
});
// Verify OTP controller
exports.verifyOTP = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    // Check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { email, code } = req.body;
    // Find OTP record
    const otpRecord = await OTP_1.default.findOne({
        email: email.toLowerCase(),
        code,
    });
    if (!otpRecord) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired OTP code',
        });
    }
    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
        await OTP_1.default.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({
            success: false,
            message: 'OTP code has expired',
        });
    }
    // OTP is valid
    res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
    });
});
// Reset Password controller
exports.resetPassword = (0, error_middleware_1.asyncHandler)(async (req, res, next) => {
    // Check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { email, newPassword } = req.body;
    // Find user by email in unified collection (email is globally unique)
    const user = await User_1.default.findOne({
        email: email.toLowerCase(),
    });
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Verify that a valid OTP exists for this email
    // User should have verified OTP using /verify-otp endpoint first
    const otpRecord = await OTP_1.default.findOne({
        email: email.toLowerCase(),
    });
    if (!otpRecord) {
        return res.status(400).json({
            success: false,
            message: 'OTP verification required. Please verify OTP first.',
        });
    }
    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
        await OTP_1.default.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new one.',
        });
    }
    // Update user password directly (the pre-save hook will hash it)
    // We set the plain password so the pre-save hook can hash it properly
    user.password = newPassword;
    // Mark password as modified so pre-save hook runs
    user.markModified('password');
    // Save user (pre-save hook will hash the password)
    await user.save({ validateBeforeSave: false });
    // Delete all OTP records for this email (used or expired)
    await OTP_1.default.deleteMany({ email: email.toLowerCase() });
    // Return success response
    res.status(200).json({
        success: true,
        message: 'Password reset successfully',
    });
});
// Validation middleware
exports.validateLogin = [
    (0, express_validator_1.body)('emailOrUsername')
        .notEmpty()
        .withMessage('Email or username is required')
        .trim(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];
// Validation middleware for forgot password
exports.validateForgotPassword = [
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .trim(),
];
// Validation middleware for verify OTP
exports.validateVerifyOTP = [
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .trim(),
    (0, express_validator_1.body)('code')
        .notEmpty()
        .withMessage('OTP code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP code must be 6 digits')
        .matches(/^\d+$/)
        .withMessage('OTP code must contain only numbers'),
];
// Validation middleware for reset password
exports.validateResetPassword = [
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail()
        .trim(),
    (0, express_validator_1.body)('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];
