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
var Category_exports = {};
__export(Category_exports, {
  default: () => Category_default
});
module.exports = __toCommonJS(Category_exports);
var import_mongoose = __toESM(require("mongoose"));
const categorySchema = new import_mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true
    },
    storeId: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null
      // null means system category, string means store-specific category
    },
    description: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);
categorySchema.index({ storeId: 1 });
categorySchema.index({ storeId: 1, name: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });
categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { storeId: null } });
const Category = import_mongoose.default.model("Category", categorySchema);
var Category_default = Category;
