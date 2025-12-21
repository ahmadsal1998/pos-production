"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All user routes require authentication
// Admin and Manager can manage users
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('Admin', 'Manager'));
// Get all users
router.get('/', users_controller_1.getUsers);
// Get single user by ID
router.get('/:id', users_controller_1.getUserById);
// Create new user
router.post('/', users_controller_1.validateCreateUser, users_controller_1.createUser);
// Update user
router.put('/:id', users_controller_1.validateUpdateUser, users_controller_1.updateUser);
router.patch('/:id', users_controller_1.validateUpdateUser, users_controller_1.updateUser);
// Delete user
router.delete('/:id', users_controller_1.deleteUser);
exports.default = router;
