"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
// All settings routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
// Get all store settings
router.get('/', settings_controller_1.getStoreSettings);
// Get single setting by key
router.get('/:key', settings_controller_1.getStoreSetting);
// Update or create setting
router.put('/:key', settings_controller_1.validateUpdateStoreSetting, settings_controller_1.updateStoreSetting);
exports.default = router;
