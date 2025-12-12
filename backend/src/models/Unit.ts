import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UnitDocument extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<UnitDocument>(
  {
    name: {
      type: String,
      required: [true, 'Unit name is required'],
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
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Note: Unique constraint is handled per-store in unitModel.ts

const Unit: Model<UnitDocument> = mongoose.model<UnitDocument>('Unit', unitSchema);

export default Unit;

