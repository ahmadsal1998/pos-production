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
var merchants_routes_exports = {};
__export(merchants_routes_exports, {
  default: () => merchants_routes_default
});
module.exports = __toCommonJS(merchants_routes_exports);
var import_express = __toESM(require("express"));
var import_merchants = require("../controllers/merchants.controller");
var import_auth = require("../middleware/auth.middleware");
const router = import_express.default.Router();
router.use(import_auth.authenticate);
router.get("/", import_merchants.getMerchants);
router.get("/:id", import_merchants.getMerchant);
router.post("/", import_merchants.createMerchant);
router.put("/:id", import_merchants.updateMerchant);
router.delete("/:id", import_merchants.deleteMerchant);
var merchants_routes_default = router;
