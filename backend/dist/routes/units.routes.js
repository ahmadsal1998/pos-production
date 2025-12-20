"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const units_controller_1 = require("../controllers/units.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// All unit routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/', units_controller_1.getUnits);
router.get('/:id', units_controller_1.getUnitById);
router.post('/', units_controller_1.validateCreateUnit, units_controller_1.createUnit);
router.put('/:id', units_controller_1.validateUpdateUnit, units_controller_1.updateUnit);
router.delete('/:id', units_controller_1.deleteUnit);
router.get('/export', units_controller_1.exportUnits);
router.post('/import', upload.single('file'), units_controller_1.importUnits);
exports.default = router;
