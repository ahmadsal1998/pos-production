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
var redis_exports = {};
__export(redis_exports, {
  cache: () => import_redis.cache,
  closeRedis: () => import_redis.closeRedis,
  getRedisClient: () => import_redis.getRedisClient,
  getRedisClientSync: () => import_redis.getRedisClientSync,
  getRedisStatus: () => import_redis.getRedisStatus,
  initRedis: () => import_redis.initRedis,
  isRedisAvailable: () => import_redis.isRedisAvailable
});
module.exports = __toCommonJS(redis_exports);
var import_redis = require("../infrastructure/redis");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cache,
  closeRedis,
  getRedisClient,
  getRedisClientSync,
  getRedisStatus,
  initRedis,
  isRedisAvailable
});
