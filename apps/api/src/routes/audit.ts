import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '@commerce-ai/database';

export const auditRouter = Router();

auditRouter.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const result = await pool.query(
      'SELECT id, event_type as "eventType", actor, action_details as payload, created_at as "createdAt" FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    );
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});