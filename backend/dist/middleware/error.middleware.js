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
var error_middleware_exports = {};
__export(error_middleware_exports, {
  asyncHandler: () => asyncHandler,
  errorHandler: () => errorHandler
});
module.exports = __toCommonJS(error_middleware_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_logger = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  if (err instanceof import_mongoose.default.Error.ValidationError) {
    const errorMessages = Object.values(err.errors).map((e) => e.message);
    message = errorMessages.join(", ");
    statusCode = 400;
  }
  if (err.code === 11e3) {
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    statusCode = 400;
  }
  if (err instanceof import_mongoose.default.Error.CastError) {
    message = "Invalid ID format";
    statusCode = 400;
  }
  import_logger.log.error("API Error", err, { statusCode, message });
  res.status(statusCode).json({
    success: false,
    message,
    ...process.env.NODE_ENV === "development" && { stack: err.stack }
  });
};
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asyncHandler,
  errorHandler
});
