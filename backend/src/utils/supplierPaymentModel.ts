import mongoose, { Schema, Model, Document } from 'mongoose';
import { getAdminDatabaseConnection } from './databaseManager';
import { log } from './logger';

export interface SupplierPaymentDocument extends Document {
  supplierId: string;
  storeId: string;
  purchaseId?: string;
  date: Date;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierPaymentSchema = new Schema<SupplierPaymentDocument>(
  {
    supplierId: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    purchaseId: { type: String, index: true, default: null },
    date: { type: Date, required: true, default: Date.now, index: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Cheque'],
      required: true,
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

supplierPaymentSchema.index({ supplierId: 1, storeId: 1 });
supplierPaymentSchema.index({ date: -1, storeId: 1 });

const COLLECTION_NAME = 'supplier_payments';

export function getSupplierPaymentModel(): Model<SupplierPaymentDocument> {
  const connection = getAdminDatabaseConnection();
  if (connection.db?.databaseName !== 'admin_db') {
    log.warn(`Expected admin_db connection, got: ${connection.db?.databaseName}`);
  }
  if (connection.models[COLLECTION_NAME]) {
    return connection.models[COLLECTION_NAME] as Model<SupplierPaymentDocument>;
  }
  return connection.model<SupplierPaymentDocument>(
    COLLECTION_NAME,
    supplierPaymentSchema,
    COLLECTION_NAME
  );
}

export function getSupplierPaymentModelForStore(): Model<SupplierPaymentDocument> {
  return getSupplierPaymentModel();
}
