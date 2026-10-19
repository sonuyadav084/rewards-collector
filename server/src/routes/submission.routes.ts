import { Router } from 'express';
import { SubmissionController, createSubmissionSchema } from '../controllers/submissionController';
import { optionalCustomerAuth } from '../middleware/auth.middleware';
import { singlePhotoUpload, verifyPhotoMagicBytes } from '../middleware/upload.middleware';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();

// Real-time OCR coupon code scanner & catalog verification
router.post(
  '/scan-coupon',
  optionalCustomerAuth,
  singlePhotoUpload,
  verifyPhotoMagicBytes,
  SubmissionController.scanCouponPhoto
);

// Allows direct coupon submission without OTP challenge, or authenticated session
router.post(
  '/',
  optionalCustomerAuth,
  singlePhotoUpload,
  verifyPhotoMagicBytes,
  validateBody(createSubmissionSchema),
  SubmissionController.createSubmission
);

router.get('/my', optionalCustomerAuth, SubmissionController.getMySubmissions);
router.get('/my/:id', optionalCustomerAuth, SubmissionController.getMySubmissionById);
router.get('/my/:id/photo', optionalCustomerAuth, SubmissionController.streamMyPhoto);

export default router;

