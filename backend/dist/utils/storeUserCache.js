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
var storeUserCache_exports = {};
__export(storeUserCache_exports, {
  cacheEmailToStore: () => cacheEmailToStore,
  cacheUsernameToStore: () => cacheUsernameToStore,
  clearCache: () => clearCache,
  getCacheStats: () => getCacheStats,
  getStoreIdForEmail: () => getStoreIdForEmail,
  getStoreIdForUsername: () => getStoreIdForUsername,
  invalidateUserCache: () => invalidateUserCache
});
module.exports = __toCommonJS(storeUserCache_exports);
const CACHE_TTL = 60 * 60 * 1e3;
const emailToStoreCache = /* @__PURE__ */ new Map();
const usernameToStoreCache = /* @__PURE__ */ new Map();
function getStoreIdForEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = emailToStoreCache.get(normalizedEmail);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    emailToStoreCache.delete(normalizedEmail);
    return null;
  }
  return entry.storeId;
}
function getStoreIdForUsername(username) {
  const normalizedUsername = username.toLowerCase().trim();
  const entry = usernameToStoreCache.get(normalizedUsername);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    usernameToStoreCache.delete(normalizedUsername);
    return null;
  }
  return entry.storeId;
}
function cacheEmailToStore(email, storeId) {
  if (!storeId) {
    return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  emailToStoreCache.set(normalizedEmail, {
    storeId: storeId.toLowerCase(),
    timestamp: Date.now()
  });
}
function cacheUsernameToStore(username, storeId) {
  if (!storeId) {
    return;
  }
  const normalizedUsername = username.toLowerCase().trim();
  usernameToStoreCache.set(normalizedUsername, {
    storeId: storeId.toLowerCase(),
    timestamp: Date.now()
  });
}
function invalidateUserCache(email, username) {
  if (email) {
    emailToStoreCache.delete(email.toLowerCase().trim());
  }
  if (username) {
    usernameToStoreCache.delete(username.toLowerCase().trim());
  }
}
function clearCache() {
  emailToStoreCache.clear();
  usernameToStoreCache.clear();
}
function getCacheStats() {
  return {
    emailCacheSize: emailToStoreCache.size,
    usernameCacheSize: usernameToStoreCache.size
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cacheEmailToStore,
  cacheUsernameToStore,
  clearCache,
  getCacheStats,
  getStoreIdForEmail,
  getStoreIdForUsername,
  invalidateUserCache
});
