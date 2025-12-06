import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, SystemRole, ScreenPermission } from '../types/auth.types';

// MongoDB Document interface
export interface UserDocument extends Document, Omit<IUser, '_id'> {
  _id: mongoose.Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema
const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Cashier'],
      default: 'Cashier',
      required: true,
    },
    permissions: {
      type: [String],
      enum: [
        'dashboard',
        'products',
        'categories',
        'brands',
        'purchases',
        'expenses',
        'salesToday',
        'salesHistory',
        'posRetail',
        'posWholesale',
        'refunds',
        'preferences',
        'users',
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    lastLogin: {
      type: Date,
    },
    storeId: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
      // null means system/admin user, string means store-specific user
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const user = this as any as UserDocument;
    const currentPassword = user.password as string;
    user.password = await bcrypt.hash(currentPassword, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  const user = this as any as UserDocument;
  return bcrypt.compare(candidatePassword, user.password as string);
};

// Indexes (email and username already indexed by unique: true)
userSchema.index({ role: 1 });
userSchema.index({ storeId: 1 });
// Compound index for store-specific username uniqueness
userSchema.index({ storeId: 1, username: 1 }, { unique: true, partialFilterExpression: { storeId: { $ne: null } } });

// Create model
const User: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);

export default User;

