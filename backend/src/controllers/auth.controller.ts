import { Response, NextFunction, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { authService } from '../services/auth.service';

// Login controller — validation, call service, format response
export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { emailOrUsername, password } = req.body;
    const result = await authService.login(emailOrUsername, password);

    if (!result.success) {
      const status = result.message.includes('deactivated') ? 403 : 401;
      return res.status(status).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        subscriptionStatus: result.subscriptionStatus ?? null,
      },
    });
  }
);

// Refresh access token using refresh token (no auth header required)
export const refresh = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshTokenFromBody = (req.body?.refreshToken as string)?.trim();
    if (!refreshTokenFromBody) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }
    const result = await authService.refresh(refreshTokenFromBody);
    if ('token' in result && result.token) {
      return res.status(200).json({
        success: true,
        data: {
          token: result.token,
          refreshToken: result.refreshToken,
        },
      });
    }
    return res.status(401).json({
      success: false,
      message: (result as { message?: string }).message || 'Invalid or expired refresh token',
    });
  }
);

// Get current user
export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token',
      });
    }

    const data = await authService.getMe(userId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: data.user,
        subscriptionStatus: data.subscriptionStatus ?? null,
      },
    });
  }
);

export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
);

// Get contact number for expired subscription page (public)
export const getContactNumber = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const data = await authService.getContactNumber();
    res.status(200).json({
      success: true,
      data: { contactNumber: data.contactNumber },
    });
  }
);

// Forgot Password — send OTP
export const forgotPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    if (!result.success) {
      return res.status(403).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

// Verify OTP
export const verifyOTP = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, code } = req.body;
    const result = await authService.verifyOTP(email, code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  }
);

// Reset Password
export const resetPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, newPassword } = req.body;
    const result = await authService.resetPassword(email, newPassword);

    if (!result.success) {
      const status = result.message.includes('not found') ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
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

export const validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
];

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
