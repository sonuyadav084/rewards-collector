/**
 * Coupon Normalization Utility
 * 
 * Rules:
 * 1. Trim surrounding whitespace.
 * 2. Convert characters to uppercase for uniform comparison.
 * 3. Preserve leading zeros (e.g. '00123' must remain '00123', NOT converted to number 123).
 * 4. Remove invisible zero-width spaces, line feeds, and control characters.
 * 5. Validate length and allowable character set (letters, digits, dashes, and underscores).
 */

export interface NormalizedCouponResult {
  isValid: boolean;
  normalized: string;
  original: string;
  error?: string;
}

export function normalizeCouponNumber(rawCoupon: unknown): NormalizedCouponResult {
  if (typeof rawCoupon !== 'string' && typeof rawCoupon !== 'number') {
    return {
      isValid: false,
      normalized: '',
      original: String(rawCoupon ?? ''),
      error: 'Coupon number must be a valid text or alphanumeric string.',
    };
  }

  // Preserve leading zeros by working purely with string representation
  const original = String(rawCoupon);

  // Strip control chars, zero-width chars, and trim whitespace
  const sanitized = original
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/[\r\n\t]/g, '')               // remove newlines/tabs
    .trim()
    .toUpperCase();

  if (!sanitized) {
    return {
      isValid: false,
      normalized: '',
      original,
      error: 'Coupon number cannot be blank or empty.',
    };
  }

  // Length check (minimum 4 chars, maximum 32 chars)
  if (sanitized.length < 4 || sanitized.length > 32) {
    return {
      isValid: false,
      normalized: sanitized,
      original,
      error: `Coupon number must be between 4 and 32 characters long. Received ${sanitized.length} characters.`,
    };
  }

  // Only allow alphanumeric, hyphen, underscore
  const allowedFormatRegex = /^[A-Z0-9_-]+$/;
  if (!allowedFormatRegex.test(sanitized)) {
    return {
      isValid: false,
      normalized: sanitized,
      original,
      error: 'Coupon number can only contain alphanumeric characters, hyphens (-), and underscores (_).',
    };
  }

  return {
    isValid: true,
    normalized: sanitized,
    original,
  };
}

