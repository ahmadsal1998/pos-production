/**
 * Users Controller
 * 
 * STORE-LEVEL ISOLATION RULES:
 * 
 * 1. User Creation (createUser):
 *    - Admin users: Can create users for any store or system users (null storeId)
 *    - Manager users: MUST create users for their own store only
 *      * The storeId from request body is IGNORED for security
 *      * The new user's storeId is ALWAYS set to the requester's storeId
 *      * This ensures Managers cannot create users for other stores
 * 
 * 2. User Updates (updateUser):
 *    - Admin users: Can change a user's storeId to any store
 *    - Manager users: CANNOT change storeId at all
 *      * Even if storeId matches their own store, it cannot be modified
 *      * This prevents any potential security issues
 * 
 * 3. User Access (getUsers, getUserById):
 *    - Admin users: Can see all users across all stores
 *    - Manager users: Can only see users from their own store
 * 
 * 4. User Deletion (deleteUser):
 *    - Admin users (role='Admin'): Can only be deleted by Super Admin (userId === 'admin')
 *      * Admin accounts can ONLY be deleted from the Super Admin Panel
 *      * Regular user management screens cannot delete Admin accounts
 *      * This prevents accidental deletion of critical admin accounts
 *    - Non-admin users: Can be deleted by Admin or Manager (with store restrictions)
 *    - Manager users: Can only delete users from their own store
 * 
 * All store-level filtering is enforced at the controller level to ensure
 * complete data isolation between stores.
 */

import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Store from '../models/Store';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import User, { UserDocument } from '../models/User';

