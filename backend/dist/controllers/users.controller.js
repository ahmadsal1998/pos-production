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
var import_User = __toESM(require("../models/User"));
var import_logger = require("../utils/logger");
const getUsers = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let allUsers = [];
    if (requesterRole === "Admin") {
      const users = await import_User.default.find({}).sort({ createdAt: -1 }).lean();
      allUsers = users;
    } else {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      const users = await import_User.default.find({
        storeId: requesterStoreId.toLowerCase()
      }).sort({ createdAt: -1 }).lean();
      allUsers = users;
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
    const query = { _id: id };
    if (requesterRole !== "Admin") {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }
    const user = await import_User.default.findOne(query).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
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
    const { fullName, username, email, password, role, permissions, status, storeId: requestStoreId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    let finalStoreId = null;
    if (requesterRole === "Admin") {
      if (requestStoreId) {
        finalStoreId = requestStoreId.toLowerCase();
        const store = await import_Store.default.findOne({
          $or: [
            { storeId: finalStoreId },
            { prefix: finalStoreId }
          ]
        });
        if (!store) {
          return res.status(400).json({
            success: false,
            message: `Store with ID "${requestStoreId}" does not exist.`
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
      if (requestStoreId && requestStoreId.toLowerCase() !== requesterStoreId.toLowerCase()) {
        import_logger.log.warn(`Security: Manager ${req.user?.userId} attempted to create user for different store. Using requester's storeId instead.`);
      }
    }
    const existingUsername = await import_User.default.findOne({
      storeId: finalStoreId,
      username: username.toLowerCase()
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already exists"
      });
    }
    const existingEmail = await import_User.default.findOne({
      email: email.toLowerCase()
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    const user = await import_User.default.create({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || "Cashier",
      permissions: permissions || [],
      status: status || "Active",
      storeId: finalStoreId
    });
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
    const { fullName, username, email, password, role, permissions, status, storeId: requestStoreId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    const query = { _id: id };
    if (requesterRole !== "Admin") {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }
    const user = await import_User.default.findOne(query);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const currentStoreId = user.storeId;
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
      if (requestStoreId !== void 0) {
        if (requestStoreId !== null && requestStoreId.toLowerCase() !== user.storeId?.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You cannot change a user's store assignment."
          });
        }
      }
    }
    let targetStoreId = currentStoreId;
    if (requestStoreId !== void 0 && requesterRole === "Admin") {
      if (requestStoreId === null) {
        targetStoreId = null;
      } else {
        const normalizedStoreId = requestStoreId.toLowerCase();
        const store = await import_Store.default.findOne({
          $or: [
            { storeId: normalizedStoreId },
            { prefix: normalizedStoreId }
          ]
        });
        if (!store) {
          return res.status(400).json({
            success: false,
            message: `Store with ID "${requestStoreId}" does not exist.`
          });
        }
        targetStoreId = store.storeId;
      }
    }
    const isStoreChange = targetStoreId !== currentStoreId && requesterRole === "Admin";
    if (isStoreChange) {
      if (username && username.toLowerCase() !== user.username) {
        const existingUsername = await import_User.default.findOne({
          storeId: targetStoreId,
          username: username.toLowerCase()
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: "Username already exists in target store"
          });
        }
      } else if (username) {
        const existingUsername = await import_User.default.findOne({
          storeId: targetStoreId,
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
        const existingEmail = await import_User.default.findOne({
          email: email.toLowerCase()
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists"
          });
        }
      }
      user.storeId = targetStoreId;
    }
    if (username && username.toLowerCase() !== user.username) {
      const existingUsername = await import_User.default.findOne({
        storeId: user.storeId,
        username: username.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists"
        });
      }
      user.username = username.toLowerCase();
    }
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await import_User.default.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      });
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
    res.status(200).json({
      success: true,
      message: isStoreChange ? "User updated and moved to new store successfully" : "User updated successfully",
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
    const query = { _id: id };
    if (requesterRole !== "Admin") {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Store ID is required for non-admin users."
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }
    const user = await import_User.default.findOne(query);
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
    await import_User.default.deleteOne({ _id: id });
    res.status(200).json({
      success: true,
      message: "User deleted successfully. All store data (products, customers, sales, inventory) remains intact."
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
