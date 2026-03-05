import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  /** Selling price to set on product (last-entered; no averaging). */
  sellingPrice?: number;
  /** Quantity in product main unit (for stock update and weighted avg). When set, stock and cost use this instead of quantity. */
  quantityInMainUnit?: number;
}

export interface IPurchase extends Document {
  storeId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: IPurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque';
  status: 'Pending' | 'Completed' | 'Cancelled';
  purchaseDate: Date;
  chequeDetails?: {
    chequeNumber?: string;
    chequeAmount: number;
    bankName?: string;
    chequeDueDate: string;
    status: string;
    notes?: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'قطعة' },
    sellingPrice: { type: Number, min: 0 },
    quantityInMainUnit: { type: Number, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchase>(
  {
    storeId: {
      type: String,
      required: [true, 'Store ID is required'],
      trim: true,
      lowercase: true,
    },
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
    },
    supplierId: {
      type: String,
      required: [true, 'Supplier ID is required'],
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
    },
    items: {
      type: [purchaseItemSchema],
      required: [true, 'Purchase items are required'],
      validate: {
        validator: (items: IPurchaseItem[]) => items.length > 0,
        message: 'Purchase must have at least one item',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Credit', 'Cheque'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Completed',
    },
    purchaseDate: { type: Date, required: true, default: Date.now },
    chequeDetails: {
      chequeNumber: String,
      chequeAmount: Number,
      bankName: String,
      chequeDueDate: String,
      status: String,
      notes: String,
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

purchaseSchema.index({ storeId: 1, poNumber: 1 }, { unique: true });
purchaseSchema.index({ storeId: 1, supplierId: 1 });
purchaseSchema.index({ storeId: 1, purchaseDate: -1 });
purchaseSchema.index({ storeId: 1, status: 1 });

const Purchase: Model<IPurchase> = mongoose.model<IPurchase>('Purchase', purchaseSchema);

export default Purchase;
