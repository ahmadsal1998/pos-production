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
var users_controller_exports = {};
__export(users_controller_exports, {
  createUser: () => createUser,
  deleteUser: () => deleteUser,
  getUserById: () => getUserById,
  getUsers: () => getUsers,
  updateUser: () => updateUser,
  validateCreateUser: () => validateCreateUser,
  validateUpdateUser: () => validateUpdateUser
});
module.exports = __toCommonJS(users_controller_exports);
var import_express_validator = require("express-validator");
var import_Store = __toESM(require("../models/Store"));
var import_error = require("../middleware/error.middleware");
var import_userModel = require("../utils/userModel");
const getUsers = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let allUsers = [];
    if (requesterRole === "Admin") {
      const stores = await import_Store.default.find({}).lean();
      try {
        const systemUserModel = await (0, import_userModel.getUserModel)(null);
        const systemUsers = await systemUserModel.find({}).sort({ createdAt: -1 });
        allUsers.push(...systemUsers);
      } catch (error) {
      }
      for (const store of stores) {
        try {
          const userModel = await (0, import_userModel.getUserModel)(store.storeId);
          const storeUsers = await userModel.find({}).sort({ createdAt: -1 });
          allUsers.push(...storeUsers);
        } catch (error) {
          console.warn(`\u26A0\uFE0F Could not fetch users from store ${store.storeId}: ${error.message}`);
          continue;
        }
      }
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      const userModel = await (0, import_userModel.getUserModel)(requesterStoreId);
      allUsers = await userModel.find({}).sort({ createdAt: -1 });
    }
    res.status(200).json({
      success: true,
      data: {
        users: allUsers.map((user) => ({
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId,
          // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }))
      }
    });
  }
);
const getUserById = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { id } = req.params;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let user = null;
    if (requesterRole === "Admin") {
      user = await (0, import_userModel.findUserByIdAcrossStores)(id);
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      user = await (0, import_userModel.findUserByIdAcrossStores)(id, requesterStoreId);
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (requesterRole !== "Admin") {
      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only access users from your own store."
        });
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
          storeId: user.storeId,
          // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  }
);
const createUser = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { fullName, username, email, password, role, permissions, status, storeId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let finalStoreId = null;
    if (requesterRole === "Admin") {
      if (storeId) {
        finalStoreId = storeId.toLowerCase();
        const store = await import_Store.default.findOne({
          $or: [
            { storeId: finalStoreId },
            { prefix: finalStoreId }
          ]
        });
        if (!store) {
          return res.status(400).json({
            success: false,
            message: `Store with ID "${storeId}" does not exist.`
          });
        }
        finalStoreId = store.storeId;
      } else {
        finalStoreId = null;
      }
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users. Please ensure your account is associated with a store."
        });
      }
      finalStoreId = requesterStoreId.toLowerCase();
      if (storeId && storeId.toLowerCase() !== requesterStoreId.toLowerCase()) {
        console.warn(`\u26A0\uFE0F Security: Manager ${req.user?.userId} attempted to create user for different store. Using requester's storeId instead.`);
      }
    }
    const userModel = await (0, import_userModel.getUserModel)(finalStoreId);
    const existingUsername = await userModel.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already exists"
      });
    }
    const existingEmail = await userModel.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    const user = await userModel.create({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || "Cashier",
      permissions: permissions || [],
      status: status || "Active",
      storeId: finalStoreId
    });
    if (user.email) {
      const { cacheEmailToStore } = await import("../utils/storeUserCache");
      cacheEmailToStore(user.email, user.storeId);
    }
    if (user.username) {
      const { cacheUsernameToStore } = await import("../utils/storeUserCache");
      cacheUsernameToStore(user.username, user.storeId);
    }
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId,
          // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  }
);
const updateUser = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { id } = req.params;
    const { fullName, username, email, password, role, permissions, status, storeId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let user = null;
    let currentStoreId = null;
    if (requesterRole === "Admin") {
      user = await (0, import_userModel.findUserByIdAcrossStores)(id);
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      user = await (0, import_userModel.findUserByIdAcrossStores)(id, requesterStoreId);
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    currentStoreId = user.storeId;
    if (requesterRole !== "Admin") {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update users from your own store."
        });
      }
      if (storeId !== void 0) {
        if (storeId !== null && storeId.toLowerCase() !== user.storeId?.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You cannot change a user's store assignment."
          });
        }
      }
    }
    let targetStoreId = currentStoreId;
    if (storeId !== void 0 && requesterRole === "Admin") {
      if (storeId === null) {
        targetStoreId = null;
      } else {
        const normalizedStoreId = storeId.toLowerCase();
        const store = await import_Store.default.findOne({
          $or: [
            { storeId: normalizedStoreId },
            { prefix: normalizedStoreId }
          ]
        });
        if (!store) {
          return res.status(400).json({
            success: false,
            message: `Store with ID "${storeId}" does not exist.`
          });
        }
        targetStoreId = store.storeId;
      }
    }
    const currentUserModel = await (0, import_userModel.getUserModel)(currentStoreId);
    if (targetStoreId !== currentStoreId && requesterRole === "Admin") {
      const targetUserModel = await (0, import_userModel.getUserModel)(targetStoreId);
      if (username && username.toLowerCase() !== user.username) {
        const existingUsername = await targetUserModel.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: "Username already exists in target store"
          });
        }
      } else if (username) {
        const existingUsername = await targetUserModel.findOne({
          username: user.username,
          _id: { $ne: user._id }
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: "Username already exists in target store"
          });
        }
      }
      if (email && email.toLowerCase() !== user.email) {
        const existingEmail = await targetUserModel.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists in target store"
          });
        }
      } else if (email) {
        const existingEmail = await targetUserModel.findOne({
          email: user.email,
          _id: { $ne: user._id }
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists in target store"
          });
        }
      }
      const userData = {
        fullName: fullName || user.fullName,
        username: (username || user.username).toLowerCase(),
        email: (email || user.email).toLowerCase(),
        role: role || user.role,
        permissions: permissions !== void 0 ? permissions : user.permissions,
        status: status || user.status,
        storeId: targetStoreId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (password) {
        userData.password = password;
      } else {
        const originalUserWithPassword = await currentUserModel.findById(id).select("+password");
        if (originalUserWithPassword) {
          userData.password = originalUserWithPassword.password;
        }
      }
      const newUser = await targetUserModel.create(userData);
      await currentUserModel.findByIdAndDelete(id);
      (0, import_userModel.invalidateUserCaches)(user.email, user.username);
      if (newUser.email) {
        const { cacheEmailToStore } = await import("../utils/storeUserCache");
        cacheEmailToStore(newUser.email, newUser.storeId);
      }
      if (newUser.username) {
        const { cacheUsernameToStore } = await import("../utils/storeUserCache");
        cacheUsernameToStore(newUser.username, newUser.storeId);
      }
      return res.status(200).json({
        success: true,
        message: "User updated and moved to new store successfully",
        data: {
          user: {
            id: newUser._id.toString(),
            fullName: newUser.fullName,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            permissions: newUser.permissions,
            status: newUser.status,
            storeId: newUser.storeId,
            lastLogin: newUser.lastLogin,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
          }
        }
      });
    }
    if (username && username.toLowerCase() !== user.username) {
      const existingUsername = await currentUserModel.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists"
        });
      }
      user.username = username.toLowerCase();
    }
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await currentUserModel.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
      user.email = email.toLowerCase();
    }
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (permissions !== void 0) user.permissions = permissions;
    if (status) user.status = status;
    if (password) {
      user.password = password;
    }
    await user.save();
    const oldEmail = user.email;
    const oldUsername = user.username;
    (0, import_userModel.invalidateUserCaches)(oldEmail, oldUsername);
    if (user.email) {
      const { cacheEmailToStore } = await import("../utils/storeUserCache");
      cacheEmailToStore(user.email, user.storeId);
    }
    if (user.username) {
      const { cacheUsernameToStore } = await import("../utils/storeUserCache");
      cacheUsernameToStore(user.username, user.storeId);
    }
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId,
          // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  }
);
const deleteUser = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { id } = req.params;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    const requesterUserId = req.user?.userId;
    if (requesterUserId === id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }
    let user = null;
    if (requesterRole === "Admin") {
      user = await (0, import_userModel.findUserByIdAcrossStores)(id);
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      user = await (0, import_userModel.findUserByIdAcrossStores)(id, requesterStoreId);
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (user.role === "Admin") {
      if (requesterUserId !== "admin" || requesterRole !== "Admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin accounts can only be deleted from the Super Admin Panel. Regular store management screens cannot delete Admin users."
        });
      }
    }
    if (requesterRole !== "Admin") {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only delete users from your own store."
        });
      }
    }
    const userModel = await (0, import_userModel.getUserModel)(user.storeId);
    await userModel.findByIdAndDelete(id);
    (0, import_userModel.invalidateUserCaches)(user.email, user.username);
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  }
);
const validateCreateUser = [
  (0, import_express_validator.body)("fullName").notEmpty().withMessage("Full name is required").trim(),
  (0, import_express_validator.body)("username").notEmpty().withMessage("Username is required").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  (0, import_express_validator.body)("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Please provide a valid email").normalizeEmail().trim(),
  (0, import_express_validator.body)("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  (0, import_express_validator.body)("role").optional().isIn(["Admin", "Manager", "Cashier"]).withMessage("Role must be Admin, Manager, or Cashier"),
  (0, import_express_validator.body)("permissions").optional().isArray().withMessage("Permissions must be an array"),
  (0, import_express_validator.body)("status").optional().isIn(["Active", "Inactive"]).withMessage("Status must be Active or Inactive")
];
const validateUpdateUser = [
  (0, import_express_validator.body)("fullName").optional().notEmpty().withMessage("Full name cannot be empty").trim(),
  (0, import_express_validator.body)("username").optional().trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  (0, import_express_validator.body)("email").optional().isEmail().withMessage("Please provide a valid email").normalizeEmail().trim(),
  (0, import_express_validator.body)("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  (0, import_express_validator.body)("role").optional().isIn(["Admin", "Manager", "Cashier"]).withMessage("Role must be Admin, Manager, or Cashier"),
  (0, import_express_validator.body)("permissions").optional().isArray().withMessage("Permissions must be an array"),
  (0, import_express_validator.body)("status").optional().isIn(["Active", "Inactive"]).withMessage("Status must be Active or Inactive")
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  validateCreateUser,
  validateUpdateUser
});
