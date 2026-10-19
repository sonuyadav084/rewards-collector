import { normalizeCouponNumber } from '../utils/couponNormalizer';

describe('Coupon Normalization and Business Logic Rules', () => {
  test('Preserves leading zeros correctly', () => {
    const result1 = normalizeCouponNumber('00123');
    expect(result1.isValid).toBe(true);
    expect(result1.normalized).toBe('00123');

    const result2 = normalizeCouponNumber('00000789-ABC');
    expect(result2.isValid).toBe(true);
    expect(result2.normalized).toBe('00000789-ABC');
  });

  test('Trims surrounding whitespace and converts to uppercase', () => {
    const result = normalizeCouponNumber('   save-2026-xyz   ');
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe('SAVE-2026-XYZ');
  });

  test('Rejects empty or whitespace-only inputs', () => {
    const result1 = normalizeCouponNumber('');
    expect(result1.isValid).toBe(false);

    const result2 = normalizeCouponNumber('   ');
    expect(result2.isValid).toBe(false);
  });

  test('Enforces length restrictions (4 to 32 chars)', () => {
    const tooShort = normalizeCouponNumber('ABC');
    expect(tooShort.isValid).toBe(false);

    const validLength = normalizeCouponNumber('ABCD');
    expect(validLength.isValid).toBe(true);

    const tooLong = normalizeCouponNumber('A'.repeat(33));
    expect(tooLong.isValid).toBe(false);
  });

  test('Rejects invalid special characters or malicious control characters', () => {
    const invalidChar = normalizeCouponNumber('COUPON<SCRIPT>');
    expect(invalidChar.isValid).toBe(false);

    const invalidPunctuation = normalizeCouponNumber('COUPON#123;DROP TABLE');
    expect(invalidPunctuation.isValid).toBe(false);
  });
});

