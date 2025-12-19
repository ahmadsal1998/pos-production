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
var otp_exports = {};
__export(otp_exports, {
  generateOTP: () => generateOTP,
  getOTPExpiration: () => getOTPExpiration
});
module.exports = __toCommonJS(otp_exports);
const generateOTP = () => {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
};
const getOTPExpiration = () => {
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  return expiresAt;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateOTP,
  getOTPExpiration
});
