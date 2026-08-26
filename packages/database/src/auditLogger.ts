import { pool } from './pool';
import { AuditUtils, WorkflowEventType, AuditEventPayload, logger } from '@commerce-ai/shared';

export class AuditLogger {
  static async logEvent(
    userId: string | null,
    eventType: WorkflowEventType,
    actor: 'user' | 'agent' | 'system' | 'webhook',
    payload: AuditEventPayload,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Safely mask all incoming telemetry
      const safePayload = AuditUtils.maskSensitiveData(payload);

      const query = `
        INSERT INTO audit_logs (user_id, event_type, actor, action_details, ip_address)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await pool.query(query, [
        userId,
        eventType,
        actor,
        JSON.stringify(safePayload),
        ipAddress || null
      ]);

      // Emit structured log for observability tools
      logger.info(`Audit Log: ${eventType}`, { userId, actor, ...safePayload });
    } catch (err: any) {
      // Do not block application flow if audit logging fails, but log the system error
      logger.error('Failed to write audit log to database', { error: err.message, eventType });
    }
  }
}