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
var User_exports = {};
__export(User_exports, {
  default: () => User_default
});
module.exports = __toCommonJS(User_exports);
var import_mongoose = __toESM(require("mongoose"));
var import_bcryptjs = __toESM(require("bcryptjs"));
const userSchema = new import_mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
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
      // Index is created via compound indexes below
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
userSchema.pre("save", async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  const user = this;
  return import_bcryptjs.default.compare(candidatePassword, user.password);
};
userSchema.index({ role: 1 });
userSchema.index({ storeId: 1, username: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
userSchema.index({ email: 1 }, { unique: true });
const User = import_mongoose.default.model("User", userSchema);
var User_default = User;
