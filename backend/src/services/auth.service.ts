import OTP from '../models/OTP';
import Settings from '../models/Settings';
import User, { UserDocument } from '../models/User';
import Store from '../models/Store';
import { generateToken, generateRefreshToken } from '../infrastructure/jwt';
import { generateOTP, getOTPExpiration } from '../infrastructure/otp';
import { sendOTPEmail } from '../infrastructure/email';
import { checkAndUpdateStoreSubscription } from '../utils/subscriptionManager';
import { AuthTokenPayload } from '../types/auth.types';

export interface LoginResult {
  success: true;
  message: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    permissions?: string[];
    isAdmin?: boolean;
    storeId?: string | null;
    storeTypeName?: string | null;
  };
  token: string;
  refreshToken: string;
  subscriptionStatus?: {
    isActive: boolean;
    subscriptionExpired: boolean;
    subscriptionEndDate?: string | null;
  } | null;
}

export interface LoginError {
  success: false;
  message: string;
}

export type LoginResponse = LoginResult | LoginError;

export interface GetMeResult {
  user: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
    status?: string;
    lastLogin?: Date;
    storeId?: string | null;
    storeTypeName?: string | null;
  };
  subscriptionStatus?: {
    isActive: boolean;
    subscriptionExpired: boolean;
    subscriptionEndDate?: string | null;
  } | null;
}

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

export interface VerifyOTPResult {
  success: boolean;
  message: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

export interface GetContactNumberResult {
  contactNumber: string;
}

/**
 * Auth service: login, getMe, forgot password, verify OTP, reset password.
 * Controllers handle validation and HTTP; this layer holds business logic.
 */
export const authService = {
  async login(emailOrUsername: string, password: string): Promise<LoginResponse> {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword) {
      if (
        emailOrUsername.toLowerCase() === adminUsername.toLowerCase() &&
        password === adminPassword
      ) {
        const tokenPayload: AuthTokenPayload = {
          userId: 'admin',
          email: adminUsername,
          role: 'Admin',
          storeId: null,
        };
        const token = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        return {
          success: true,
          message: 'Admin login successful',
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
        };
      }
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    }).select('+password');

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (user.status !== 'Active') {
      return {
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      };
    }

    let subscriptionStatus = null;
    let storeTypeName: string | null = null;
    if (user.storeId) {
      try {
        subscriptionStatus = await checkAndUpdateStoreSubscription(user.storeId);
        const store = await Store.findOne({ storeId: user.storeId.toLowerCase() })
          .populate('storeTypeId', 'name');
        if (store?.storeTypeId) {
          storeTypeName = (store.storeTypeId as any).name || null;
        }
      } catch (error: any) {
        console.error(`Error checking subscription for store ${user.storeId}:`, error.message);
      }
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid email or password' };
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const tokenPayload: AuthTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      storeId: user.storeId || null,
    };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        storeId: user.storeId || null,
        storeTypeName,
      },
      token,
      refreshToken,
      subscriptionStatus: subscriptionStatus
        ? {
            isActive: subscriptionStatus.isActive,
            subscriptionExpired: subscriptionStatus.subscriptionExpired,
            subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
          }
        : null,
    };
  },

  async getMe(userId: string): Promise<GetMeResult | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    let subscriptionStatus = null;
    let storeTypeName: string | null = null;
    if (user.storeId) {
      try {
        subscriptionStatus = await checkAndUpdateStoreSubscription(user.storeId);
        const store = await Store.findOne({ storeId: user.storeId.toLowerCase() })
          .populate('storeTypeId', 'name');
        if (store?.storeTypeId) {
          storeTypeName = (store.storeTypeId as any).name || null;
        }
      } catch (error: any) {
        console.error(`Error checking subscription for store ${user.storeId}:`, error.message);
      }
    }

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        status: user.status,
        lastLogin: user.lastLogin,
        storeId: user.storeId || null,
        storeTypeName,
      },
      subscriptionStatus: subscriptionStatus
        ? {
            isActive: subscriptionStatus.isActive,
            subscriptionExpired: subscriptionStatus.subscriptionExpired,
            subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
          }
        : null,
    };
  },

  async getContactNumber(): Promise<GetContactNumberResult> {
    const setting = await Settings.findOne({ key: 'subscription_contact_number' });
    return {
      contactNumber: setting?.value || '0593202029',
    };
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { success: true, message: 'OTP sent successfully' };
    }
    if (user.status !== 'Active') {
      return {
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      };
    }

    await OTP.deleteMany({ email: email.toLowerCase() });
    const code = generateOTP();
    const expiresAt = getOTPExpiration();
    await OTP.create({
      email: email.toLowerCase(),
      code,
      expiresAt,
    });

    const emailResult = await sendOTPEmail(email, code);
    if (!emailResult.success) {
      console.error('Failed to send OTP email', {
        email,
        error: emailResult.error,
        hasApiKey: !!process.env.RESEND_API_KEY,
      });
    }

    return { success: true, message: 'OTP sent successfully' };
  },

  async verifyOTP(email: string, code: string): Promise<VerifyOTPResult> {
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      code,
    });
    if (!otpRecord) {
      return { success: false, message: 'Invalid or expired OTP code' };
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { success: false, message: 'OTP code has expired' };
    }
    return { success: true, message: 'OTP verified successfully' };
  },

  async resetPassword(email: string, newPassword: string): Promise<ResetPasswordResult> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
    if (!otpRecord) {
      return { success: false, message: 'OTP verification required. Please verify OTP first.' };
    }
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    user.password = newPassword;
    user.markModified('password');
    await user.save({ validateBeforeSave: false });
    await OTP.deleteMany({ email: email.toLowerCase() });

    return { success: true, message: 'Password reset successfully' };
  },

  /**
   * Exchange a valid refresh token for a new access token (and optionally a new refresh token).
   * Used for silent session refresh on 401.
   */
  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string } | { success: false; message: string }> {
    const { verifyRefreshToken, generateToken, generateRefreshToken } = await import('../infrastructure/jwt');
    try {
      const payload = verifyRefreshToken(refreshToken);
      const tokenPayload: AuthTokenPayload = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        storeId: payload.storeId ?? null,
      };
      const token = generateToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      return { token, refreshToken: newRefreshToken };
    } catch {
      return { success: false, message: 'Invalid or expired refresh token' };
    }
  },
};
