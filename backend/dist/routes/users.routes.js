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
var users_routes_exports = {};
__export(users_routes_exports, {
  default: () => users_routes_default
});
module.exports = __toCommonJS(users_routes_exports);
var import_express = require("express");
var import_users = require("../controllers/users.controller");
var import_auth = require("../middleware/auth.middleware");
const router = (0, import_express.Router)();
router.use(import_auth.authenticate);
router.use((0, import_auth.authorize)("Admin", "Manager"));
router.get("/", import_users.getUsers);
router.get("/:id", import_users.getUserById);
router.post("/", import_users.validateCreateUser, import_users.createUser);
router.put("/:id", import_users.validateUpdateUser, import_users.updateUser);
router.patch("/:id", import_users.validateUpdateUser, import_users.updateUser);
router.delete("/:id", import_users.deleteUser);
var users_routes_default = router;
