import mongoose, { Document, Schema } from 'mongoose';

export interface IOTPChallenge extends Document {
  mobileNumber: string;
  otpHash: string;
  salt: string;
  expiresAt: Date;
  attemptCount: number;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OTPChallengeSchema = new Schema<IOTPChallenge>(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic MongoDB TTL deletion upon expiration
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active challenges
OTPChallengeSchema.index({ mobileNumber: 1, isVerified: 1, expiresAt: 1 });

export const OTPChallenge = mongoose.model<IOTPChallenge>(
  'OTPChallenge',
  OTPChallengeSchema
);

