"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var auth_controller_exports = {};
__export(auth_controller_exports, {
  forgotPassword: () => forgotPassword,
  getContactNumber: () => getContactNumber,
  getMe: () => getMe,
  login: () => login,
  logout: () => logout,
  refresh: () => refresh,
  resetPassword: () => resetPassword,
  validateForgotPassword: () => validateForgotPassword,
  validateLogin: () => validateLogin,
  validateResetPassword: () => validateResetPassword,
  validateVerifyOTP: () => validateVerifyOTP,
  verifyOTP: () => verifyOTP
});
module.exports = __toCommonJS(auth_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_auth2 = require("../services/auth.service");
const login = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { emailOrUsername, password } = req.body;
    const result = await import_auth2.authService.login(emailOrUsername, password);
    if (!result.success) {
      const status = result.message.includes("deactivated") ? 403 : 401;
      return res.status(status).json({
        success: false,
        message: result.message
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        subscriptionStatus: result.subscriptionStatus ?? null
      }
    });
  }
);
const refresh = (0, import_error.asyncHandler)(
  async (req, res) => {
    const refreshTokenFromBody = req.body?.refreshToken?.trim();
    if (!refreshTokenFromBody) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }
    const result = await import_auth2.authService.refresh(refreshTokenFromBody);
    if ("token" in result && result.token) {
      return res.status(200).json({
        success: true,
        data: {
          token: result.token,
          refreshToken: result.refreshToken
        }
      });
    }
    return res.status(401).json({
      success: false,
      message: result.message || "Invalid or expired refresh token"
    });
  }
);
const getMe = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token"
      });
    }
    const data = await import_auth2.authService.getMe(userId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        user: data.user,
        subscriptionStatus: data.subscriptionStatus ?? null
      }
    });
  }
);
const logout = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  }
);
const getContactNumber = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const data = await import_auth2.authService.getContactNumber();
    res.status(200).json({
      success: true,
      data: { contactNumber: data.contactNumber }
    });
  }
);
const forgotPassword = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { email } = req.body;
    const result = await import_auth2.authService.forgotPassword(email);
    if (!result.success) {
      return res.status(403).json({
        success: false,
        message: result.message
      });
    }
    res.status(200).json({
      success: true,
      message: result.message
    });
  }
);
const verifyOTP = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { email, code } = req.body;
    const result = await import_auth2.authService.verifyOTP(email, code);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    res.status(200).json({
      success: true,
      message: result.message
    });
  }
);
const resetPassword = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { email, newPassword } = req.body;
    const result = await import_auth2.authService.resetPassword(email, newPassword);
    if (!result.success) {
      const status = result.message.includes("not found") ? 404 : 400;
      return res.status(status).json({
        success: false,
        message: result.message
      });
    }
    res.status(200).json({
      success: true,
      message: result.message
    });
  }
);
const validateLogin = [
  (0, import_express_validator.body)("emailOrUsername").notEmpty().withMessage("Email or username is required").trim(),
  (0, import_express_validator.body)("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
];
const validateForgotPassword = [
  (0, import_express_validator.body)("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email").normalizeEmail().trim()
];
const validateVerifyOTP = [
  (0, import_express_validator.body)("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email").normalizeEmail().trim(),
  (0, import_express_validator.body)("code").notEmpty().withMessage("OTP code is required").isLength({ min: 6, max: 6 }).withMessage("OTP code must be 6 digits").matches(/^\d+$/).withMessage("OTP code must contain only numbers")
];
const validateResetPassword = [
  (0, import_express_validator.body)("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email").normalizeEmail().trim(),
  (0, import_express_validator.body)("newPassword").notEmpty().withMessage("New password is required").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  forgotPassword,
  getContactNumber,
  getMe,
  login,
  logout,
  refresh,
  resetPassword,
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateVerifyOTP,
  verifyOTP
});
