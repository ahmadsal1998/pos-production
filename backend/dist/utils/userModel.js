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
var userModel_exports = {};
__export(userModel_exports, {
  clearUserModelCache: () => clearUserModelCache,
  findUserAcrossStores: () => findUserAcrossStores,
  findUserByIdAcrossStores: () => findUserByIdAcrossStores,
  getUserCollectionName: () => getUserCollectionName,
  getUserModel: () => getUserModel,
  invalidateUserCaches: () => invalidateUserCaches
});
module.exports = __toCommonJS(userModel_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_databaseManager = require("./databaseManager");
var import_Store = __toESM(require("../models/Store"));
var import_storeUserCache = require("./storeUserCache");
const createUserSchema = () => {
  return new import_mongoose.Schema(
    {
      fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true
      },
      username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
        lowercase: true
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
      },
      password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
        select: false
        // Don't include password in queries by default
      },
      role: {
        type: String,
        enum: ["Admin", "Manager", "Cashier"],
        default: "Cashier",
        required: true
      },
      permissions: {
        type: [String],
        enum: [
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
        default: []
      },
      status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
      },
      lastLogin: {
        type: Date
      },
      storeId: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
        default: null
        // null means system/admin user, string means store-specific user
      }
    },
    {
      timestamps: true,
      toJSON: {
        transform: function(doc, ret) {
          ret.id = ret._id;
          delete ret._id;
          delete ret.__v;
          delete ret.password;
          return ret;
        }
      }
    }
  );
};
const addPasswordHashing = (schema) => {
  schema.pre("save", async function(next) {
    if (!this.isModified("password")) {
      return next();
    }
    try {
      const salt = await import_bcryptjs.default.genSalt(12);
      const user = this;
      const currentPassword = user.password;
      user.password = await import_bcryptjs.default.hash(currentPassword, salt);
      next();
    } catch (error) {
      next(error);
    }
  });
  schema.methods.comparePassword = async function(candidatePassword) {
    const user = this;
    return import_bcryptjs.default.compare(candidatePassword, user.password);
  };
};
function getUserCollectionName(storeId) {
  if (!storeId) {
    return "system_users";
  }
  return `${storeId.toLowerCase()}_users`;
}
const userModelCache = /* @__PURE__ */ new Map();
async function getUserModel(storeId, connection) {
  const collectionName = getUserCollectionName(storeId);
  if (userModelCache.has(collectionName)) {
    const cachedModel = userModelCache.get(collectionName);
    if (cachedModel.db.readyState === 1) {
      return cachedModel;
    }
    userModelCache.delete(collectionName);
  }
  let dbConnection;
  if (storeId) {
    const databaseId = await (0, import_databaseManager.getDatabaseIdForStore)(storeId, import_Store.default);
    if (!databaseId) {
      throw new Error(`Store "${storeId}" not found or has no database assigned`);
    }
    dbConnection = await (0, import_databaseManager.getDatabaseConnection)(databaseId);
  } else {
    if (connection) {
      dbConnection = connection;
    } else {
      dbConnection = import_mongoose.default.connection;
    }
  }
  if (dbConnection.models[collectionName]) {
    const model2 = dbConnection.models[collectionName];
    userModelCache.set(collectionName, model2);
    return model2;
  }
  const schema = createUserSchema();
  addPasswordHashing(schema);
  schema.index({ role: 1 });
  schema.index({ storeId: 1 });
  schema.index({ email: 1 });
  schema.index({ username: 1 });
  schema.index({ status: 1 });
  schema.index({ storeId: 1, username: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
  schema.index({ storeId: 1, email: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
  const model = dbConnection.model(collectionName, schema, collectionName);
  userModelCache.set(collectionName, model);
  return model;
}
async function findUserAcrossStores(query, storeIdHint) {
  const email = query.email || query.$or && query.$or.find((q) => q.email)?.email;
  const username = query.username || query.$or && query.$or.find((q) => q.username)?.username;
  let cachedStoreId = null;
  if (email) {
    cachedStoreId = (0, import_storeUserCache.getStoreIdForEmail)(email);
  } else if (username) {
    cachedStoreId = (0, import_storeUserCache.getStoreIdForUsername)(username);
  }
  const targetStoreId = storeIdHint || cachedStoreId;
  if (targetStoreId) {
    try {
      const userModel = await getUserModel(targetStoreId);
      const user = await userModel.findOne(query).select("+password");
      if (user) {
        if (user.email) (0, import_storeUserCache.cacheEmailToStore)(user.email, user.storeId ?? null);
        if (user.username) (0, import_storeUserCache.cacheUsernameToStore)(user.username, user.storeId ?? null);
        return user;
      }
    } catch (error) {
      console.warn(`\u26A0\uFE0F Could not search users in store ${targetStoreId}: ${error.message}`);
    }
  }
  try {
    const systemUserModel = await getUserModel(null);
    const systemUser = await systemUserModel.findOne(query).select("+password");
    if (systemUser) {
      return systemUser;
    }
  } catch (error) {
  }
  const stores = await import_Store.default.find({}).lean();
  for (const store of stores) {
    if (targetStoreId && store.storeId.toLowerCase() === targetStoreId.toLowerCase()) {
      continue;
    }
    try {
      const userModel = await getUserModel(store.storeId);
      const user = await userModel.findOne(query).select("+password");
      if (user) {
        if (user.email) (0, import_storeUserCache.cacheEmailToStore)(user.email, user.storeId ?? null);
        if (user.username) (0, import_storeUserCache.cacheUsernameToStore)(user.username, user.storeId ?? null);
        return user;
      }
    } catch (error) {
      console.warn(`\u26A0\uFE0F Could not search users in store ${store.storeId}: ${error.message}`);
      continue;
    }
  }
  return null;
}
async function findUserByIdAcrossStores(userId, storeId) {
  if (storeId !== void 0) {
    try {
      const userModel = await getUserModel(storeId);
      return await userModel.findById(userId);
    } catch (error) {
      console.warn(`\u26A0\uFE0F Could not find user in store ${storeId}: ${error.message}`);
      return null;
    }
  }
  try {
    const systemUserModel = await getUserModel(null);
    const systemUser = await systemUserModel.findById(userId);
    if (systemUser) {
      return systemUser;
    }
  } catch (error) {
  }
  const stores = await import_Store.default.find({}).lean();
  for (const store of stores) {
    try {
      const userModel = await getUserModel(store.storeId);
      const user = await userModel.findById(userId);
      if (user) {
        return user;
      }
    } catch (error) {
      console.warn(`\u26A0\uFE0F Could not search users in store ${store.storeId}: ${error.message}`);
      continue;
    }
  }
  return null;
}
function clearUserModelCache() {
  userModelCache.clear();
}
function invalidateUserCaches(email, username) {
  (0, import_storeUserCache.invalidateUserCache)(email, username);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearUserModelCache,
  findUserAcrossStores,
  findUserByIdAcrossStores,
  getUserCollectionName,
  getUserModel,
  invalidateUserCaches
});
