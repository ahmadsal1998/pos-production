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
var settings_controller_exports = {};
__export(settings_controller_exports, {
  getStoreSetting: () => getStoreSetting,
  getStoreSettings: () => getStoreSettings,
  updateStoreSetting: () => updateStoreSetting,
  validateUpdateStoreSetting: () => validateUpdateStoreSetting
});
module.exports = __toCommonJS(settings_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_Settings = require("../models/Settings");
var import_Store = __toESM(require("../models/Store"));
async function loadStoreContext(req, res) {
  const storeId = req.user?.storeId;
  if (!storeId) {
    res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
    return null;
  }
  const store = await import_Store.default.findOne({ storeId: storeId.toLowerCase() }).lean();
  if (!store) {
    res.status(404).json({
      success: false,
      message: "Store not found for the current user."
    });
    return null;
  }
  return store;
}
const getStoreSetting = (0, import_error.asyncHandler)(
  async (req, res) => {
    const { key } = req.params;
    const store = await loadStoreContext(req, res);
    if (!store) return;
    const settingsModel = await (0, import_Settings.getStoreSettingsModel)(store.prefix, store.databaseId);
    const setting = await settingsModel.findOne({ key: key.toLowerCase() });
    res.status(200).json({
      success: true,
      data: {
        setting
      }
    });
  }
);
const updateStoreSetting = (0, import_error.asyncHandler)(
  async (req, res) => {
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
    const store = await loadStoreContext(req, res);
    if (!store) return;
    const valueString = value !== void 0 && value !== null ? String(value).trim() : "";
    const descriptionString = description !== void 0 && description !== null ? String(description).trim() : void 0;
    const settingsModel = await (0, import_Settings.getStoreSettingsModel)(store.prefix, store.databaseId);
    const setting = await settingsModel.findOneAndUpdate(
      { key: key.toLowerCase() },
      {
        value: valueString,
        description: descriptionString || void 0
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
const getStoreSettings = (0, import_error.asyncHandler)(
  async (req, res) => {
    const store = await loadStoreContext(req, res);
    if (!store) return;
    const settingsModel = await (0, import_Settings.getStoreSettingsModel)(store.prefix, store.databaseId);
    const settings = await settingsModel.find().sort({ key: 1 });
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
const validateUpdateStoreSetting = [
  (0, import_express_validator.body)("value").optional({ nullable: true, checkFalsy: false }).customSanitizer((v) => v === void 0 || v === null ? "" : String(v).trim()).isLength({ min: 0, max: 500 }).withMessage("Setting value must be at most 500 characters"),
  (0, import_express_validator.body)("description").optional().customSanitizer((v) => v === void 0 || v === null ? void 0 : String(v).trim()).isLength({ max: 500 }).withMessage("Description must be at most 500 characters")
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getStoreSetting,
  getStoreSettings,
  updateStoreSetting,
  validateUpdateStoreSetting
});
