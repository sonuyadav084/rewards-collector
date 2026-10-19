import mongoose, { Document, Schema } from 'mongoose';

export interface ICouponTemplate extends Document {
  name: string;
  description?: string;
  codePrefix: string;
  codePattern: string; // Regex string e.g. "^NP\\d{6}$"
  sampleCode: string; // e.g. "NP000001"
  requiredKeywords: string[]; // e.g. ["NATION PRIDE", "SCRATCH & WIN"]
  minKeywordMatches: number;
  qrCodeMatch?: string; // e.g. "thenationpride.store"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponTemplateSchema = new Schema<ICouponTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    codePrefix: {
      type: String,
      required: [true, 'Code prefix is required (e.g. NP)'],
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    codePattern: {
      type: String,
      required: [true, 'Code format pattern regex is required'],
      trim: true,
      default: '^NP\\d{6}$',
    },
    sampleCode: {
      type: String,
      required: [true, 'Sample code is required (e.g. NP000001)'],
      trim: true,
      uppercase: true,
    },
    requiredKeywords: {
      type: [String],
      default: ['NATION PRIDE', 'SCRATCH'],
    },
    minKeywordMatches: {
      type: Number,
      default: 2,
      min: 1,
    },
    qrCodeMatch: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

export const CouponTemplate = mongoose.model<ICouponTemplate>(
  'CouponTemplate',
  CouponTemplateSchema
);