// Get all users
export const getUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // CRITICAL: storeId MUST come from JWT only (never from request)
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    let allUsers: UserDocument[] = [];

    if (requesterRole === 'Admin') {
      // Admin users can see all users across all stores
      // Query unified collection - no storeId filter for Admin
      const users = await User.find({}).sort({ createdAt: -1 }).lean();
      allUsers = users as unknown as UserDocument[];
    } else {
      // Non-admin users can only see users from their own store
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      // Use unified model with storeId filter for isolation
      const users = await User.find({ 
        storeId: requesterStoreId.toLowerCase() 
      }).sort({ createdAt: -1 }).lean();
      allUsers = users as unknown as UserDocument[];
    }

    res.status(200).json({
      success: true,
      data: {
        users: allUsers.map((user) => ({
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
    // CRITICAL: storeId MUST come from JWT only
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Build query with storeId filter for non-admin users
    const query: any = { _id: id };
    
    if (requesterRole !== 'Admin') {
      // Non-admin users can only access users from their own store
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }

    // Use unified model - query with storeId filter for isolation
    const user = await User.findOne(query).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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

    // CRITICAL: Extract storeId from request body ONLY for Admin users
    // For non-admin users, storeId MUST come from JWT only
    const { fullName, username, email, password, role, permissions, status, storeId: requestStoreId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Determine the storeId for the new user
    let finalStoreId: string | null = null;

    if (requesterRole === 'Admin') {
      // Admin can create users for any store or system users (null storeId)
      if (requestStoreId) {
        finalStoreId = requestStoreId.toLowerCase();
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
            message: `Store with ID "${requestStoreId}" does not exist.`,
          });
        }
        finalStoreId = store.storeId; // Use the canonical storeId
      } else {
        finalStoreId = null; // System/admin user
      }
    } else {
      // Non-admin users (Managers) MUST create users for their own store only
      // The storeId from request body is IGNORED for security - always use requester's storeId
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users. Please ensure your account is associated with a store.',
        });
      }

      // Always use the requester's storeId - ignore any storeId from request body
      finalStoreId = requesterStoreId.toLowerCase();
      
      // If a storeId was provided in the request, log a warning but still use requester's storeId
      if (requestStoreId && requestStoreId.toLowerCase() !== requesterStoreId.toLowerCase()) {
        console.warn(`⚠️ Security: Manager ${req.user?.userId} attempted to create user for different store. Using requester's storeId instead.`);
      }
    }

    // Check if username already exists in this store (using compound index)
    const existingUsername = await User.findOne({ 
      storeId: finalStoreId,
      username: username.toLowerCase() 
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Check if email already exists globally (email is globally unique across all stores)
    const existingEmail = await User.findOne({ 
      email: email.toLowerCase() 
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Create user in unified collection
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
    // CRITICAL: Extract storeId from request body ONLY for Admin users
    const { fullName, username, email, password, role, permissions, status, storeId: requestStoreId } = req.body;
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Build query with storeId filter for non-admin users
    const query: any = { _id: id };
    
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }

    // Find user in unified collection
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const currentStoreId = user.storeId;

    // Non-admin users can only update users from their own store
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }

      // Additional check: ensure user belongs to requester's store
      if (user.storeId?.toLowerCase() !== requesterStoreId.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update users from your own store.',
        });
      }

      // Non-admin users cannot change storeId at all (even to their own store)
      // The storeId must remain as it was when the user was created
      if (requestStoreId !== undefined) {
        // If user tries to change storeId, reject it
        if (requestStoreId !== null && requestStoreId.toLowerCase() !== user.storeId?.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You cannot change a user\'s store assignment.',
          });
        }
        // Even if storeId matches, non-admin users cannot modify it
        // This prevents any potential security issues
      }
    }

    // Determine the target storeId (if being changed by Admin)
    let targetStoreId = currentStoreId;
    if (requestStoreId !== undefined && requesterRole === 'Admin') {
      if (requestStoreId === null) {
        targetStoreId = null;
      } else {
        const normalizedStoreId = requestStoreId.toLowerCase();
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
            message: `Store with ID "${requestStoreId}" does not exist.`,
          });
        }
        targetStoreId = store.storeId;
      }
    }

    // Track if storeId is being changed
    const isStoreChange = targetStoreId !== currentStoreId && requesterRole === 'Admin';

    // If storeId is being changed, validate uniqueness in target store
    if (isStoreChange) {
      // Check if username already exists in target store
      if (username && username.toLowerCase() !== user.username) {
        const existingUsername = await User.findOne({ 
          storeId: targetStoreId,
          username: username.toLowerCase() 
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists in target store',
          });
        }
      } else if (username) {
        // Check if username exists in target store (even if not changing)
        const existingUsername = await User.findOne({ 
          storeId: targetStoreId,
          username: user.username,
          _id: { $ne: user._id }
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists in target store',
          });
        }
      }

      // Check if email already exists globally (email is globally unique)
      if (email && email.toLowerCase() !== user.email) {
        const existingEmail = await User.findOne({ 
          email: email.toLowerCase() 
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists',
          });
        }
      }

      // Update user with new storeId
      user.storeId = targetStoreId;
    }

    // Check if username is being changed and already exists in same store
    if (username && username.toLowerCase() !== user.username) {
      const existingUsername = await User.findOne({ 
        storeId: user.storeId,
        username: username.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      user.username = username.toLowerCase();
    }

    // Check if email is being changed and already exists globally (email is globally unique)
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      });
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

    // Update password if provided
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isStoreChange ? 'User updated and moved to new store successfully' : 'User updated successfully',
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
    const requesterUserId = req.user?.userId;

    // Prevent deleting the current user
    if (requesterUserId === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Build query with storeId filter for non-admin users
    const query: any = { _id: id };
    
    if (requesterRole !== 'Admin') {
      if (!requesterStoreId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Store ID is required for non-admin users.',
        });
      }
      query.storeId = requesterStoreId.toLowerCase();
    }

    // Find user in unified collection
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // PROTECTION: Admin users can only be deleted from Super Admin Panel
    // Admin accounts are critical and should only be deleted by the Super Admin
    // This prevents accidental deletion from regular store management screens
    if (user.role === 'Admin') {
      // Only the super admin (userId === 'admin') can delete Admin users
      // The Super Admin Panel is the only place where Admin deletion should occur
      if (requesterUserId !== 'admin' || requesterRole !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin accounts can only be deleted from the Super Admin Panel. Regular store management screens cannot delete Admin users.',
        });
      }
      // Super admin can delete Admin users - proceed with deletion
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

    // Delete user from unified collection
    await User.deleteOne({ _id: id });

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
