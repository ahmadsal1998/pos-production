"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const brands_controller_1 = require("../controllers/brands.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// All brand routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/', brands_controller_1.getBrands);
router.post('/', brands_controller_1.validateCreateBrand, brands_controller_1.createBrand);
router.get('/export', brands_controller_1.exportBrands);
router.post('/import', upload.single('file'), brands_controller_1.importBrands);
exports.default = router;
