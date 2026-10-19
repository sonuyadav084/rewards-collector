import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { CustomerTokenPayload, AdminTokenPayload } from '../services/authService';

export interface AuthenticatedCustomerRequest extends Request {
  customer?: CustomerTokenPayload;
}

export interface AuthenticatedAdminRequest extends Request {
  admin?: AdminTokenPayload;
}

/**
 * Middleware ensuring request is from an authenticated customer session
 */
export function authenticateCustomer(
  req: AuthenticatedCustomerRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies?.customer_token;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please verify your mobile number with OTP first.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as CustomerTokenPayload;
    if (decoded.role !== 'customer' || !decoded.mobileNumber) {
      res.status(403).json({ success: false, error: 'Invalid customer token payload.' });
      return;
    }

    req.customer = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Customer session has expired or is invalid. Please verify again.',
    });
  }
}

/**
 * Middleware for optional customer authentication
 * Populates req.customer if valid token is provided, without blocking unauthenticated requests
 */
export function optionalCustomerAuth(
  req: AuthenticatedCustomerRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : req.cookies?.customer_token;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as CustomerTokenPayload;
      if (decoded.role === 'customer' && decoded.mobileNumber) {
        req.customer = decoded;
      }
    } catch {
      // Ignore token failure in optional auth
    }
  }
  next();
}

/**
 * Middleware ensuring request is from an authenticated administrator
 */
export function authenticateAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieToken = req.cookies?.admin_token;

  // 1. Try Authorization header token
  if (headerToken) {
    try {
      const decoded = jwt.verify(headerToken, env.JWT_SECRET) as AdminTokenPayload;
      if (['admin', 'superadmin'].includes(decoded.role) && decoded.id) {
        req.admin = decoded;
        return next();
      }
    } catch {
      // Header token invalid or expired, continue to cookie check
    }
  }

  // 2. Try HTTP-only admin cookie fallback
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, env.JWT_SECRET) as AdminTokenPayload;
      if (['admin', 'superadmin'].includes(decoded.role) && decoded.id) {
        req.admin = decoded;
        return next();
      }
    } catch {
      // Cookie token invalid
    }
  }

  res.status(401).json({
    success: false,
    error: 'Administrator authentication required.',
  });
}

/**
 * Middleware ensuring superadmin authorization
 */
export function requireSuperAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.admin || req.admin.role !== 'superadmin') {
    res.status(403).json({
      success: false,
      error: 'Superadmin privileges are required for this action.',
    });
    return;
  }
  next();
}

