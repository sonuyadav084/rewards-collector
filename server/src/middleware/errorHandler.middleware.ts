import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled request error:', {
    message: err.message,
    stack: err.stack,
  });

  // Handle Multer upload errors
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: `File is too large. Maximum permitted file size is ${Math.round(env.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB.`,
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
    return;
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      error: 'A duplicate record already exists in the system.',
    });
    return;
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const clientMessage =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred. Please contact support.'
      : err.message || 'An error occurred processing your request.';

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

