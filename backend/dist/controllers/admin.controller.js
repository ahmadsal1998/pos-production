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
var admin_controller_exports = {};
__export(admin_controller_exports, {
  createStore: () => createStore,
  deleteStore: () => deleteStore,
  getSetting: () => getSetting,
  getSettings: () => getSettings,
  getStore: () => getStore,
  getStores: () => getStores,
  getTrialAccountsPurgeReport: () => getTrialAccountsPurgeReport,
  purgeAllTrialAccounts: () => purgeAllTrialAccounts,
  purgeSpecificTrialAccountEndpoint: () => purgeSpecificTrialAccountEndpoint,
  renewSubscription: () => renewSubscription,
  toggleStoreStatus: () => toggleStoreStatus,
  updateSetting: () => updateSetting,
  updateStore: () => updateStore,
  validateCreateStore: () => validateCreateStore,
  validateRenewSubscription: () => validateRenewSubscription,
  validateUpdateSetting: () => validateUpdateSetting,
  validateUpdateStore: () => validateUpdateStore
});
module.exports = __toCommonJS(admin_controller_exports);
var import_express_validator = require("express-validator");
var import_Store = __toESM(require("../models/Store"));
var import_Settings = __toESM(require("../models/Settings"));
var import_error = require("../middleware/error.middleware");
var import_databaseManager = require("../utils/databaseManager");
var import_User = __toESM(require("../models/User"));
var import_trialAccountModels = require("../utils/trialAccountModels");
var import_purgeTrialAccounts = require("../utils/purgeTrialAccounts");
const getStores = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const stores = await import_Store.default.find().sort({ storeNumber: 1 });
    res.status(200).json({
      success: true,
      data: {
        stores
      }
    });
  }
);
const getStore = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { id } = req.params;
    const store = await import_Store.default.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    res.status(200).json({
      success: true,
      data: {
        store
      }
    });
  }
);
const createStore = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const {
      name,
      storeId,
      prefix,
      createDefaultAdmin,
      defaultAdminEmail,
      defaultAdminPassword,
      defaultAdminName,
      subscriptionDuration,
      // e.g., '1month', '2months', '1year', '2years'
      subscriptionEndDate,
      // Manual date selection (ISO string)
      isTrialAccount
      // Whether this is a trial account (uses _test collections)
    } = req.body;
    const existingStoreById = await import_Store.default.findOne({ storeId: storeId.toLowerCase() });
    if (existingStoreById) {
      return res.status(400).json({
        success: false,
        message: "Store ID already exists"
      });
    }
    const existingStoreByPrefix = await import_Store.default.findOne({ prefix: prefix.toLowerCase() });
    if (existingStoreByPrefix) {
      return res.status(400).json({
        success: false,
        message: "Store prefix already exists"
      });
    }
    if (createDefaultAdmin && defaultAdminEmail) {
      const existingEmail = await import_User.default.findOne({
        email: defaultAdminEmail.toLowerCase()
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already in use"
        });
      }
    }
    let endDate;
    const startDate = /* @__PURE__ */ new Date();
    if (subscriptionEndDate) {
      endDate = new Date(subscriptionEndDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription end date format"
        });
      }
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "Subscription end date must be in the future"
        });
      }
    } else if (subscriptionDuration) {
      const durationMap = {
        "1month": 1,
        "2months": 2,
        "1year": 12,
        "2years": 24
      };
      const months = durationMap[subscriptionDuration];
      if (!months) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription duration. Valid options: 1month, 2months, 1year, 2years"
        });
      }
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
    } else {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }
    const databaseId = await (0, import_databaseManager.determineDatabaseForStore)(import_Store.default);
    console.log(`\u{1F4CA} Assigning new store "${name}" to database ${databaseId}`);
    const lastStore = await import_Store.default.findOne().sort({ storeNumber: -1 });
    const nextStoreNumber = lastStore ? lastStore.storeNumber + 1 : 1;
    const store = await import_Store.default.create({
      storeNumber: nextStoreNumber,
      name,
      storeId: storeId.toLowerCase(),
      prefix: prefix.toLowerCase(),
      databaseId,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isActive: true,
      // Store starts as active
      isTrialAccount: Boolean(isTrialAccount)
      // Trial account flag
    });
    console.log(`\u2705 Store created. Collections will be created automatically when first documents are inserted.`);
    let defaultAdmin = null;
    if (createDefaultAdmin && defaultAdminEmail && defaultAdminPassword) {
      try {
        const defaultUsername = defaultAdminEmail.split("@")[0] + "_" + prefix;
        const existingUsername = await import_User.default.findOne({
          username: defaultUsername.toLowerCase(),
          storeId: store.storeId.toLowerCase()
        });
        if (existingUsername) {
          console.warn(`\u26A0\uFE0F Username ${defaultUsername} already exists for store ${store.storeId}`);
          const modifiedUsername = defaultUsername + "_" + Date.now();
          defaultAdmin = await import_User.default.create({
            fullName: defaultAdminName || `Store Admin - ${name}`,
            username: modifiedUsername.toLowerCase(),
            email: defaultAdminEmail.toLowerCase(),
            password: defaultAdminPassword,
            role: "Manager",
            permissions: [
              "dashboard",
              "products",
              "categories",
              "brands",
              "purchases",
              "expenses",
              "salesToday",
              "salesHistory",
              "posRetail",
              "posWholesale",
              "refunds",
              "preferences",
              "users"
            ],
            status: "Active",
            storeId: store.storeId.toLowerCase()
          });
        } else {
          defaultAdmin = await import_User.default.create({
            fullName: defaultAdminName || `Store Admin - ${name}`,
            username: defaultUsername.toLowerCase(),
            email: defaultAdminEmail.toLowerCase(),
            password: defaultAdminPassword,
            role: "Manager",
            permissions: [
              "dashboard",
              "products",
              "categories",
              "brands",
              "purchases",
              "expenses",
              "salesToday",
              "salesHistory",
              "posRetail",
              "posWholesale",
              "refunds",
              "preferences",
              "users"
            ],
            status: "Active",
            storeId: store.storeId.toLowerCase()
            // Associate user with store's storeId (canonical identifier)
          });
        }
      } catch (error) {
        console.error("Error creating default admin user:", error);
        if (error.code === 11e3 && error.keyPattern?.email) {
          await import_Store.default.findByIdAndDelete(store._id);
          return res.status(400).json({
            success: false,
            message: "Email already in use"
          });
        }
        throw error;
      }
    }
    res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: {
        store,
        defaultAdmin: defaultAdmin ? {
          id: defaultAdmin._id.toString(),
          username: defaultAdmin.username,
          email: defaultAdmin.email,
          fullName: defaultAdmin.fullName
        } : null
      }
    });
  }
);
const updateStore = (0, import_error.asyncHandler)(
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
    const {
      name,
      email,
      phone,
      address,
      city,
      country
    } = req.body;
    const store = await import_Store.default.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    if (name) store.name = name;
    if (email !== void 0) store.email = email || void 0;
    if (phone !== void 0) store.phone = phone || void 0;
    if (address !== void 0) store.address = address || void 0;
    if (city !== void 0) store.city = city || void 0;
    if (country !== void 0) store.country = country || void 0;
    await store.save();
    (0, import_trialAccountModels.clearTrialStatusCache)(store.storeId);
    res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: {
        store
      }
    });
  }
);
const renewSubscription = (0, import_error.asyncHandler)(
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
    const { subscriptionDuration, subscriptionEndDate } = req.body;
    const store = await import_Store.default.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    let endDate;
    const startDate = /* @__PURE__ */ new Date();
    if (subscriptionEndDate) {
      endDate = new Date(subscriptionEndDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription end date format"
        });
      }
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: "Subscription end date must be in the future"
        });
      }
    } else if (subscriptionDuration) {
      const durationMap = {
        "1month": 1,
        "2months": 2,
        "1year": 12,
        "2years": 24
      };
      const months = durationMap[subscriptionDuration];
      if (!months) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription duration. Valid options: 1month, 2months, 1year, 2years"
        });
      }
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
    } else {
      return res.status(400).json({
        success: false,
        message: "Either subscriptionDuration or subscriptionEndDate is required"
      });
    }
    store.subscriptionStartDate = startDate;
    store.subscriptionEndDate = endDate;
    store.isActive = true;
    await store.save();
    res.status(200).json({
      success: true,
      message: "Subscription renewed successfully",
      data: {
        store
      }
    });
  }
);
const toggleStoreStatus = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value"
      });
    }
    const store = await import_Store.default.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    store.isActive = isActive;
    await store.save();
    res.status(200).json({
      success: true,
      message: `Store ${isActive ? "activated" : "deactivated"} successfully`,
      data: {
        store
      }
    });
  }
);
const deleteStore = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { id } = req.params;
    const store = await import_Store.default.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found"
      });
    }
    await import_Store.default.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Store deleted successfully"
    });
  }
);
const validateCreateStore = [
  (0, import_express_validator.body)("name").notEmpty().withMessage("Store name is required").trim().isLength({ min: 2, max: 100 }).withMessage("Store name must be between 2 and 100 characters"),
  (0, import_express_validator.body)("storeId").notEmpty().withMessage("Store ID is required").trim().toLowerCase().matches(/^[a-z0-9_]+$/).withMessage("Store ID must contain only lowercase letters, numbers, and underscores"),
  (0, import_express_validator.body)("prefix").notEmpty().withMessage("Store prefix is required").trim().toLowerCase().matches(/^[a-z0-9_]+$/).withMessage("Prefix must contain only lowercase letters, numbers, and underscores"),
  (0, import_express_validator.body)("createDefaultAdmin").optional().isBoolean().withMessage("createDefaultAdmin must be a boolean"),
  (0, import_express_validator.body)("defaultAdminEmail").optional().isEmail().withMessage("Default admin email must be a valid email").normalizeEmail(),
  (0, import_express_validator.body)("defaultAdminPassword").optional().isLength({ min: 6 }).withMessage("Default admin password must be at least 6 characters"),
  (0, import_express_validator.body)("defaultAdminName").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Default admin name must be between 2 and 100 characters"),
  (0, import_express_validator.body)("subscriptionDuration").optional().isIn(["1month", "2months", "1year", "2years"]).withMessage("Subscription duration must be one of: 1month, 2months, 1year, 2years"),
  (0, import_express_validator.body)("subscriptionEndDate").optional().isISO8601().withMessage("Subscription end date must be a valid ISO 8601 date")
];
const validateUpdateStore = [
  (0, import_express_validator.body)("name").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Store name must be between 2 and 100 characters"),
  (0, import_express_validator.body)("email").optional().isEmail().withMessage("Email must be a valid email address").normalizeEmail(),
  (0, import_express_validator.body)("phone").optional().trim(),
  (0, import_express_validator.body)("address").optional().trim(),
  (0, import_express_validator.body)("city").optional().trim(),
  (0, import_express_validator.body)("country").optional().trim()
];
const validateRenewSubscription = [
  (0, import_express_validator.body)("subscriptionDuration").optional().isIn(["1month", "2months", "1year", "2years"]).withMessage("Subscription duration must be one of: 1month, 2months, 1year, 2years"),
  (0, import_express_validator.body)("subscriptionEndDate").optional().isISO8601().withMessage("Subscription end date must be a valid ISO 8601 date")
];
const getSettings = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const settings = await import_Settings.default.find().sort({ key: 1 });
    const settingsObject = {};
    settings.forEach((setting) => {
      settingsObject[setting.key] = setting.value;
    });
    res.status(200).json({
      success: true,
      data: {
        settings: settingsObject,
        settingsList: settings
      }
    });
  }
);
const getSetting = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { key } = req.params;
    const setting = await import_Settings.default.findOne({ key: key.toLowerCase() });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found"
      });
    }
    res.status(200).json({
      success: true,
      data: {
        setting
      }
    });
  }
);
const updateSetting = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const errors = (0, import_express_validator.validationResult)(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { key } = req.params;
    const { value, description } = req.body;
    const setting = await import_Settings.default.findOneAndUpdate(
      { key: key.toLowerCase() },
      {
        value: value.trim(),
        description: description?.trim() || void 0
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    res.status(200).json({
      success: true,
      message: "Setting updated successfully",
      data: {
        setting
      }
    });
  }
);
const validateUpdateSetting = [
  (0, import_express_validator.body)("value").notEmpty().withMessage("Setting value is required").trim().isLength({ min: 1, max: 500 }).withMessage("Setting value must be between 1 and 500 characters"),
  (0, import_express_validator.body)("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be at most 500 characters")
];
const getTrialAccountsPurgeReport = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    try {
      const report = await (0, import_purgeTrialAccounts.generatePurgeReport)();
      res.status(200).json({
        success: true,
        data: {
          report,
          message: "This is a dry-run report. No data has been deleted."
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate purge report"
      });
    }
  }
);
const purgeAllTrialAccounts = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { confirm } = req.body;
    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: "Confirmation required. Set confirm: true to proceed with deletion."
      });
    }
    try {
      const result = await (0, import_purgeTrialAccounts.purgeTrialAccounts)(false, true);
      res.status(200).json({
        success: result.success,
        data: {
          report: result.report,
          deleted: result.deleted,
          errors: result.errors
        },
        message: result.success ? "Trial accounts purged successfully" : "Purge completed with some errors"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to purge trial accounts"
      });
    }
  }
);
const purgeSpecificTrialAccountEndpoint = (0, import_error.asyncHandler)(
  async (req, res, next) => {
    const { storeId } = req.params;
    const { confirm } = req.body;
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required"
      });
    }
    if (!confirm) {
      try {
        const result = await (0, import_purgeTrialAccounts.purgeSpecificTrialAccount)(storeId, true, false);
        res.status(200).json({
          success: true,
          data: {
            store: result.store,
            deleted: result.deleted,
            message: "This is a dry-run report. Set confirm: true to proceed with deletion."
          }
        });
      } catch (error) {
        res.status(404).json({
          success: false,
          message: error.message || "Trial account not found"
        });
      }
    } else {
      try {
        const result = await (0, import_purgeTrialAccounts.purgeSpecificTrialAccount)(storeId, false, true);
        res.status(200).json({
          success: result.success,
          data: {
            store: result.store,
            deleted: result.deleted,
            errors: result.errors
          },
          message: result.success ? "Trial account purged successfully" : "Purge completed with some errors"
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message || "Failed to purge trial account"
        });
      }
    }
  }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStore,
  deleteStore,
  getSetting,
  getSettings,
  getStore,
  getStores,
  getTrialAccountsPurgeReport,
  purgeAllTrialAccounts,
  purgeSpecificTrialAccountEndpoint,
  renewSubscription,
  toggleStoreStatus,
  updateSetting,
  updateStore,
  validateCreateStore,
  validateRenewSubscription,
  validateUpdateSetting,
  validateUpdateStore
});
