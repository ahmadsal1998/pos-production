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
var seedSettings_exports = {};
__export(seedSettings_exports, {
  default: () => seedSettings_default
});
module.exports = __toCommonJS(seedSettings_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_dotenv = __toESM(require("dotenv"));
var import_Settings = __toESM(require("../models/Settings"));
var import_database = require("../config/database");
import_dotenv.default.config();
const seedSettings = async () => {
  try {
    console.log("\u{1F504} Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    const uriWithAdminDb = (0, import_database.ensureAdminDatabase)(mongoUri);
    await import_mongoose.default.connect(uriWithAdminDb);
    console.log("\u2705 Connected to MongoDB");
    const defaultSettings = [
      {
        key: "subscription_contact_number",
        value: "0593202029",
        description: "\u0631\u0642\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0645\u0639\u0631\u0648\u0636 \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643"
      },
      {
        key: "currency",
        value: "ILS|\u20AA|Israeli Shekel",
        description: "Default currency for the system (format: CODE|SYMBOL|NAME)"
      }
    ];
    for (const setting of defaultSettings) {
      const existingSetting = await import_Settings.default.findOne({ key: setting.key });
      if (existingSetting) {
        console.log(`\u2139\uFE0F  Setting "${setting.key}" already exists. Skipping...`);
      } else {
        console.log(`\u{1F331} Seeding setting "${setting.key}"...`);
        await import_Settings.default.create(setting);
        console.log(`\u2705 Setting "${setting.key}" created successfully!`);
      }
    }
    console.log("\u{1F4DE} Default contact number: 0593202029");
    console.log("\u{1F4B0} Default currency: ILS (\u20AA)");
    await import_mongoose.default.disconnect();
    console.log("\u2705 Settings seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("\u274C Error seeding settings:", error.message);
    await import_mongoose.default.disconnect();
    process.exit(1);
  }
};
if (require.main === module) {
  seedSettings();
}
var seedSettings_default = seedSettings;
