"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const warehouses_controller_1 = require("../controllers/warehouses.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// All warehouse routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/', warehouses_controller_1.getWarehouses);
router.get('/export', warehouses_controller_1.exportWarehouses);
router.get('/:id', warehouses_controller_1.getWarehouseById);
router.post('/', warehouses_controller_1.validateCreateWarehouse, warehouses_controller_1.createWarehouse);
router.put('/:id', warehouses_controller_1.validateUpdateWarehouse, warehouses_controller_1.updateWarehouse);
router.delete('/:id', warehouses_controller_1.deleteWarehouse);
router.post('/import', upload.single('file'), warehouses_controller_1.importWarehouses);
exports.default = router;
