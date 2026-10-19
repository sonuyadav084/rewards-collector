import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5055),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    ADMIN_NAME: z.string().default('The Nation Pride'),
    ADMIN_EMAIL: z.string().default('thenationpride@admin'),
    ADMIN_PASSWORD: z.string().default('Admin@123456'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for security'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    CUSTOMER_SESSION_EXPIRES_IN: z.string().default('2h'),
    COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters long').default('secure_default_cookie_secret_long_string'),
    CORS_ORIGIN: z.string().default('http://localhost:5185,http://localhost:8085'),
    UPLOAD_DIR: z.string().default(path.join(process.cwd(), 'uploads', 'coupons')),
    MAX_UPLOAD_SIZE_BYTES: z.coerce.number().default(5 * 1024 * 1024), // 5MB
    ENABLE_DEV_OTP: z
      .string()
      .transform((val) => val === 'true')
      .default('false'),
    DEV_OTP_CODE: z.string().default('123456'),
    OTP_EXPIRY_SECONDS: z.coerce.number().default(300), // 5 minutes
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
    OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
    SMS_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_PHONE: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().default(100),
    OTP_RATE_LIMIT_MAX: z.coerce.number().default(10),
  })
  .superRefine((data, ctx) => {
    // SECURITY HARDENING: Never allow mock/dev OTP in production
    if (data.NODE_ENV === 'production' && data.ENABLE_DEV_OTP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ENABLE_DEV_OTP'],
        message: 'CRITICAL SECURITY ERROR: ENABLE_DEV_OTP must be FALSE in production environments!',
      });
    }

    if (data.NODE_ENV === 'production' && data.SMS_PROVIDER === 'mock') {
      logger.warn('WARNING: Running in production with mock SMS provider. Real SMS will not be dispatched.');
    }

    if (data.SMS_PROVIDER === 'twilio') {
      if (!data.TWILIO_ACCOUNT_SID || !data.TWILIO_AUTH_TOKEN || !data.TWILIO_FROM_PHONE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMS_PROVIDER'],
          message: 'Twilio provider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE.',
        });
      }
    }
  });

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    logger.error('Environment configuration validation failed:');
    result.error.issues.forEach((issue) => {
      logger.error(`  - [${issue.path.join('.')}] ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();

