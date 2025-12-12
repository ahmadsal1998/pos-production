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
var subscriptionManager_exports = {};
__export(subscriptionManager_exports, {
  checkAllExpiredSubscriptions: () => checkAllExpiredSubscriptions,
  checkAndUpdateStoreSubscription: () => checkAndUpdateStoreSubscription,
  reactivateStore: () => reactivateStore
});
module.exports = __toCommonJS(subscriptionManager_exports);
var import_Store = __toESM(require("../models/Store"));
async function checkAndUpdateStoreSubscription(storeId) {
  const store = await import_Store.default.findOne({ storeId: storeId.toLowerCase() });
  if (!store) {
    throw new Error("Store not found");
  }
  const now = /* @__PURE__ */ new Date();
  const isExpired = store.subscriptionEndDate < now;
  const wasActive = store.isActive;
  if (isExpired && wasActive) {
    store.isActive = false;
    await store.save();
    console.log(`\u26A0\uFE0F Store ${storeId} subscription expired and has been deactivated`);
  }
  return {
    isActive: store.isActive,
    subscriptionEndDate: store.subscriptionEndDate,
    subscriptionExpired: isExpired
  };
}
async function checkAllExpiredSubscriptions() {
  const now = /* @__PURE__ */ new Date();
  const expiredStores = await import_Store.default.find({
    subscriptionEndDate: { $lt: now },
    isActive: true
  });
  if (expiredStores.length > 0) {
    await import_Store.default.updateMany(
      {
        subscriptionEndDate: { $lt: now },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
    console.log(`\u26A0\uFE0F Deactivated ${expiredStores.length} expired store subscriptions`);
  }
  return expiredStores.length;
}
async function reactivateStore(storeId, newEndDate) {
  const store = await import_Store.default.findOne({ storeId: storeId.toLowerCase() });
  if (!store) {
    throw new Error("Store not found");
  }
  if (newEndDate) {
    store.subscriptionEndDate = newEndDate;
    store.subscriptionStartDate = /* @__PURE__ */ new Date();
  }
  store.isActive = true;
  await store.save();
  console.log(`\u2705 Store ${storeId} has been reactivated`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkAllExpiredSubscriptions,
  checkAndUpdateStoreSubscription,
  reactivateStore
});
