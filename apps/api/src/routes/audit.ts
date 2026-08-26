import { Router } from 'express';
import { pool } from '@commerce-ai/database';
import { authenticate } from '../middleware/auth';

export const auditRouter = Router();

// Endpoint to fetch grouped audit logs
auditRouter.get('/logs', authenticate, async (req, res, next) => {
  try {
    const { runId } = req.query;

    let query = `
      SELECT id, user_id, event_type, actor, action_details, created_at
      FROM audit_logs
    `;
    const queryParams: any[] = [];

    if (runId) {
      query += ` WHERE action_details->>'agent_run_id' = $1`;
      queryParams.push(runId);
    }

    query += ` ORDER BY created_at DESC LIMIT 500`;

    const { rows } = await pool.query(query, queryParams);

    // Group logs by agent_run_id if not filtered by a specific run
    const groupedLogs = rows.reduce((acc: any, log: any) => {
      const details = typeof log.action_details === 'string' ? JSON.parse(log.action_details) : log.action_details;
      const agentRunId = details?.agent_run_id || 'untracked';
      
      if (!acc[agentRunId]) {
        acc[agentRunId] = [];
      }
      acc[agentRunId].push({
        id: log.id,
        userId: log.user_id,
        eventType: log.event_type,
        actor: log.actor,
        timestamp: log.created_at,
        details
      });
      return acc;
    }, {});

    res.json({ success: true, data: groupedLogs });
  } catch (err) {
    next(err);
  }
});