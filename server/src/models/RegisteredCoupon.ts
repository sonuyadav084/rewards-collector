import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRegisteredCoupon extends Document {
  couponNumber: string;
  normalizedCouponNumber: string;
  isSubmitted: boolean;
  submissionId?: Types.ObjectId;
  importBatchId?: string;
  importedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RegisteredCouponSchema = new Schema<IRegisteredCoupon>(
  {
    couponNumber: {
      type: String,
      required: [true, 'Coupon number is required'],
      trim: true,
    },
    normalizedCouponNumber: {
      type: String,
      required: [true, 'Normalized coupon number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
      index: true,
    },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'CouponSubmission',
      default: null,
    },
    importBatchId: {
      type: String,
      trim: true,
      index: true,
    },
    importedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for fast lookup of available registered coupons
RegisteredCouponSchema.index({ normalizedCouponNumber: 1, isSubmitted: 1 });

export const RegisteredCoupon = mongoose.model<IRegisteredCoupon>(
  'RegisteredCoupon',
  RegisteredCouponSchema
);

