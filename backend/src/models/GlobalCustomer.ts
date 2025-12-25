import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * GlobalCustomer model for cross-store customer identification
 * Links customers across all stores using phone number or email as unique identifier
 */
export interface IGlobalCustomer extends Document {
  globalCustomerId: string; // Unique identifier (phone or email)
  identifierType: 'phone' | 'email'; // Type of identifier used
  name: string; // Primary name (from first store registration)
  phone?: string; // Phone number if available
  email?: string; // Email if available
  stores: Array<{
    storeId: string; // Store where customer is registered
    customerId: string; // Customer ID in that store
    customerName: string; // Name in that store
    registeredAt: Date; // When customer was first registered in this store
  }>; // List of stores where this customer is registered
  createdAt: Date;
  updatedAt: Date;
}

const globalCustomerStoreSchema = new Schema(
  {
    storeId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const globalCustomerSchema = new Schema<IGlobalCustomer>(
  {
    globalCustomerId: {
      type: String,
      required: [true, 'Global customer ID is required'],
      trim: true,
      lowercase: true,
    },
    identifierType: {
      type: String,
      enum: ['phone', 'email'],
      required: [true, 'Identifier type is required'],
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    stores: {
      type: [globalCustomerStoreSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
globalCustomerSchema.index({ globalCustomerId: 1 }, { unique: true });
globalCustomerSchema.index({ phone: 1 });
globalCustomerSchema.index({ email: 1 });
globalCustomerSchema.index({ 'stores.storeId': 1 });

/**
 * Helper function to get or create global customer
 */
globalCustomerSchema.statics.getOrCreateGlobalCustomer = async function (
  storeId: string,
  customerId: string,
  customerName: string,
  phone?: string,
  email?: string
): Promise<IGlobalCustomer> {
  // Determine identifier (phone takes priority)
  const identifier = phone || email;
  if (!identifier) {
    throw new Error('Either phone or email is required to create global customer');
  }

  const identifierType = phone ? 'phone' : 'email';
  const globalCustomerId = identifier.toLowerCase().trim();

  // Try to find existing global customer
  let globalCustomer = await this.findOne({ globalCustomerId });

  if (globalCustomer) {
    // Check if store is already linked
    const storeExists = globalCustomer.stores.some(
      (s: any) => s.storeId === storeId.toLowerCase()
    );

    if (!storeExists) {
      // Add store to existing global customer
      globalCustomer.stores.push({
        storeId: storeId.toLowerCase(),
        customerId,
        customerName,
        registeredAt: new Date(),
      });
      await globalCustomer.save();
    }
  } else {
    // Create new global customer
    globalCustomer = await this.create({
      globalCustomerId,
      identifierType,
      name: customerName,
      phone: phone?.trim().toLowerCase(),
      email: email?.trim().toLowerCase(),
      stores: [
        {
          storeId: storeId.toLowerCase(),
          customerId,
          customerName,
          registeredAt: new Date(),
        },
      ],
    });
  }

  return globalCustomer;
};

export interface IGlobalCustomerModel extends Model<IGlobalCustomer> {
  getOrCreateGlobalCustomer(
    storeId: string,
    customerId: string,
    customerName: string,
    phone?: string,
    email?: string
  ): Promise<IGlobalCustomer>;
}

export const GlobalCustomer: IGlobalCustomerModel = mongoose.model<IGlobalCustomer, IGlobalCustomerModel>(
  'GlobalCustomer',
  globalCustomerSchema
);

export default GlobalCustomer;

