import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OTPChallenge } from '../models/OTPChallenge';
import { AdminUser, IAdminUser } from '../models/AdminUser';
import { env } from '../config/env';
import { smsService } from './sms/smsService';
import { logger } from '../utils/logger';

export interface CustomerTokenPayload {
  role: 'customer';
  mobileNumber: string;
}

export interface AdminTokenPayload {
  role: 'admin' | 'superadmin';
  id: string;
  email: string;
  name: string;
}

export class AuthService {
  /**
   * Hashes an OTP code with a salt using HMAC-SHA256
   */
  private static hashOtp(otp: string, salt: string): string {
    return crypto.createHmac('sha256', env.JWT_SECRET).update(`${otp}:${salt}`).digest('hex');
  }

  /**
   * Initiates mobile OTP verification challenge
   */
  public static async requestCustomerOtp(mobileNumber: string): Promise<{
    success: boolean;
    expiresInSeconds: number;
    cooldownSeconds: number;
    message: string;
    devOtp?: string;
  }> {
    const now = new Date();

    // Check for recent challenge to enforce cooldown
    const existingChallenge = await OTPChallenge.findOne({
      mobileNumber,
      isVerified: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (existingChallenge) {
      const elapsedSeconds = Math.floor((now.getTime() - existingChallenge.createdAt.getTime()) / 1000);
      if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingCooldown = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw new Error(`Please wait ${remainingCooldown} seconds before requesting another verification code.`);
      }
    }

    // Generate 6-digit OTP
    let otp: string;
    if (env.ENABLE_DEV_OTP && env.NODE_ENV !== 'production') {
      otp = env.DEV_OTP_CODE;
    } else {
      otp = crypto.randomInt(100000, 999999).toString();
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = this.hashOtp(otp, salt);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000);

    // Invalidate prior pending challenges for this number
    await OTPChallenge.deleteMany({ mobileNumber, isVerified: false });

    // Save new challenge
    await OTPChallenge.create({
      mobileNumber,
      otpHash,
      salt,
      expiresAt,
      attemptCount: 0,
      isVerified: false,
    });

    // Dispatch via SMS provider
    const dispatchResult = await smsService.sendOtp(mobileNumber, otp);

    if (!dispatchResult.success) {
      logger.error(`Failed to send OTP to ${mobileNumber}: ${dispatchResult.error}`);
      throw new Error(dispatchResult.error || 'Failed to dispatch verification code via SMS provider.');
    }

    return {
      success: true,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      message: 'Verification code dispatched to your mobile number.',
      ...(env.ENABLE_DEV_OTP && env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  /**
   * Verifies submitted OTP against challenge
   */
  public static async verifyCustomerOtp(
    mobileNumber: string,
    submittedOtp: string
  ): Promise<{ customerToken: string; mobileNumber: string }> {
    const now = new Date();

    const challenge = await OTPChallenge.findOne({
      mobileNumber,
      isVerified: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!challenge) {
      throw new Error('No active verification code found or code has expired. Please request a new code.');
    }

    // Check attempt limits
    if (challenge.attemptCount >= env.OTP_MAX_ATTEMPTS) {
      await OTPChallenge.deleteOne({ _id: challenge._id });
      throw new Error('Maximum verification attempts exceeded. Please request a new verification code.');
    }

    // Increment attempt counter
    challenge.attemptCount += 1;
    await challenge.save();

    // Verify hash safely
    const computedHash = this.hashOtp(submittedOtp.trim(), challenge.salt);
    const isMatch = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(challenge.otpHash));

    if (!isMatch) {
      const remainingAttempts = env.OTP_MAX_ATTEMPTS - challenge.attemptCount;
      throw new Error(`Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`);
    }

    // Mark as verified & prevent reuse
    challenge.isVerified = true;
    challenge.verifiedAt = new Date();
    await challenge.save();

    const customerToken = this.generateCustomerToken(mobileNumber);

    return {
      customerToken,
      mobileNumber,
    };
  }

  /**
   * Generates authenticated customer JWT session token directly
   */
  public static generateCustomerToken(mobileNumber: string): string {
    const payload: CustomerTokenPayload = {
      role: 'customer',
      mobileNumber,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.CUSTOMER_SESSION_EXPIRES_IN as any,
    });
  }

  /**
   * Authenticates administrator with email & password
   */
  public static async loginAdmin(email: string, password: string): Promise<{ adminToken: string; admin: Partial<IAdminUser> }> {
    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });

    if (!admin || !admin.isActive) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const payload: AdminTokenPayload = {
      role: admin.role,
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    };

    const adminToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    return {
      adminToken,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  /**
   * Updates administrator password with current password verification
   */
  public static async changeAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await AdminUser.findById(adminId);
    if (!admin || !admin.isActive) {
      throw new Error('Administrator account not found or is inactive.');
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password does not match.');
    }

    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();
  }
}

