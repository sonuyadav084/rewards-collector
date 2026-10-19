import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ICouponSubmission extends Document {
  submissionReference: string;
  couponNumber: string;
  normalizedCouponNumber: string;
  customerName: string;
  customerMobile: string;
  photoStoragePath: string;
  photoOriginalName: string;
  photoMimeType: string;
  photoFileSize: number;
  status: SubmissionStatus;
  rejectionReason?: string;
  feedbackRating?: 'Good' | 'Better' | 'Excellent';
  feedbackComment?: string;
  isAutoApproved?: boolean;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSubmissionSchema = new Schema<ICouponSubmission>(
  {
    submissionReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    couponNumber: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedCouponNumber: {
      type: String,
      required: true,
      unique: true, // STRICT CONSTRAINT: One submission per coupon number in lifetime
      trim: true,
      uppercase: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    customerMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    photoStoragePath: {
      type: String,
      required: true,
    },
    photoOriginalName: {
      type: String,
      required: true,
    },
    photoMimeType: {
      type: String,
      required: true,
    },
    photoFileSize: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    feedbackRating: {
      type: String,
      enum: ['Good', 'Better', 'Excellent'],
    },
    feedbackComment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isAutoApproved: {
      type: Boolean,
      default: false,
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

// Compound index for efficient customer history queries
CouponSubmissionSchema.index({ customerMobile: 1, submittedAt: -1 });

// Compound index for admin date/status filters
CouponSubmissionSchema.index({ status: 1, submittedAt: -1 });

export const CouponSubmission = mongoose.model<ICouponSubmission>(
  'CouponSubmission',
  CouponSubmissionSchema
);

