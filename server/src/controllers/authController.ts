import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { normalizeMobileNumber } from '../utils/phoneNormalizer';
import { AuditLogService } from '../services/auditLogService';
import { AuthenticatedAdminRequest, AuthenticatedCustomerRequest } from '../middleware/auth.middleware';
import { CouponSubmission } from '../models/CouponSubmission';
import { Customer } from '../models/Customer';
import { env } from '../config/env';

export const requestOtpSchema = z.object({
  mobileNumber: z.string().min(10, 'Mobile number is required'),
});

export const verifyOtpSchema = z.object({
  mobileNumber: z.string().min(10, 'Mobile number is required'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
});

export const customerLoginSchema = z.object({
  name: z.string().min(2, 'Full name is required (at least 2 characters)'),
  mobileNumber: z.string().min(10, 'Mobile phone number must be at least 10 digits'),
});

export const adminLoginSchema = z.object({
  email: z.string().min(3, 'Username or email is required'),
  password: z.string().min(6, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  });

export class AuthController {
  /**
   * Request OTP for customer mobile
   */
  public static async requestOtp(req: Request, res: Response): Promise<void> {
    const { mobileNumber } = req.body;
    const phoneResult = normalizeMobileNumber(mobileNumber);

    if (!phoneResult.isValid) {
      res.status(400).json({
        success: false,
        error: phoneResult.error || 'Invalid mobile phone number format.',
      });
      return;
    }

    try {
      const result = await AuthService.requestCustomerOtp(phoneResult.normalized);
      res.status(200).json({
        success: true,
        data: {
          normalizedMobile: phoneResult.normalized,
          ...result,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to send verification code.',
      });
    }
  }

  /**
   * Verify customer OTP
   */
  public static async verifyOtp(req: Request, res: Response): Promise<void> {
    const { mobileNumber, otp } = req.body;
    const phoneResult = normalizeMobileNumber(mobileNumber);

    if (!phoneResult.isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid mobile number format.',
      });
      return;
    }

    try {
      const { customerToken, mobileNumber: verifiedNumber } = await AuthService.verifyCustomerOtp(
        phoneResult.normalized,
        otp
      );

      // Set secure HTTP-only cookie
      res.cookie('customer_token', customerToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      });

      res.status(200).json({
        success: true,
        message: 'Mobile number verified successfully.',
        data: {
          token: customerToken,
          mobileNumber: verifiedNumber,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'OTP verification failed.',
      });
    }
  }

  /**
   * Direct Customer Login with Name & Mobile (OTP-Free)
   * Strictly enforces: One mobile number can only be used by one person/name.
   */
  public static async customerLogin(req: Request, res: Response): Promise<void> {
    const { name, mobileNumber } = req.body;
    const phoneResult = normalizeMobileNumber(mobileNumber);

    if (!phoneResult.isValid) {
      res.status(400).json({
        success: false,
        error: phoneResult.error || 'Invalid mobile phone number format.',
      });
      return;
    }

    const cleanInputName = name.trim();
    const normalizedPhone = phoneResult.normalized;

    // 1. Check if customer already exists in Customer collection
    let customer = await Customer.findOne({ mobileNumber: normalizedPhone });

    // 2. If not found in Customer collection, check past submissions to link legacy customers
    if (!customer) {
      const pastSubmission = await CouponSubmission.findOne({ customerMobile: normalizedPhone }).sort({ submittedAt: -1 });
      if (pastSubmission && pastSubmission.customerName) {
        customer = await Customer.create({
          name: pastSubmission.customerName.trim(),
          mobileNumber: normalizedPhone,
          lastLoginAt: new Date(),
        });
      }
    }

    // 3. If customer exists, verify the name matches (case-insensitive)
    if (customer) {
      const isNameMatch = customer.name.trim().toLowerCase() === cleanInputName.toLowerCase();
      if (!isNameMatch) {
        res.status(400).json({
          success: false,
          error: 'This mobile number is already registered',
        });
        return;
      }

      // Update last login
      customer.lastLoginAt = new Date();
      await customer.save();
    } else {
      // 4. Register new customer
      customer = await Customer.create({
        name: cleanInputName,
        mobileNumber: normalizedPhone,
        lastLoginAt: new Date(),
      });
    }

    const token = AuthService.generateCustomerToken(normalizedPhone);

    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Customer session authenticated successfully.',
      data: {
        token,
        customerName: customer.name,
        customerMobile: normalizedPhone,
      },
    });
  }

  /**
   * Administrator Login
   */
  public static async adminLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      const { adminToken, admin } = await AuthService.loginAdmin(email, password);

      res.cookie('admin_token', adminToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Audit Log
      await AuditLogService.logAction({
        actorId: admin._id!.toString(),
        actorEmail: admin.email!,
        actorRole: admin.role!,
        action: 'ADMIN_LOGIN',
        targetType: 'AdminUser',
        targetId: admin._id!.toString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Admin login successful.',
        data: {
          token: adminToken,
          admin,
        },
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.message || 'Invalid credentials.',
      });
    }
  }

  /**
   * Logout customer or admin session
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('customer_token');
    res.clearCookie('admin_token');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  /**
   * Returns current authenticated profile (Customer or Admin)
   */
  public static async getMe(req: Request, res: Response): Promise<void> {
    const customerReq = req as AuthenticatedCustomerRequest;
    const adminReq = req as AuthenticatedAdminRequest;

    if (adminReq.admin) {
      res.status(200).json({
        success: true,
        data: {
          type: 'admin',
          admin: adminReq.admin,
        },
      });
      return;
    }

    if (customerReq.customer) {
      let customerName: string | null = null;
      try {
        const latestSub = await CouponSubmission.findOne({ customerMobile: customerReq.customer.mobileNumber })
          .sort({ submittedAt: -1 })
          .select('customerName')
          .lean();
        if (latestSub?.customerName) {
          customerName = latestSub.customerName;
        }
      } catch {
        // ignore lookup errors
      }

      res.status(200).json({
        success: true,
        data: {
          type: 'customer',
          mobileNumber: customerReq.customer.mobileNumber,
          customerName,
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Not authenticated.',
    });
  }

  /**
   * Change Administrator Password
   */
  public static async changeAdminPassword(req: Request, res: Response): Promise<void> {
    const adminReq = req as AuthenticatedAdminRequest;
    if (!adminReq.admin?.id) {
      res.status(401).json({
        success: false,
        error: 'Administrator authentication required.',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    try {
      await AuthService.changeAdminPassword(adminReq.admin.id, currentPassword, newPassword);

      // Audit Log
      await AuditLogService.logAction({
        actorId: adminReq.admin.id,
        actorEmail: adminReq.admin.email,
        actorRole: adminReq.admin.role,
        action: 'ADMIN_PASSWORD_CHANGE',
        targetType: 'AdminUser',
        targetId: adminReq.admin.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to update password.',
      });
    }
  }
}

