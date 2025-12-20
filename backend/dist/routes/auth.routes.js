"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', auth_controller_1.validateLogin, auth_controller_1.login);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout);
router.get('/contact-number', auth_controller_1.getContactNumber); // Public endpoint for expired subscription page
// Password reset flow routes
router.post('/forgot-password', auth_controller_1.validateForgotPassword, auth_controller_1.forgotPassword);
router.post('/verify-otp', auth_controller_1.validateVerifyOTP, auth_controller_1.verifyOTP);
router.post('/reset-password', auth_controller_1.validateResetPassword, auth_controller_1.resetPassword);
// Protected routes
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
exports.default = router;
