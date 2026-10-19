/**
 * Mobile Number Normalization Utility
 * Normalizes user-submitted mobile numbers into a consistent, validated format.
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  normalized: string;
  original: string;
  error?: string;
}

export function normalizeMobileNumber(rawPhone: unknown): NormalizedPhoneResult {
  if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') {
    return {
      isValid: false,
      normalized: '',
      original: String(rawPhone ?? ''),
      error: 'Mobile number must be a valid string or numeric value.',
    };
  }

  const original = String(rawPhone).trim();

  // Remove whitespace, dashes, parentheses, dots
  let cleaned = original.replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) {
    return {
      isValid: false,
      normalized: '',
      original,
      error: 'Mobile number cannot be blank.',
    };
  }

  // Handle leading '+' if present
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = '+' + cleaned.replace(/[^\d]/g, '');
  } else {
    cleaned = cleaned.replace(/[^\d]/g, '');
  }

  // Check digit count (excluding +)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      isValid: false,
      normalized: cleaned,
      original,
      error: 'Mobile number must contain between 10 and 15 digits.',
    };
  }

  // Standardize: if 10 digits without country code, prefix with country code (e.g., standard +91 or +1 if needed, or keep unified)
  // To avoid incorrect assumptions, if no '+', prefix with '+'
  const normalized = hasPlus ? cleaned : `+${cleaned}`;

  return {
    isValid: true,
    normalized,
    original,
  };
}

