import { Request, Response } from 'express';
import { z } from 'zod';
import { CouponTemplate } from '../models/CouponTemplate';
import { OcrService } from '../services/ocrService';
import { logger } from '../utils/logger';

const templateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters').max(120),
  description: z.string().max(300).optional(),
  codePrefix: z.string().min(1, 'Code prefix is required').max(10),
  codePattern: z.string().min(2, 'Code pattern regex is required').default('^NP\\d{6}$'),
  sampleCode: z.string().min(2, 'Sample code is required').max(32),
  requiredKeywords: z.array(z.string()).min(1, 'At least one required brand keyword is needed'),
  minKeywordMatches: z.coerce.number().min(1).default(1),
  qrCodeMatch: z.string().optional(),
  isActive: z.boolean().default(true),
});

export class AdminTemplateController {
  /**
   * Get all coupon card templates
   */
  public static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await CouponTemplate.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('Failed to fetch coupon templates:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve coupon templates.' });
    }
  }

  /**
   * Create a new coupon card template
   */
  public static async createTemplate(req: Request, res: Response): Promise<void> {
    const parseResult = templateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    try {
      const templateData = parseResult.data;

      // Validate regex syntax
      try {
        new RegExp(templateData.codePattern);
      } catch {
        res.status(400).json({
          success: false,
          error: 'Invalid regular expression syntax for codePattern.',
        });
        return;
      }

      const template = await CouponTemplate.create({
        ...templateData,
        codePrefix: templateData.codePrefix.toUpperCase().trim(),
        sampleCode: templateData.sampleCode.toUpperCase().trim(),
        requiredKeywords: templateData.requiredKeywords.map((k) => k.toUpperCase().trim()).filter(Boolean),
      });

      logger.info(`Admin created new coupon template: ${template.name} (Prefix: ${template.codePrefix})`);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Coupon template created successfully.',
      });
    } catch (error: any) {
      logger.error('Failed to create coupon template:', error);
      res.status(500).json({ success: false, error: 'Failed to create coupon template.' });
    }
  }

  /**
   * Update an existing coupon card template
   */
  public static async updateTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const parseResult = templateSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.issues.map((i) => i.message).join(', '),
      });
      return;
    }

    try {
      const updateData = parseResult.data;

      if (updateData.codePattern) {
        try {
          new RegExp(updateData.codePattern);
        } catch {
          res.status(400).json({
            success: false,
            error: 'Invalid regular expression syntax for codePattern.',
          });
          return;
        }
      }

      if (updateData.codePrefix) updateData.codePrefix = updateData.codePrefix.toUpperCase().trim();
      if (updateData.sampleCode) updateData.sampleCode = updateData.sampleCode.toUpperCase().trim();
      if (updateData.requiredKeywords) {
        updateData.requiredKeywords = updateData.requiredKeywords.map((k) => k.toUpperCase().trim()).filter(Boolean);
      }

      const updated = await CouponTemplate.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) {
        res.status(404).json({ success: false, error: 'Template not found.' });
        return;
      }

      logger.info(`Admin updated coupon template: ${updated.name}`);
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Coupon template updated successfully.',
      });
    } catch (error) {
      logger.error('Failed to update coupon template:', error);
      res.status(500).json({ success: false, error: 'Failed to update coupon template.' });
    }
  }

  /**
   * Toggle template active/inactive status
   */
  public static async toggleTemplateStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const template = await CouponTemplate.findById(id);
      if (!template) {
        res.status(404).json({ success: false, error: 'Template not found.' });
        return;
      }

      template.isActive = !template.isActive;
      await template.save();

      logger.info(`Admin toggled template ${template.name} active status to: ${template.isActive}`);
      res.status(200).json({
        success: true,
        data: template,
        message: `Template ${template.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      logger.error('Failed to toggle template status:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle template status.' });
    }
  }

  /**
   * Delete a coupon card template
   */
  public static async deleteTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const deleted = await CouponTemplate.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Template not found.' });
        return;
      }

      logger.info(`Admin deleted coupon template: ${deleted.name}`);
      res.status(200).json({
        success: true,
        message: 'Coupon template deleted successfully.',
      });
    } catch (error) {
      logger.error('Failed to delete coupon template:', error);
      res.status(500).json({ success: false, error: 'Failed to delete coupon template.' });
    }
  }

  /**
   * Auto-detect coupon template parameters directly from an uploaded sample card image
   */
  public static async autoDetectFromImage(req: Request, res: Response): Promise<void> {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({
        success: false,
        error: 'Please upload a clear sample coupon card image.',
      });
      return;
    }

    try {
      logger.info(`Admin initiated AI auto-detection on sample coupon card: ${req.file.originalname}`);
      const features = await OcrService.autoDetectTemplateFeatures(req.file.buffer);

      res.status(200).json({
        success: true,
        data: features,
        message: 'Coupon card analyzed successfully! AI detected template parameters.',
      });
    } catch (error: any) {
      logger.warn('AI auto-detection warning:', error.message);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to analyze coupon card image.',
      });
    }
  }
}

