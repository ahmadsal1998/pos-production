"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var import_mongoose = __toESM(require("mongoose"));
var import_dotenv = __toESM(require("dotenv"));
var import_User = __toESM(require("../models/User"));
var import_database = __toESM(require("../config/database"));
import_dotenv.default.config();
const checkUser = async () => {
  try {
    await (0, import_database.default)();
    const email = "salamea1998@gmail.com";
    console.log("\n\u{1F50D} Checking user details...\n");
    const user = await import_User.default.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      console.log("\u274C User not found with email:", email);
      return;
    }
    console.log("\u2705 User found!");
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    console.log("\u{1F4E7} Email:", user.email);
    console.log("\u{1F464} Username:", user.username);
    console.log("\u{1F468}\u200D\u{1F4BC} Full Name:", user.fullName);
    console.log("\u{1F510} Role:", user.role);
    console.log("\u{1F4CA} Status:", user.status);
    console.log("\u{1F511} Has Password:", user.password ? "Yes (hashed)" : "No");
    console.log("\u{1F4DD} Created At:", user.createdAt);
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n");
    if (user.status !== "Active") {
      console.log('\u26A0\uFE0F  WARNING: User status is not "Active"');
      console.log('   You need to set status to "Active" to allow login.\n');
    }
    if (!user.password) {
      console.log("\u26A0\uFE0F  WARNING: User does not have a password set");
      console.log("   You need to set a password using the reset password flow.\n");
    }
    console.log("\u{1F4A1} Login Tips:");
    console.log("   - Use email: " + user.email);
    console.log("   - Or username: " + user.username);
    console.log("   - Password: (the password that was set when user was created)");
    console.log("   - If you forgot password, use the forgot password flow\n");
  } catch (error) {
    console.error("\u274C Error:", error.message);
  } finally {
    await import_mongoose.default.connection.close();
    process.exit(0);
  }
};
checkUser();
