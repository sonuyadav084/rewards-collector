import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

export interface AuditParams {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetReference?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  public static async logAction(params: AuditParams): Promise<void> {
    try {
      await AuditLog.create({
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetReference: params.targetReference,
        beforeState: params.beforeState,
        afterState: params.afterState,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error('Failed to persist audit log entry:', err);
    }
  }
}

