"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var auth_controller_exports = {};
__export(auth_controller_exports, {
  forgotPassword: () => forgotPassword,
  getContactNumber: () => getContactNumber,
  getMe: () => getMe,
  login: () => login,
  logout: () => logout,
  resetPassword: () => resetPassword,
  validateForgotPassword: () => validateForgotPassword,
  validateLogin: () => validateLogin,
  validateResetPassword: () => validateResetPassword,
  validateVerifyOTP: () => validateVerifyOTP,
  verifyOTP: () => verifyOTP
});
module.exports = __toCommonJS(auth_controller_exports);
var import_express_validator = require("express-validator");
var import_OTP = __toESM(require("../models/OTP"));
var import_Settings = __toESM(require("../models/Settings"));
var import_jwt = require("../utils/jwt");
var import_error = require("../middleware/error.middleware");
var import_otp = require("../utils/otp");
var import_email = require("../utils/email");
var import_userModel = require("../utils/userModel");
var import_storeUserCache = require("../utils/storeUserCache");
var import_subscriptionManager = require("../utils/subscriptionManager");
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
    const { emailOrUsername, password, storeId } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminUsername && adminPassword) {
      if (emailOrUsername.toLowerCase() === adminUsername.toLowerCase() && password === adminPassword) {
        const tokenPayload2 = {
          userId: "admin",
          email: adminUsername,
          role: "Admin",
          storeId: null
          // Admin users don't have a store
        };
        const token2 = (0, import_jwt.generateToken)(tokenPayload2);
        const refreshToken2 = (0, import_jwt.generateRefreshToken)(tokenPayload2);
        return res.status(200).json({
          success: true,
          message: "Admin login successful",
          data: {
            user: {
              id: "admin",
              fullName: "System Admin",
              username: adminUsername,
              email: adminUsername,
              role: "Admin",
              permissions: [],
              isAdmin: true
            },
            token: token2,
            refreshToken: refreshToken2
          }
        });
      }
    }
    const normalizedStoreId = storeId ? storeId.toLowerCase().trim() : void 0;
    const user = await (0, import_userModel.findUserAcrossStores)(
      {
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      },
      normalizedStoreId
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    if (user.status !== "Active") {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin."
      });
    }
    let subscriptionStatus = null;
    if (user.storeId) {
      try {
        subscriptionStatus = await (0, import_subscriptionManager.checkAndUpdateStoreSubscription)(user.storeId);
      } catch (error) {
        console.error(`Error checking subscription for store ${user.storeId}:`, error.message);
      }
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    user.lastLogin = /* @__PURE__ */ new Date();
    await user.save({ validateBeforeSave: false });
    if (user.email) {
      (0, import_storeUserCache.cacheEmailToStore)(user.email, user.storeId);
    }
    if (user.username) {
      (0, import_storeUserCache.cacheUsernameToStore)(user.username, user.storeId);
    }
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      storeId: user.storeId || null
    };
    const token = (0, import_jwt.generateToken)(tokenPayload);
    const refreshToken = (0, import_jwt.generateRefreshToken)(tokenPayload);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          storeId: user.storeId || null
        },
        token,
        refreshToken,
        subscriptionStatus: subscriptionStatus ? {
          isActive: subscriptionStatus.isActive,
          subscriptionExpired: subscriptionStatus.subscriptionExpired,
          subscriptionEndDate: subscriptionStatus.subscriptionEndDate
        } : null
      }
    });
  }
);
const getMe = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const userId = req.user?.userId;
    const storeId = req.user?.storeId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token"
      });
    }
    const user = await (0, import_userModel.findUserByIdAcrossStores)(userId, storeId || void 0);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    let subscriptionStatus = null;
    if (user.storeId) {
      try {
        subscriptionStatus = await (0, import_subscriptionManager.checkAndUpdateStoreSubscription)(user.storeId);
      } catch (error) {
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
          lastLogin: user.lastLogin
        },
        subscriptionStatus: subscriptionStatus ? {
          isActive: subscriptionStatus.isActive,
          subscriptionExpired: subscriptionStatus.subscriptionExpired,
          subscriptionEndDate: subscriptionStatus.subscriptionEndDate
        } : null
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
    const setting = await import_Settings.default.findOne({ key: "subscription_contact_number" });
    const contactNumber = setting?.value || "0593202029";
    res.status(200).json({
      success: true,
      data: {
        contactNumber
      }
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
    const { email, storeId } = req.body;
    const normalizedStoreId = storeId ? storeId.toLowerCase().trim() : void 0;
    const user = await (0, import_userModel.findUserAcrossStores)(
      {
        email: email.toLowerCase()
      },
      normalizedStoreId
    );
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully"
      });
    }
    if (user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin."
      });
    }
    await import_OTP.default.deleteMany({ email: email.toLowerCase() });
    const code = (0, import_otp.generateOTP)();
    const expiresAt = (0, import_otp.getOTPExpiration)();
    await import_OTP.default.create({
      email: email.toLowerCase(),
      code,
      expiresAt
    });
    console.log(`\u{1F4E8} Sending OTP email to: ${email}`);
    const emailResult = await (0, import_email.sendOTPEmail)(email, code);
    if (!emailResult.success) {
      console.error("\u274C Failed to send OTP email:", {
        email,
        error: emailResult.error,
        message: emailResult.message,
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyLength: process.env.RESEND_API_KEY?.length || 0
      });
    } else {
      console.log(`\u2705 OTP email sent successfully to: ${email}`);
    }
    res.status(200).json({
      success: true,
      message: "OTP sent successfully"
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
    const otpRecord = await import_OTP.default.findOne({
      email: email.toLowerCase(),
      code
    });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP code"
      });
    }
    if (otpRecord.expiresAt < /* @__PURE__ */ new Date()) {
      await import_OTP.default.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP code has expired"
      });
    }
    res.status(200).json({
      success: true,
      message: "OTP verified successfully"
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
    const { email, newPassword, storeId } = req.body;
    const normalizedStoreId = storeId ? storeId.toLowerCase().trim() : void 0;
    const user = await (0, import_userModel.findUserAcrossStores)(
      {
        email: email.toLowerCase()
      },
      normalizedStoreId
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const otpRecord = await import_OTP.default.findOne({
      email: email.toLowerCase()
    });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required. Please verify OTP first."
      });
    }
    if (otpRecord.expiresAt < /* @__PURE__ */ new Date()) {
      await import_OTP.default.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }
    user.password = newPassword;
    user.markModified("password");
    await user.save({ validateBeforeSave: false });
    if (user.email) {
      (0, import_storeUserCache.cacheEmailToStore)(user.email, user.storeId);
    }
    if (user.username) {
      (0, import_storeUserCache.cacheUsernameToStore)(user.username, user.storeId);
    }
    await import_OTP.default.deleteMany({ email: email.toLowerCase() });
    res.status(200).json({
      success: true,
      message: "Password reset successfully"
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
  resetPassword,
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateVerifyOTP,
  verifyOTP
});
