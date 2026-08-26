import { ForbiddenError, ValidationError, PolicyError, logger } from '@commerce-ai/shared';
import { pool } from '@commerce-ai/database';
import { AuditLogger } from '@commerce-ai/database';
import { WorkflowEventType } from '@commerce-ai/shared';

import { CacheManager } from '@commerce-ai/database';
import crypto from 'crypto';

export const AGENT_PERMISSIONS: Record<string, string[]> = {
  DISCOVERY_AGENT: ['search_products', 'get_product', 'compare_products'],
  GROWTH_AGENT: ['search_products', 'get_product', 'get_cart'],
  CHECKOUT_AGENT: [
    'get_cart',
    'create_cart',
    'update_cart',
    'create_order',
    'create_payment',
    'get_payment_status',
  ],
};

export class PolicyEngine {
  /**
   * Deterministic Policy Evaluator
   * Evaluates all security boundaries, purchase limits, explicit confirmations,
   * ownership rules, inventory levels, refund limits, and suspicious activity checks.
   */
  static async evaluatePolicy(
    agentName: string,
    toolName: string,
    userId: string,
    params: Record<string, any>,
    agentRunId: string
  ): Promise<void> {
    logger.info(`Policy Engine evaluating execution request`, { agentName, toolName, userId, params, agentRunId });

    const uppercaseAgent = agentName.toUpperCase();
    let decision: 'ALLOWED' | 'DENIED' = 'DENIED';
    let policyName = `Policy:${toolName}`;
    let reasoning = '';

    try {
      // 1. Identify and authenticate agent name format
      if (!AGENT_PERMISSIONS[uppercaseAgent]) {
        reasoning = `Unknown agent: ${uppercaseAgent}`;
        throw new ValidationError(`Security violation: Unknown agent name '${agentName}'`);
      }

      // 2. Check for admin/delete operations block first to enforce general sandboxing
      if (
        toolName.toLowerCase().includes('admin') || 
        toolName.toLowerCase().includes('delete_product') || 
        toolName.toLowerCase().includes('delete')
      ) {
        reasoning = `Blocked admin operation for ${uppercaseAgent}`;
        throw new ForbiddenError(`Access denied: Agent ${uppercaseAgent} cannot perform admin operations`);
      }

      // 3. Check agent permissions against predefined allowlist
      const allowedTools = AGENT_PERMISSIONS[uppercaseAgent];
      if (!allowedTools.includes(toolName)) {
        reasoning = `Agent ${uppercaseAgent} does not have permission to run tool ${toolName}`;
        throw new ForbiddenError(
          `Access denied: Agent ${uppercaseAgent} is not permitted to execute tool ${toolName}`
        );
      }

      // 4. Idempotency protection for sensitive operations (create_order, create_payment, refund)
      if (['create_order', 'create_payment', 'refund'].includes(toolName)) {
        const hashInput = `${userId}:${toolName}:${JSON.stringify(params)}:${agentRunId}`;
        const fingerprint = params.idempotencyKey || crypto
          .createHash('sha256')
          .update(hashInput)
          .digest('hex');
        

        // Check database for an existing duplicate ALLOWED policy decision within the last 30 seconds
        const duplicateCheck = await pool.query(
          `SELECT 1 FROM policy_decisions 
           WHERE context->>'fingerprint' = $1 
             AND decision = 'ALLOWED' 
             AND created_at > NOW() - INTERVAL '30 seconds'`,
          [fingerprint]
        );

        if (duplicateCheck.rows.length > 0) {
          reasoning = 'DUPLICATE_TRANSACTION: Duplicate transaction detected';
          throw new PolicyError(reasoning);
        }

        // Add fingerprint to params context so it is saved in policy_decisions
        params.fingerprint = fingerprint;
      }

      // 5. Suspicious/repeated transaction checks (limit to 3 successful orders/payments per minute per user)
      if (['create_order', 'create_payment'].includes(toolName)) {
        const rateCheck = await pool.query(
          `SELECT COUNT(*) FROM policy_decisions pd
           JOIN agent_runs ar ON pd.agent_run_id = ar.id
           WHERE ar.user_id = $1
             AND pd.policy_name IN ('Policy:create_order', 'Policy:create_payment')
             AND pd.decision = 'ALLOWED'
             AND pd.created_at > NOW() - INTERVAL '1 minute'`,
          [userId]
        );

        if (Number(rateCheck.rows[0].count) >= 3) {
          reasoning = 'SUSPICIOUS_ACTIVITY: Too many transactions within a short window';
          throw new PolicyError(reasoning);
        }
      }

      // 6. Explicit user confirmation gate (create_order, create_payment, refund)
      if (['create_order', 'create_payment', 'refund'].includes(toolName)) {
        const confirmedKey = `checkout_approved_execution:${userId}`;
        const isConfirmed = await CacheManager.get<boolean>(confirmedKey);
        
        if (!isConfirmed) {
          reasoning = 'BLOCKED: Transaction blocked: User confirmation required';
          throw new PolicyError(reasoning);
        }
        
        // Single-use token: consume it immediately
        await CacheManager.del(confirmedKey);
      }

      // 7. Inventory availability check (for create_order)
      if (toolName === 'create_order') {
        const stockCheck = await pool.query(
          `SELECT ci.quantity, i.stock_count, p.name
           FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.id
           JOIN products p ON ci.product_id = p.id
           JOIN inventory i ON p.id = i.product_id
           WHERE c.user_id = $1 AND c.status = 'ACTIVE'`,
          [userId]
        );

        for (const row of stockCheck.rows) {
          if (row.quantity > row.stock_count) {
            reasoning = `Insufficient inventory stock for product: ${row.name}`;
            throw new ValidationError(reasoning);
          }
        }
      }

      // 8. Order/Payment resource ownership check
      if (toolName === 'create_payment') {
        const orderId = params.orderId;
        if (!orderId) {
          reasoning = 'Order ID required';
          throw new ValidationError(reasoning);
        }
        const ownerRes = await pool.query('SELECT user_id FROM orders WHERE id = $1', [orderId]);
        if (ownerRes.rows.length === 0 || ownerRes.rows[0].user_id !== userId) {
          reasoning = 'Access denied: You do not own this order';
          throw new ForbiddenError(reasoning);
        }
      }

      if (['get_payment_status', 'refund'].includes(toolName)) {
        const paymentId = params.paymentId;
        if (!paymentId) {
          reasoning = 'Payment ID required';
          throw new ValidationError(reasoning);
        }
        const ownerRes = await pool.query(
          'SELECT o.user_id FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.id = $1',
          [paymentId]
        );
        if (ownerRes.rows.length === 0 || ownerRes.rows[0].user_id !== userId) {
          reasoning = 'Access denied: You do not own this payment resource';
          throw new ForbiddenError(reasoning);
        }
      }

      // 9. User purchase limits (Limit: ₹50,000)
      let transactionAmount = 0;
      if (toolName === 'create_order') {
        const cartTotalRes = await pool.query(
          `SELECT COALESCE(SUM(p.price * ci.quantity), 0) as total
           FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.id
           JOIN products p ON ci.product_id = p.id
           WHERE c.user_id = $1 AND c.status = 'ACTIVE'`,
          [userId]
        );
        transactionAmount = Number(cartTotalRes.rows[0].total);
      } else if (toolName === 'create_payment') {
        transactionAmount = Number(params.amount || 0);
      }

      if (transactionAmount > 50000) {
        reasoning = 'REQUIRES_APPROVAL: Transaction exceeds configured user limit';
        throw new PolicyError(reasoning);
      }

      // 10. Refund limits (amount cannot exceed original payment amount)
      if (toolName === 'refund') {
        const refundAmount = Number(params.amount || 0);
        const paymentRes = await pool.query('SELECT amount FROM payments WHERE id = $1', [params.paymentId]);
        if (paymentRes.rows.length === 0 || refundAmount > Number(paymentRes.rows[0].amount)) {
          reasoning = 'Refund amount exceeds original payment amount';
          throw new ValidationError(reasoning);
        }
      }

      // APPROVED / ALLOWED
      decision = 'ALLOWED';
      reasoning = 'Access approved by Policy Engine';
      await this.logDecision(userId, agentRunId, uppercaseAgent, toolName, decision, reasoning, params);

    } catch (err: any) {
      decision = 'DENIED';
      await this.logDecision(userId, agentRunId, uppercaseAgent, toolName, decision, reasoning || err.message, params);
      throw err;
    }
  }

  /** Logs decision entry in policy_decisions and audit_logs tables */
  private static async logDecision(
    userId: string,
    agentRunId: string,
    agentName: string,
    toolName: string,
    decision: 'ALLOWED' | 'DENIED',
    reason: string,
    params: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Create centralized audit log event
      await AuditLogger.logEvent(userId, WorkflowEventType.POLICY_CHECK, 'system', {
        agent_run_id: agentRunId,
        tool: toolName,
        agent: agentName,
        policy_decision: decision,
        reasoning: reason,
        safe_metadata: params
      });

      // 2. Insert decision row
      const policyQuery = `
        INSERT INTO policy_decisions (agent_run_id, policy_name, decision, reasoning, context)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(policyQuery, [
        agentRunId,
        `Policy:${toolName}`,
        decision,
        reason,
        JSON.stringify(params),
      ]);
    } catch (err: any) {
      logger.error('Failed to write policy decision/audit logs to database', { error: err.message });
    }
  }
}