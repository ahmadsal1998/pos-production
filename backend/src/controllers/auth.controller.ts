import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import OTP from '../models/OTP';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { generateOTP, getOTPExpiration } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';
import bcrypt from 'bcryptjs';

// Login controller
export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { emailOrUsername, password } = req.body;

    // Find user by email or username
    const user = await User.findOne({
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
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

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
        },
        token,
        refreshToken,
      },
    });
  }
);

// Get current user
export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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
      },
    });
  }
);

// Logout controller (mostly client-side, but can be used for refresh token invalidation)
export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
);

// Forgot Password controller (Send OTP)
export const forgotPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({
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
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiration();

    // Save OTP to database
    await OTP.create({
      email: email.toLowerCase(),
      code,
      expiresAt,
    });

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, code);
    if (!emailResult.success) {
      // If email fails, still return success for security
      // Log error for debugging
      console.error('Failed to send OTP email:', emailResult.error || emailResult.message);
      // Optionally, you could delete the OTP here if email fails
      // await OTP.deleteMany({ email: email.toLowerCase() });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  }
);

// Verify OTP controller
export const verifyOTP = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, code } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({
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
      await OTP.deleteOne({ _id: otpRecord._id });
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
  }
);

// Reset Password controller
export const resetPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, newPassword } = req.body;

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify that a valid OTP exists for this email
    // User should have verified OTP using /verify-otp endpoint first
    const otpRecord = await OTP.findOne({
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
      await OTP.deleteOne({ _id: otpRecord._id });
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
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  }
);

// Validation middleware
export const validateLogin = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Validation middleware for forgot password
export const validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
];

// Validation middleware for verify OTP
export const validateVerifyOTP = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
  body('code')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be 6 digits')
    .matches(/^\d+$/)
    .withMessage('OTP code must contain only numbers'),
];

// Validation middleware for reset password
export const validateResetPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

