import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { FileStorageService } from '../services/fileStorageService';

// Memory storage so we can inspect actual magic bytes BEFORE saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME filter (actual magic bytes verified next)
    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'));
    }
  },
});

export const singlePhotoUpload = upload.single('couponPhoto');

/**
 * Middleware that strictly verifies magic bytes of the uploaded file
 */
export function verifyPhotoMagicBytes(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'Coupon photo is required. Please upload an image of your coupon.',
    });
    return;
  }

  const magicCheck = FileStorageService.validateMagicBytes(req.file.buffer);

  if (!magicCheck.isValid) {
    res.status(400).json({
      success: false,
      error: magicCheck.error || 'Uploaded file content does not match allowed image formats.',
    });
    return;
  }

  // Update validated mimetype from file header
  req.file.mimetype = magicCheck.mimeType;
  next();
}

export const singleCardImageUpload = upload.single('cardImage');

export function verifyCardImageMagicBytes(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'Sample card image is required. Please upload a clear photo of your coupon card.',
    });
    return;
  }

  const magicCheck = FileStorageService.validateMagicBytes(req.file.buffer);

  if (!magicCheck.isValid) {
    res.status(400).json({
      success: false,
      error: magicCheck.error || 'Uploaded file content does not match allowed image formats.',
    });
    return;
  }

  req.file.mimetype = magicCheck.mimeType;
  next();
}

// Memory upload for CSV/Excel spreadsheet imports
export const singleSpreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for spreadsheets
  },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid spreadsheet format. Only CSV and Excel (.xlsx, .xls) files are accepted.'));
    }
  },
}).single('file');

