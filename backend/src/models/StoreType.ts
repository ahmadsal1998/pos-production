import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStoreType {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreTypeDocument extends Document, Omit<IStoreType, '_id'> {
  _id: mongoose.Types.ObjectId;
}

const storeTypeSchema = new Schema<StoreTypeDocument>(
  {
    name: {
      type: String,
      required: [true, 'Store type name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

storeTypeSchema.index({ name: 1 });

const StoreType: Model<StoreTypeDocument> = mongoose.model<StoreTypeDocument>(
  'StoreType',
  storeTypeSchema
);

export default StoreType;
