"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const categories_controller_1 = require("../controllers/categories.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// All category routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/', categories_controller_1.getCategories);
router.post('/', categories_controller_1.validateCreateCategory, categories_controller_1.createCategory);
router.get('/export', categories_controller_1.exportCategories);
router.post('/import', upload.single('file'), categories_controller_1.importCategories);
exports.default = router;
