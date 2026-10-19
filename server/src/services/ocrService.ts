import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { CouponTemplate, ICouponTemplate } from '../models/CouponTemplate';
import { RegisteredCoupon } from '../models/RegisteredCoupon';
import { logger } from '../utils/logger';

export interface ScanCouponResult {
  success: boolean;
  isTemplateValid: boolean;
  matchedTemplateName?: string;
  detectedCode: string | null;
  verified: boolean;
  isSubmitted: boolean;
  message: string;
  rawText?: string;
  confidence?: number;
}

export interface AutoDetectedTemplateFeatures {
  name: string;
  description: string;
  codePrefix: string;
  codePattern: string;
  sampleCode: string;
  requiredKeywords: string[];
  minKeywordMatches: number;
  qrCodeMatch?: string;
  detectedQr?: string;
  rawText: string;
}

export class OcrService {
  private static workerInstance: Worker | null = null;
  private static initPromise: Promise<Worker> | null = null;

  /**
   * Lazily initializes and reuses a singleton Tesseract OCR worker
   */
  private static async getWorker(): Promise<Worker> {
    if (this.workerInstance) {
      return this.workerInstance;
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        logger.info('Initializing OCR Tesseract worker for automatic coupon extraction...');
        const worker = await createWorker('eng');
        this.workerInstance = worker;
        logger.info('OCR Tesseract worker ready.');
        return worker;
      })();
    }

    return this.initPromise;
  }

  /**
   * Decodes QR Code from image if present
   */
  private static async decodeQrCode(imagePath: string): Promise<string | null> {
    try {
      const { data, info } = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      if (qr && qr.data) {
        logger.info(`Decoded QR code from image: ${qr.data}`);
        return qr.data.trim();
      }
    } catch (err) {
      logger.debug('QR decoding error (no QR code found):', err);
    }
    return null;
  }

  /**
   * Scans coupon photo, validates against approved Card Templates, and verifies code with catalog.
   */
  public static async scanAndVerifyCoupon(imagePath: string): Promise<ScanCouponResult> {
    try {
      const worker = await this.getWorker();

      // 1. Fetch active templates from database
      const activeTemplates = await CouponTemplate.find({ isActive: true }).lean();

      // 2. Decode QR code
      const decodedQr = await this.decodeQrCode(imagePath);

      // 3. Multi-angle OCR recognition (0°, 270°, 90°)
      const rotations = [0, 270, 90];
      const ocrTextsByAngle: { angle: number; text: string; confidence: number }[] = [];
      let combinedOcrText = '';
      let bestConfidence = 0;

      for (const angle of rotations) {
        let imageInput: string | Buffer = imagePath;
        if (angle !== 0) {
          try {
            imageInput = await sharp(imagePath).rotate(angle).toBuffer();
          } catch (rotErr) {
            logger.warn(`Could not rotate image to ${angle} degrees:`, rotErr);
            continue;
          }
        }

        const ret = await worker.recognize(imageInput);
        const rawText = ret.data.text || '';
        const confidence = ret.data.confidence;
        if (confidence > bestConfidence) bestConfidence = confidence;

        ocrTextsByAngle.push({ angle, text: rawText, confidence });
        combinedOcrText += `\n ${rawText}`;
      }

      // Cleaned alphanumeric OCR text
      const cleanCombinedOcr = combinedOcrText.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const upperCombinedOcr = combinedOcrText.toUpperCase();

      // 3.5 Disqualifying non-coupon document types (Invoices, Receipts, Challans, Tax bills)
      const invoiceKeywords = [
        'TAX INVOICE',
        'INVOICE',
        'BILL OF SUPPLY',
        'DELIVERY CHALLAN',
        'CHALLAN',
        'CONSIGNEE',
        'BUYER',
        'DISPATCH THROUGH',
        'TERMS OF SALE',
        'GSTIN',
        'CST NO',
        'CST-VAT',
        'CST/VAT',
        'VAT TIN',
        'TIN NO',
        'HSN/SAC',
        'HSN CODE',
        'E-WAY BILL',
        'TAXABLE VALUE',
        'TOTAL AMOUNT',
        'CGST',
        'SGST',
        'IGST',
        'SUB TOTAL',
        'SUBTOTAL',
        'ROUND OFF',
        'AUTH SIGNATORY',
        'AUTHORISED SIGNATORY',
        'AUTHORIZED SIGNATORY',
        'BANK DETAILS',
        'IFSC CODE',
      ];

      const detectedInvoiceKeywords = invoiceKeywords.filter((kw) => {
        const cleanKw = kw.replace(/[^A-Z0-9]/g, '');
        return cleanCombinedOcr.includes(cleanKw) || upperCombinedOcr.includes(kw);
      });

      if (detectedInvoiceKeywords.length > 0) {
        logger.warn(
          `Uploaded document rejected as billing/tax invoice. Detected terms: [${detectedInvoiceKeywords.join(', ')}]`
        );
        return {
          success: false,
          isTemplateValid: false,
          detectedCode: null,
          verified: false,
          isSubmitted: false,
          message: 'This template is not valid. The uploaded image is an invoice or billing document, not an official coupon card.',
          rawText: combinedOcrText.slice(0, 300),
          confidence: bestConfidence,
        };
      }

      // 4. Template Matching Check
      let matchedTemplate: (typeof activeTemplates)[0] | null = null;

      if (activeTemplates.length > 0) {
        for (const tmpl of activeTemplates) {
          let isMatch = false;

          // Check A: QR Code Match
          if (tmpl.qrCodeMatch && decodedQr) {
            const cleanTmplQr = tmpl.qrCodeMatch.toLowerCase().replace(/https?:\/\//, '');
            const cleanDecoded = decodedQr.toLowerCase();
            if (cleanDecoded.includes(cleanTmplQr)) {
              isMatch = true;
              logger.info(`Template '${tmpl.name}' matched via QR Code URL: ${decodedQr}`);
            }
          }

          // Check B: Required Keywords in OCR text
          if (!isMatch && tmpl.requiredKeywords && tmpl.requiredKeywords.length > 0) {
            const matchedKws = tmpl.requiredKeywords.filter((kw) => {
              const cleanKw = kw.toUpperCase().replace(/[^A-Z0-9]/g, '');
              return cleanCombinedOcr.includes(cleanKw);
            });

            // For scratch cards, require at least 2 keywords if available (e.g. brand + scratch)
            const minNeeded =
              tmpl.minKeywordMatches && tmpl.minKeywordMatches > 1
                ? tmpl.minKeywordMatches
                : Math.min(2, tmpl.requiredKeywords.length);

            if (matchedKws.length >= minNeeded) {
              isMatch = true;
              logger.info(
                `Template '${tmpl.name}' matched via ${matchedKws.length}/${minNeeded} required keywords: [${matchedKws.join(', ')}] in OCR text.`
              );
            }
          }

          if (isMatch) {
            matchedTemplate = tmpl;
            break;
          }
        }

        // If NO active template matches the image -> REJECT
        if (!matchedTemplate) {
          logger.warn('Uploaded image does NOT match any active coupon template.');
          return {
            success: false,
            isTemplateValid: false,
            detectedCode: null,
            verified: false,
            isSubmitted: false,
            message: 'This coupon template is not valid. Please upload an official recognized coupon voucher card.',
            rawText: combinedOcrText.slice(0, 300),
            confidence: bestConfidence,
          };
        }
      }

      // 5. Template is valid! Now extract code according to template format
      logger.info(`Valid template identified: ${matchedTemplate ? matchedTemplate.name : 'Default/Unrestricted'}`);

      // Extract candidate codes
      const candidateCodes = this.extractCandidatesForTemplate(combinedOcrText, matchedTemplate);

      // Fetch registered coupons from database to cross-reference
      const registeredCoupons = await RegisteredCoupon.find(
        {},
        'couponNumber normalizedCouponNumber isSubmitted'
      ).lean();

      // Check for exact substring match in OCR for registered coupons
      let finalCode: string | null = null;
      let isRegistered = false;
      let isAlreadySubmitted = false;

      // Check registered coupons against candidates
      for (const cand of candidateCodes) {
        const norm = cand.toUpperCase().trim();
        const found = registeredCoupons.find((r) => r.normalizedCouponNumber === norm);
        if (found) {
          finalCode = found.couponNumber;
          isRegistered = true;
          isAlreadySubmitted = Boolean(found.isSubmitted);
          break;
        }
      }

      // If not found in candidates, check if any registered coupon matches clean OCR directly
      if (!finalCode) {
        for (const reg of registeredCoupons) {
          // If template has a code prefix, only check coupons matching that prefix
          if (matchedTemplate?.codePrefix && !reg.normalizedCouponNumber.startsWith(matchedTemplate.codePrefix)) {
            continue;
          }

          const cleanReg = reg.normalizedCouponNumber.replace(/[^A-Z0-9]/g, '');
          if (cleanReg.length >= 4 && cleanCombinedOcr.includes(cleanReg)) {
            finalCode = reg.couponNumber;
            isRegistered = true;
            isAlreadySubmitted = Boolean(reg.isSubmitted);
            break;
          }
        }
      }

      // If still not matched in catalog, verify if any candidate strictly conforms to template format
      if (!finalCode && candidateCodes.length > 0) {
        for (const cand of candidateCodes) {
          let matchesPrefix = true;
          let matchesPattern = true;

          if (matchedTemplate?.codePrefix) {
            matchesPrefix = cand.toUpperCase().startsWith(matchedTemplate.codePrefix.toUpperCase());
          }

          if (matchedTemplate?.codePattern) {
            try {
              const pat = new RegExp(matchedTemplate.codePattern, 'i');
              matchesPattern = pat.test(cand);
            } catch {
              // ignore regex errors
            }
          }

          if (matchesPrefix && matchesPattern) {
            finalCode = cand;
            isRegistered = false;
            isAlreadySubmitted = false;
            break;
          }
        }
      }

      // Return result
      if (finalCode) {
        if (isAlreadySubmitted) {
          return {
            success: true,
            isTemplateValid: true,
            matchedTemplateName: matchedTemplate?.name,
            detectedCode: finalCode,
            verified: true,
            isSubmitted: true,
            message: `Coupon code '${finalCode}' detected from valid template, but has already been redeemed.`,
            rawText: combinedOcrText.slice(0, 300),
            confidence: bestConfidence,
          };
        }

        if (isRegistered) {
          return {
            success: true,
            isTemplateValid: true,
            matchedTemplateName: matchedTemplate?.name,
            detectedCode: finalCode,
            verified: true,
            isSubmitted: false,
            message: `Valid coupon code '${finalCode}' auto-detected from '${matchedTemplate?.name || 'Official Card'}'!`,
            rawText: combinedOcrText.slice(0, 300),
            confidence: bestConfidence,
          };
        }

        // Code format matched template, but not found in registered database
        return {
          success: true,
          isTemplateValid: true,
          matchedTemplateName: matchedTemplate?.name,
          detectedCode: finalCode,
          verified: false,
          isSubmitted: false,
          message: `Coupon code '${finalCode}' format recognized from '${matchedTemplate?.name}', but not registered in active catalog.`,
          rawText: combinedOcrText.slice(0, 300),
          confidence: bestConfidence,
        };
      }

      // Template matched, but code text couldn't be read clearly
      return {
        success: true,
        isTemplateValid: true,
        matchedTemplateName: matchedTemplate?.name,
        detectedCode: null,
        verified: false,
        isSubmitted: false,
        message: `Recognized '${matchedTemplate?.name}' template, but coupon number could not be read clearly. Please type it manually.`,
        rawText: combinedOcrText.slice(0, 300),
        confidence: bestConfidence,
      };
    } catch (error) {
      logger.error('Error during OCR coupon scanning:', error);
      return {
        success: false,
        isTemplateValid: false,
        detectedCode: null,
        verified: false,
        isSubmitted: false,
        message: 'Failed to process coupon photo for auto-detection. Please enter code manually.',
      };
    }
  }

  /**
   * Extract candidate codes based on template configuration and standard patterns
   */
  private static extractCandidatesForTemplate(
    text: string,
    template?: { codePrefix?: string; codePattern?: string } | null
  ): string[] {
    const candidates = new Set<string>();
    const upper = text.toUpperCase();

    const prefix = template?.codePrefix ? template.codePrefix.toUpperCase().trim() : null;

    // 1. Template-specific pattern regex
    if (template?.codePattern) {
      try {
        // Strip anchors ^ and $ for searching inside multi-line text
        const unanchored = template.codePattern.replace(/^\^|\$$/g, '');
        const regex = new RegExp(`[A-Z0-9]*${unanchored}[A-Z0-9]*`, 'gi');
        const matches = upper.match(regex) || [];
        matches.forEach((m) => {
          const clean = m.replace(/[^A-Z0-9\-]/g, '');
          if (clean.length >= 4) candidates.add(clean);
        });
      } catch (e) {
        logger.warn('Invalid template regex:', e);
      }
    }

    // 2. Template-specific prefix search (e.g. NP followed by digits/letters)
    if (prefix) {
      const prefixRegex = new RegExp(`\\b${prefix}[\\s\\-]?[0-9A-Z]{4,14}\\b`, 'gi');
      const prefixMatches = upper.match(prefixRegex) || [];
      prefixMatches.forEach((m) => {
        const clean = m.replace(/[\s\-]/g, '');
        if (clean.length >= prefix.length + 3) candidates.add(clean);
      });
    }

    // 3. Fallback standard coupon patterns (ONLY if template has NO prefix/pattern)
    if (!prefix && !template?.codePattern) {
      const hyphenMatches = upper.match(/[A-Z0-9]{3,}-[A-Z0-9]{2,}(-[A-Z0-9]+)?/g) || [];
      hyphenMatches.forEach((m) => {
        const clean = m.trim().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
        if (clean.length >= 5) candidates.add(clean);
      });
    }

    return Array.from(candidates).sort((a, b) => {
      if (prefix && a.startsWith(prefix) && !b.startsWith(prefix)) return -1;
      if (prefix && !a.startsWith(prefix) && b.startsWith(prefix)) return 1;
      return 0;
    });
  }

  /**
   * Automatically extracts template features (Brand, Keywords, QR, Code Prefix & Pattern)
   * from an uploaded sample coupon card image buffer.
   */
  public static async autoDetectTemplateFeatures(imageBuffer: Buffer): Promise<AutoDetectedTemplateFeatures> {
    // 1. Decode QR Code from buffer
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    const decodedQr = qr?.data ? qr.data.trim() : null;

    let qrDomain: string | undefined;
    if (decodedQr) {
      try {
        const url = new URL(decodedQr.startsWith('http') ? decodedQr : `https://${decodedQr}`);
        qrDomain = url.hostname.replace(/^www\./, '');
      } catch {
        const match = decodedQr.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (match) qrDomain = match[1];
      }
    }

    // 2. Multi-angle OCR recognition (0°, 270°, 90°)
    const worker = await this.getWorker();
    const rotations = [0, 270, 90];
    let combinedOcrText = '';

    for (const angle of rotations) {
      let imageInput: Buffer = imageBuffer;
      if (angle !== 0) {
        try {
          imageInput = await sharp(imageBuffer).rotate(angle).toBuffer();
        } catch {
          continue;
        }
      }
      const ret = await worker.recognize(imageInput);
      combinedOcrText += `\n ${ret.data.text || ''}`;
    }

    const upperText = combinedOcrText.toUpperCase();
    const cleanText = upperText.replace(/[^A-Z0-9]/g, '');

    // 3. Disqualify if it's an invoice or tax receipt
    const invoiceKeywords = [
      'TAX INVOICE', 'INVOICE', 'BILL OF SUPPLY', 'DELIVERY CHALLAN', 'CHALLAN',
      'CONSIGNEE', 'BUYER', 'DISPATCH THROUGH', 'TERMS OF SALE', 'GSTIN',
      'CST NO', 'CST-VAT', 'CST/VAT', 'VAT TIN', 'TIN NO', 'HSN/SAC', 'HSN CODE',
      'E-WAY BILL', 'TAXABLE VALUE', 'TOTAL AMOUNT', 'CGST', 'SGST', 'IGST',
      'SUB TOTAL', 'SUBTOTAL', 'ROUND OFF', 'AUTH SIGNATORY', 'AUTHORISED SIGNATORY',
      'AUTHORIZED SIGNATORY', 'BANK DETAILS', 'IFSC CODE',
    ];

    const isInvoice = invoiceKeywords.some((kw) => {
      const cleanKw = kw.replace(/[^A-Z0-9]/g, '');
      return cleanText.includes(cleanKw) || upperText.includes(kw);
    });

    if (isInvoice) {
      throw new Error(
        'The uploaded image appears to be an invoice or billing document, not a coupon card. Please upload an official recognized coupon voucher card.'
      );
    }

    // 4. Extract Brand & Keywords
    let brandName = 'Official Voucher';
    const keywords: string[] = [];

    if (cleanText.includes('NATIONPRIDE') || qrDomain?.includes('nationpride')) {
      brandName = 'The Nation Pride';
      keywords.push('NATION PRIDE');
    } else {
      const lines = combinedOcrText
        .split('\n')
        .map((l) => l.trim().replace(/[^a-zA-Z0-9\s]/g, ''))
        .filter((l) => l.length >= 4 && !/^\d+$/.test(l));
      if (lines.length > 0) {
        brandName = lines[0].slice(0, 30);
        keywords.push(lines[0].slice(0, 25).toUpperCase());
      } else {
        brandName = 'Official Voucher';
        keywords.push('COUPON');
      }
    }

    // Voucher action keywords
    if (cleanText.includes('SCRATCH')) {
      keywords.push('SCRATCH');
    } else if (cleanText.includes('WIN')) {
      keywords.push('WIN');
    } else if (cleanText.includes('VOUCHER')) {
      keywords.push('VOUCHER');
    } else if (cleanText.includes('REWARD')) {
      keywords.push('REWARD');
    } else {
      keywords.push('SCRATCH');
    }

    // 5. Code prefix, sample code, code pattern
    let codePrefix = 'NP';
    let sampleCode = 'NP000001';
    let codePattern = '^NP\\d{6}$';

    const codeMatch = upperText.match(/\b([A-Z]{2,5})\s*([0-9]{4,10})\b/);
    if (codeMatch) {
      codePrefix = codeMatch[1].toUpperCase();
      const digits = codeMatch[2];
      sampleCode = `${codePrefix}${digits}`;
      codePattern = `^${codePrefix}\\d{${digits.length}}$`;
    } else {
      const hyphenMatch = upperText.match(/\b([A-Z]{2,5})-([A-Z0-9]{4,10})\b/);
      if (hyphenMatch) {
        codePrefix = hyphenMatch[1].toUpperCase();
        const suffix = hyphenMatch[2];
        sampleCode = `${codePrefix}-${suffix}`;
        codePattern = `^${codePrefix}-[A-Z0-9]{${suffix.length}}$`;
      } else if (decodedQr) {
        const qrCodeMatch = decodedQr.toUpperCase().match(/[?&/]([A-Z]{2,5})([0-9]{4,10})/);
        if (qrCodeMatch) {
          codePrefix = qrCodeMatch[1];
          const digits = qrCodeMatch[2];
          sampleCode = `${codePrefix}${digits}`;
          codePattern = `^${codePrefix}\\d{${digits.length}}$`;
        }
      }
    }

    const templateName = `${brandName} - Scratch Card`;
    const description = `Official ${brandName} Scratch & Win card with QR code and ${codePrefix} serial number`;

    return {
      name: templateName,
      description,
      codePrefix,
      codePattern,
      sampleCode,
      requiredKeywords: Array.from(new Set(keywords)),
      minKeywordMatches: Math.max(2, keywords.length),
      qrCodeMatch: qrDomain,
      detectedQr: decodedQr || undefined,
      rawText: combinedOcrText.slice(0, 300),
    };
  }

  /**
   * Cleans up worker process on application shutdown
   */
  public static async terminate(): Promise<void> {
    if (this.workerInstance) {
      await this.workerInstance.terminate();
      this.workerInstance = null;
      this.initPromise = null;
    }
  }
}
