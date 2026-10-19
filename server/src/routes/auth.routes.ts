import { Router } from 'express';
import {
  AuthController,
  requestOtpSchema,
  verifyOtpSchema,
  customerLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
} from '../controllers/authController';
import { validateBody } from '../middleware/validation.middleware';
import { otpRequestLimiter, otpVerifyLimiter, adminLoginLimiter } from '../middleware/rateLimiter.middleware';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/customer/login', validateBody(customerLoginSchema), AuthController.customerLogin);
router.post('/otp/request', otpRequestLimiter, validateBody(requestOtpSchema), AuthController.requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.post('/admin/login', adminLoginLimiter, validateBody(adminLoginSchema), AuthController.adminLogin);
router.post('/admin/change-password', authenticateAdmin, validateBody(changePasswordSchema), AuthController.changeAdminPassword);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getMe);

export default router;

