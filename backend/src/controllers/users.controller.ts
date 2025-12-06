import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Store from '../models/Store';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

// Get all users
export const getUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Build query filter based on role
    let queryFilter: any = {};

    // Non-admin users can only see users from their own store
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }
      queryFilter.storeId = requesterStoreId.toLowerCase();
    }
    // Admin users can see all users (no filter)

    const users = await User.find(queryFilter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId, // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
      },
    });
  }
);

// Get single user by ID
export const getUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Non-admin users can only access users from their own store
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access users from your own store.',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId, // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  }
);

// Create new user
export const createUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { fullName, username, email, password, role, permissions, status, storeId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Determine the storeId for the new user
    let finalStoreId: string | null = null;

    if (requesterRole === 'Admin') {
      // Admin can create users for any store or system users (null storeId)
      if (storeId) {
        finalStoreId = storeId.toLowerCase();
        // Validate that the store exists
        const store = await Store.findOne({ 
          $or: [
            { storeId: finalStoreId },
            { prefix: finalStoreId }
          ]
        });
        if (!store) {
          return res.status(400).json({
            success: false,
            message: `Store with ID "${storeId}" does not exist.`,
          });
        }
        finalStoreId = store.storeId; // Use the canonical storeId
      } else {
        finalStoreId = null; // System/admin user
      }
    } else {
      // Manager can only create users for their own store
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      // Manager must create users for their own store only
      if (storeId && storeId.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only create users for your own store.',
        });
      }

      finalStoreId = requesterStoreId.toLowerCase();
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role || 'Cashier',
      permissions: permissions || [],
      status: status || 'Active',
      storeId: finalStoreId,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId, // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  }
);

// Update user
export const updateUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { fullName, username, email, password, role, permissions, status, storeId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Non-admin users can only update users from their own store
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update users from your own store.',
        });
      }

      // Manager cannot change storeId to a different store
      if (storeId !== undefined && storeId !== null && storeId.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot change a user\'s store assignment.',
        });
      }
    }

    // Check if username is being changed and already exists
    if (username && username.toLowerCase() !== user.username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      user.username = username.toLowerCase();
    }

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
      user.email = email.toLowerCase();
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (permissions !== undefined) user.permissions = permissions;
    if (status) user.status = status;

    // Handle storeId update (only Admin can change it)
    if (storeId !== undefined) {
      if (requesterRole === 'Admin') {
        if (storeId === null) {
          user.storeId = null; // System/admin user
        } else {
          const normalizedStoreId = storeId.toLowerCase();
          // Validate that the store exists
          const store = await Store.findOne({ 
            $or: [
              { storeId: normalizedStoreId },
              { prefix: normalizedStoreId }
            ]
          });
          if (!store) {
            return res.status(400).json({
              success: false,
              message: `Store with ID "${storeId}" does not exist.`,
            });
          }
          user.storeId = store.storeId; // Use the canonical storeId
        }
      }
      // For non-admin, storeId is already validated above and cannot be changed
    }

    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          status: user.status,
          storeId: user.storeId, // Include storeId in response
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  }
);

// Delete user
export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Prevent deleting the current user
    if (req.user?.userId === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Non-admin users can only delete users from their own store
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete users from your own store.',
        });
      }
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  }
);

// Validation middleware for create user
export const validateCreateUser = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .trim(),
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Cashier'])
    .withMessage('Role must be Admin, Manager, or Cashier'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),
];

// Validation middleware for update user
export const validateUpdateUser = [
  body('fullName')
    .optional()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .trim(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .trim(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'Manager', 'Cashier'])
    .withMessage('Role must be Admin, Manager, or Cashier'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be Active or Inactive'),
];
