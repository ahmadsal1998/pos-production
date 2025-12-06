import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  validateCreateUser,
  validateUpdateUser,
} from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
// Admin and Manager can manage users
router.use(authenticate);
router.use(authorize('Admin', 'Manager'));

// Get all users
router.get('/', getUsers);

// Get single user by ID
router.get('/:id', getUserById);

// Create new user
router.post('/', validateCreateUser, createUser);

// Update user
router.put('/:id', validateUpdateUser, updateUser);
router.patch('/:id', validateUpdateUser, updateUser);

// Delete user
router.delete('/:id', deleteUser);

export default router;
