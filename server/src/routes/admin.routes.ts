import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { singleSpreadsheetUpload, singleCardImageUpload, verifyCardImageMagicBytes } from '../middleware/upload.middleware';
import { AdminDashboardController } from '../controllers/adminDashboardController';
import { AdminSubmissionController, updateStatusSchema } from '../controllers/adminSubmissionController';
import { AdminCouponController, confirmImportSchema } from '../controllers/adminCouponController';
import { AdminReportController } from '../controllers/adminReportController';
import { AdminTemplateController } from '../controllers/adminTemplateController';
import { AuthController, changePasswordSchema } from '../controllers/authController';

const router = Router();

// Strict administrator authentication required on all routes in this module
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard', AdminDashboardController.getDashboardMetrics);

// Submissions Review
router.get('/submissions', AdminSubmissionController.getSubmissions);
router.get('/submissions/:id', AdminSubmissionController.getSubmissionById);
router.get('/submissions/:id/photo', AdminSubmissionController.streamPhoto);
router.patch(
  '/submissions/:id/status',
  validateBody(updateStatusSchema),
  AdminSubmissionController.updateSubmissionStatus
);

// Coupons Management & Import
router.get('/coupons', AdminCouponController.listRegisteredCoupons);
router.get('/coupons/import/template', AdminCouponController.downloadTemplate);
router.get('/coupons/import/:previewId/errors', AdminCouponController.downloadErrorReport);
router.post(
  '/coupons/import/preview',
  singleSpreadsheetUpload,
  AdminCouponController.previewImport
);
router.post(
  '/coupons/import/confirm',
  validateBody(confirmImportSchema),
  AdminCouponController.confirmImport
);

// Reports
router.get('/reports/submissions.csv', AdminReportController.exportSubmissionsCsv);

// Card Templates & Formats Management
router.get('/templates', AdminTemplateController.getTemplates);
router.post(
  '/templates/auto-detect',
  singleCardImageUpload,
  verifyCardImageMagicBytes,
  AdminTemplateController.autoDetectFromImage
);
router.post('/templates', AdminTemplateController.createTemplate);
router.put('/templates/:id', AdminTemplateController.updateTemplate);
router.delete('/templates/:id', AdminTemplateController.deleteTemplate);
router.patch('/templates/:id/toggle', AdminTemplateController.toggleTemplateStatus);


// Administrator Security / Password Update
router.post(
  '/change-password',
  validateBody(changePasswordSchema),
  AuthController.changeAdminPassword
);

export default router;

