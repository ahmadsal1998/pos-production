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
var import_database = require("../config/database");
import_dotenv.default.config();
const seedDatabase = async () => {
  try {
    console.log("\u{1F504} Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const uriWithAdminDb = (0, import_database.ensureAdminDatabase)(mongoUri);
    await import_mongoose.default.connect(uriWithAdminDb);
    console.log("\u2705 Connected to MongoDB");
    const existingAdmin = await import_User.default.findOne({
      $or: [{ email: "admin@pos.com" }, { username: "admin" }]
    });
    if (existingAdmin) {
      console.log("\u2139\uFE0F  Admin user already exists. Skipping seed...");
      await import_mongoose.default.disconnect();
      return;
    }
    console.log("\u{1F331} Seeding admin user...");
    const adminUser = await import_User.default.create({
      fullName: "Admin User",
      username: "admin",
      email: "admin@pos.com",
      password: "password123",
      role: "Admin",
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
      status: "Active"
    });
    console.log("\u2705 Admin user created successfully!");
    console.log("\u{1F4E7} Email: admin@pos.com");
    console.log("\u{1F511} Password: password123");
    console.log("\u{1F464} Username: admin");
    await import_mongoose.default.disconnect();
    console.log("\u2705 Database seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("\u274C Error seeding database:", error.message);
    await import_mongoose.default.disconnect();
    process.exit(1);
  }
};
seedDatabase();
