import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  storeId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

const pushSubscriptionSchema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);
