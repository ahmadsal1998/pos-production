import { Router } from 'express';
import {
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOTP,
  resetPassword,
  validateLogin,
  validateForgotPassword,
  validateVerifyOTP,
  validateResetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);

// Password reset flow routes
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/reset-password', validateResetPassword, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;

