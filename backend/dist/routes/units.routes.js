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
var units_routes_exports = {};
__export(units_routes_exports, {
  default: () => units_routes_default
});
module.exports = __toCommonJS(units_routes_exports);
var import_express = require("express");
var import_multer = __toESM(require("multer"));
var import_units = require("../controllers/units.controller");
var import_auth = require("../middleware/auth.middleware");
var import_storeIsolation = require("../middleware/storeIsolation.middleware");
const router = (0, import_express.Router)();
const upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
router.use(import_auth.authenticate);
router.use(import_storeIsolation.requireStoreAccess);
router.get("/", import_units.getUnits);
router.get("/:id", import_units.getUnitById);
router.post("/", import_units.validateCreateUnit, import_units.createUnit);
router.put("/:id", import_units.validateUpdateUnit, import_units.updateUnit);
router.delete("/:id", import_units.deleteUnit);
router.get("/export", import_units.exportUnits);
router.post("/import", upload.single("file"), import_units.importUnits);
var units_routes_default = router;
