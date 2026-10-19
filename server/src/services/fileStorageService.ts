import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  error?: string;
}

export class FileStorageService {
  /**
   * Validates file magic bytes (signatures)
   */
  public static validateMagicBytes(buffer: Buffer): FileValidationResult {
    if (!buffer || buffer.length < 12) {
      return { isValid: false, mimeType: '', error: 'File is empty or corrupted.' };
    }

    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, mimeType: 'image/jpeg' };
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, mimeType: 'image/png' };
    }

    // WebP signature: RIFF....WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { isValid: true, mimeType: 'image/webp' };
    }

    return {
      isValid: false,
      mimeType: '',
      error: 'Invalid file format. Only true JPG, PNG, and WebP images are permitted.',
    };
  }

  /**
   * Initializes storage directory
   */
  public static ensureUploadDirectory(): void {
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
      logger.info(`Initialized secure upload storage directory: ${env.UPLOAD_DIR}`);
    }
  }

  /**
   * Saves uploaded buffer to a randomized non-guessable path
   */
  public static async saveUploadedFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ filename: string; absolutePath: string; relativePath: string }> {
    this.ensureUploadDirectory();

    let ext = '.jpg';
    if (mimeType === 'image/png') ext = '.png';
    else if (mimeType === 'image/webp') ext = '.webp';
    else if (mimeType === 'image/jpeg') ext = '.jpg';

    // Random UUID filename to completely prevent path traversal and collisions
    const filename = `${crypto.randomUUID()}${ext}`;
    const absolutePath = path.resolve(env.UPLOAD_DIR, filename);

    // Double check path traversal safety
    if (!absolutePath.startsWith(path.resolve(env.UPLOAD_DIR))) {
      throw new Error('Security Alert: Attempted path traversal in file storage.');
    }

    await fs.promises.writeFile(absolutePath, buffer);

    return {
      filename,
      absolutePath,
      relativePath: filename,
    };
  }

  /**
   * Safely deletes file from storage
   */
  public static async deleteFile(filenameOrPath: string): Promise<void> {
    try {
      const filename = path.basename(filenameOrPath);
      const targetPath = path.resolve(env.UPLOAD_DIR, filename);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err) {
      logger.error('Failed to remove file from storage:', err);
    }
  }

  /**
   * Retrieves absolute file path ensuring containment
   */
  public static getSecureFilePath(filename: string): string {
    const safeFilename = path.basename(filename);
    const resolved = path.resolve(env.UPLOAD_DIR, safeFilename);

    if (!resolved.startsWith(path.resolve(env.UPLOAD_DIR)) || !fs.existsSync(resolved)) {
      throw new Error('Requested file not found or access denied.');
    }

    return resolved;
  }
}

