"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const merchants_controller_1 = require("../controllers/merchants.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Merchant routes
router.get('/', merchants_controller_1.getMerchants);
router.get('/:id', merchants_controller_1.getMerchant);
router.post('/', merchants_controller_1.createMerchant);
router.put('/:id', merchants_controller_1.updateMerchant);
router.delete('/:id', merchants_controller_1.deleteMerchant);
exports.default = router;
