import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getCustomerModelForStore } from '../utils/customerModel';
import { getCustomerPaymentModelForStore } from '../utils/customerPaymentModel';
import { findUserByIdAcrossStores } from '../utils/userModel';

export const validateCreateCustomer = [
  body('name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Customer name cannot exceed 200 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('previousBalance')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Previous balance must be a non-negative number'),
];

export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
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
      const user = await findUserByIdAcrossStores(req.user.userId, req.user.storeId || undefined);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
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
    // Get store-specific Customer model
    const Customer = await getCustomerModelForStore(storeId);

    // Check if customer with same phone exists for this store
    const existingCustomer = await Customer.findOne({ 
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

    const customer = await Customer.create({
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
  } catch (error: any) {
    console.error('Error creating customer:', error);
    
    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
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

export const getCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    const Customer = await getCustomerModelForStore(storeId);
    
    // Search parameter
    const searchTerm = (req.query.search as string)?.trim() || '';
    
    // Build query filter
    const queryFilter: any = {};
    
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
    
    const customers = await Customer.find(queryFilter).sort({ createdAt: -1 });

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
  } catch (error: any) {
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

export const getCustomerById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Customer = await getCustomerModelForStore(storeId);
    const customer = await Customer.findById(id);

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
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customer. Please try again.',
    });
  }
});

export const validateCreateCustomerPayment = [
  body('customerId')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  body('method')
    .isIn(['Cash', 'Bank Transfer', 'Cheque'])
    .withMessage('Payment method must be Cash, Bank Transfer, or Cheque'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('invoiceId')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

export const createCustomerPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
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
      const user = await findUserByIdAcrossStores(req.user.userId, req.user.storeId || undefined);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
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
    // Verify customer exists
    const Customer = await getCustomerModelForStore(storeId);
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Get store-specific Customer Payment model
    const CustomerPayment = await getCustomerPaymentModelForStore(storeId);

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
  } catch (error: any) {
    console.error('Error creating customer payment:', error);
    
    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
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

export const getCustomerPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    const CustomerPayment = await getCustomerPaymentModelForStore(storeId);
    
    // Build query
    const query: any = {};
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
  } catch (error: any) {
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

