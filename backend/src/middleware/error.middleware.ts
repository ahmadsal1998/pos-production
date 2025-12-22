import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { log } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errorMessages = Object.values(err.errors).map((e) => e.message);
    message = errorMessages.join(', ');
    statusCode = 400;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const keyPattern = (err as any).keyPattern || {};
    const keyValue = (err as any).keyValue || {};
    
    // Check if this is a sales collection duplicate with invoiceNumber
    // The index is { storeId: 1, invoiceNumber: 1 }, so we need to check for invoiceNumber in the pattern
    if (keyPattern.invoiceNumber !== undefined && keyPattern.storeId !== undefined) {
      // This is a duplicate invoice number for the same store
      const invoiceNumber = keyValue.invoiceNumber || 'unknown';
      message = `Invoice number ${invoiceNumber} already exists for this store`;
      statusCode = 409; // Conflict status code is more appropriate
    } else {
      // Generic duplicate key error - use first field
      const field = Object.keys(keyPattern)[0];
      message = `${field} already exists`;
      statusCode = 400;
    }
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    message = 'Invalid ID format';
    statusCode = 400;
  }

  // Log error (warn and error levels are always logged in production)
  log.error('API Error', err, { statusCode, message });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async handler wrapper to catch errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

