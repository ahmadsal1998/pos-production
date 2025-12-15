"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerPayments = exports.createCustomerPayment = exports.validateCreateCustomerPayment = exports.deleteCustomer = exports.updateCustomer = exports.validateUpdateCustomer = exports.getCustomerById = exports.getCustomers = exports.createCustomer = exports.validateCreateCustomer = void 0;
const express_validator_1 = require("express-validator");
const error_middleware_1 = require("../middleware/error.middleware");
const Customer_1 = __importDefault(require("../models/Customer"));
const customerPaymentModel_1 = require("../utils/customerPaymentModel");
const User_1 = __importDefault(require("../models/User"));
exports.validateCreateCustomer = [
    (0, express_validator_1.body)('name')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Customer name cannot exceed 200 characters'),
    (0, express_validator_1.body)('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters'),
    (0, express_validator_1.body)('address')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address cannot exceed 500 characters'),
    (0, express_validator_1.body)('previousBalance')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Previous balance must be a non-negative number'),
];
exports.createCustomer = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { name, phone, address, previousBalance = 0 } = req.body;
    let storeId = req.user?.storeId || null;
    // If storeId is not in token, try to get it from the user record
    if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
        try {
            const user = await User_1.default.findById(req.user.userId);
            if (user && user.storeId) {
                storeId = user.storeId;
            }
        }
        catch (error) {
            console.error('Error fetching user:', error.message);
        }
    }
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Check if customer with same phone exists for this store
        const existingCustomer = await Customer_1.default.findOne({
            storeId: normalizedStoreId,
            phone: phone.trim(),
        });
        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: 'Customer with this phone number already exists',
            });
        }
        // Use phone as name if name is not provided
        const customerName = name?.trim() || phone.trim();
        const customer = await Customer_1.default.create({
            storeId: normalizedStoreId,
            name: customerName,
            phone: phone.trim(),
            address: address?.trim() || undefined,
            previousBalance: previousBalance || 0,
        });
        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: {
                customer: {
                    id: customer._id.toString(),
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    previousBalance: customer.previousBalance,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Error creating customer:', error);
        // Handle specific mongoose errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: errorMessages.join(', ') || 'Validation error',
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Customer with this phone number already exists',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create customer. Please try again.',
        });
    }
});
exports.getCustomers = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
            data: {
                customers: [],
            },
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Search parameter
        const searchTerm = req.query.search?.trim() || '';
        // Build query filter - always filter by storeId for store isolation
        const queryFilter = {
            storeId: normalizedStoreId,
        };
        // If search term is provided, search in name, phone, and address
        if (searchTerm) {
            // Normalize search term: remove extra spaces
            const normalizedSearchTerm = searchTerm.replace(/\s+/g, ' ').trim();
            // Create regex pattern for case-insensitive search
            // Escape special regex characters
            const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Search in name, phone, and address fields
            // Using $or to search in multiple fields
            // Using $regex with 'i' flag for case-insensitive search
            queryFilter.$or = [
                { name: { $regex: escapedSearchTerm, $options: 'i' } },
                { phone: { $regex: escapedSearchTerm, $options: 'i' } },
                { address: { $regex: escapedSearchTerm, $options: 'i' } },
            ];
        }
        const customers = await Customer_1.default.find(queryFilter).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Customers fetched successfully',
            data: {
                customers: customers.map(customer => ({
                    id: customer._id.toString(),
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    previousBalance: customer.previousBalance,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                })),
            },
        });
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customers. Please try again.',
            data: {
                customers: [],
            },
        });
    }
});
exports.getCustomerById = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Find customer by ID and storeId to ensure store isolation
        const customer = await Customer_1.default.findOne({
            _id: id,
            storeId: normalizedStoreId,
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Customer fetched successfully',
            data: {
                customer: {
                    id: customer._id.toString(),
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    previousBalance: customer.previousBalance,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer. Please try again.',
        });
    }
});
exports.validateUpdateCustomer = [
    (0, express_validator_1.body)('name')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Customer name cannot exceed 200 characters'),
    (0, express_validator_1.body)('phone')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters'),
    (0, express_validator_1.body)('address')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Address cannot exceed 500 characters'),
    (0, express_validator_1.body)('previousBalance')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Previous balance must be a non-negative number'),
];
exports.updateCustomer = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { id } = req.params;
    const { name, phone, address, previousBalance } = req.body;
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Find customer by ID and storeId to ensure store isolation
        const customer = await Customer_1.default.findOne({
            _id: id,
            storeId: normalizedStoreId,
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }
        // Check if phone is being updated and if it conflicts with another customer
        if (phone && phone.trim() !== customer.phone) {
            const existingCustomer = await Customer_1.default.findOne({
                storeId: normalizedStoreId,
                phone: phone.trim(),
                _id: { $ne: id },
            });
            if (existingCustomer) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer with this phone number already exists',
                });
            }
        }
        // Prepare update data
        const updateData = {};
        if (name !== undefined) {
            updateData.name = name?.trim() || phone?.trim() || customer.phone;
        }
        if (phone !== undefined) {
            updateData.phone = phone.trim();
            // If name is not provided but phone is updated, use phone as name
            if (!name && !customer.name) {
                updateData.name = phone.trim();
            }
        }
        if (address !== undefined) {
            updateData.address = address?.trim() || undefined;
        }
        if (previousBalance !== undefined) {
            updateData.previousBalance = previousBalance || 0;
        }
        // Update customer
        const updatedCustomer = await Customer_1.default.findOneAndUpdate({ _id: id, storeId: normalizedStoreId }, updateData, { new: true, runValidators: true });
        if (!updatedCustomer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: {
                customer: {
                    id: updatedCustomer._id.toString(),
                    name: updatedCustomer.name,
                    phone: updatedCustomer.phone,
                    address: updatedCustomer.address,
                    previousBalance: updatedCustomer.previousBalance,
                    createdAt: updatedCustomer.createdAt,
                    updatedAt: updatedCustomer.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Error updating customer:', error);
        // Handle specific mongoose errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: errorMessages.join(', ') || 'Validation error',
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Customer with this phone number already exists',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update customer. Please try again.',
        });
    }
});
exports.deleteCustomer = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Find customer by ID and storeId to ensure store isolation
        const customer = await Customer_1.default.findOne({
            _id: id,
            storeId: normalizedStoreId,
        });
        // If customer doesn't exist, treat as already deleted (idempotent delete)
        // This ensures consistency: if the customer is already gone from server,
        // we return success so the client can sync its local state
        if (!customer) {
            return res.status(200).json({
                success: true,
                message: 'Customer already deleted or not found',
            });
        }
        // Delete customer
        await Customer_1.default.deleteOne({ _id: id, storeId: normalizedStoreId });
        res.status(200).json({
            success: true,
            message: 'Customer deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete customer. Please try again.',
        });
    }
});
exports.validateCreateCustomerPayment = [
    (0, express_validator_1.body)('customerId')
        .trim()
        .notEmpty()
        .withMessage('Customer ID is required'),
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Payment amount must be greater than 0'),
    (0, express_validator_1.body)('method')
        .isIn(['Cash', 'Bank Transfer', 'Cheque'])
        .withMessage('Payment method must be Cash, Bank Transfer, or Cheque'),
    (0, express_validator_1.body)('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('invoiceId')
        .optional()
        .trim(),
    (0, express_validator_1.body)('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),
];
exports.createCustomerPayment = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { customerId, amount, method, date, invoiceId, notes } = req.body;
    let storeId = req.user?.storeId || null;
    // If storeId is not in token, try to get it from the user record
    if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
        try {
            const user = await User_1.default.findById(req.user.userId);
            if (user && user.storeId) {
                storeId = user.storeId;
            }
        }
        catch (error) {
            console.error('Error fetching user:', error.message);
        }
    }
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Verify customer exists and belongs to this store
        const customer = await Customer_1.default.findOne({
            _id: customerId,
            storeId: normalizedStoreId,
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }
        // Get store-specific Customer Payment model
        const CustomerPayment = await (0, customerPaymentModel_1.getCustomerPaymentModelForStore)(storeId);
        // Create payment record
        const payment = await CustomerPayment.create({
            customerId: customerId.trim(),
            storeId: storeId,
            date: date ? new Date(date) : new Date(),
            amount: parseFloat(amount),
            method: method,
            invoiceId: invoiceId?.trim() || null,
            notes: notes?.trim() || null,
        });
        res.status(201).json({
            success: true,
            message: 'Customer payment created successfully',
            data: {
                payment: {
                    id: payment._id.toString(),
                    customerId: payment.customerId,
                    date: payment.date,
                    amount: payment.amount,
                    method: payment.method,
                    invoiceId: payment.invoiceId,
                    notes: payment.notes,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Error creating customer payment:', error);
        // Handle specific mongoose errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: errorMessages.join(', ') || 'Validation error',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create customer payment. Please try again.',
        });
    }
});
exports.getCustomerPayments = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    const { customerId } = req.query;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
            data: {
                payments: [],
            },
        });
    }
    try {
        const CustomerPayment = await (0, customerPaymentModel_1.getCustomerPaymentModelForStore)(storeId);
        // Build query
        const query = {};
        if (customerId && typeof customerId === 'string') {
            query.customerId = customerId.trim();
        }
        const payments = await CustomerPayment.find(query)
            .sort({ date: -1, createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            message: 'Customer payments fetched successfully',
            data: {
                payments: payments.map(payment => ({
                    id: payment._id.toString(),
                    customerId: payment.customerId,
                    date: payment.date,
                    amount: payment.amount,
                    method: payment.method,
                    invoiceId: payment.invoiceId,
                    notes: payment.notes,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt,
                })),
            },
        });
    }
    catch (error) {
        console.error('Error fetching customer payments:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer payments. Please try again.',
            data: {
                payments: [],
            },
        });
    }
});
