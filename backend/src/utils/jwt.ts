import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

export const generateToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    // Verify token with detailed error handling
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (error: any) {
    // Provide more detailed error information for debugging
    if (error.name === 'TokenExpiredError') {
      console.error('[JWT] Token expired:', {
        expiredAt: error.expiredAt,
        currentTime: new Date(),
      });
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.error('[JWT] Invalid token:', {
        message: error.message,
        secretSet: !!JWT_SECRET,
        secretLength: JWT_SECRET?.length || 0,
      });
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      console.error('[JWT] Token not active yet:', {
        notBefore: error.date,
        currentTime: new Date(),
      });
      throw new Error('Token not active');
    } else {
      console.error('[JWT] Token verification error:', {
        name: error.name,
        message: error.message,
      });
      throw new Error('Invalid or expired token');
    }
  }
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AuthTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

