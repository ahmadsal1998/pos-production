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
var settings_routes_exports = {};
__export(settings_routes_exports, {
  default: () => settings_routes_default
});
module.exports = __toCommonJS(settings_routes_exports);
var import_express = require("express");
var import_settings = require("../controllers/settings.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/", import_settings.getStoreSettings);
router.get("/:key", import_settings.getStoreSetting);
router.put("/:key", import_settings.validateUpdateStoreSetting, import_settings.updateStoreSetting);
var settings_routes_default = router;
