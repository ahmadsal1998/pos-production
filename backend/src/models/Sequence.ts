import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISequence extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: string;
  sequenceType: string; // e.g., 'invoiceNumber'
  value: number; // Current sequence value
  createdAt: Date;
  updatedAt: Date;
}

const sequenceSchema = new Schema<ISequence>(
  {
    storeId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    sequenceType: {
      type: String,
      required: true,
      default: 'invoiceNumber',
    },
    value: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one sequence per store per type
sequenceSchema.index({ storeId: 1, sequenceType: 1 }, { unique: true });

// Export the model (using unified collection, no prefix needed)
const Sequence: Model<ISequence> = mongoose.models.Sequence || mongoose.model<ISequence>('Sequence', sequenceSchema);

export default Sequence;

