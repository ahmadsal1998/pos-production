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
var jwt_exports = {};
__export(jwt_exports, {
  generateRefreshToken: () => generateRefreshToken,
  generateToken: () => generateToken,
  verifyRefreshToken: () => verifyRefreshToken,
  verifyToken: () => verifyToken
});
module.exports = __toCommonJS(jwt_exports);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret";
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "30d";
const generateToken = (payload) => {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};
const generateRefreshToken = (payload) => {
  return import_jsonwebtoken.default.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE
  });
};
const verifyToken = (token) => {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
const verifyRefreshToken = (token) => {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
  verifyToken
});
