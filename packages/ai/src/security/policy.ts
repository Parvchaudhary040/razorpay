import { ForbiddenError, ValidationError, logger } from '@commerce-ai/shared';
import { pool } from '@commerce-ai/database';

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
   * Evaluates if the agent can execute the tool and records decisions and audit logs.
   */
  static async evaluatePolicy(
    agentName: string,
    toolName: string,
    userId: string,
    params: Record<string, any>,
    agentRunId: string
  ): Promise<void> {
    logger.info(`Policy Engine evaluating execution request`, { agentName, toolName, userId, params, agentRunId });

    // 1. Identify and authenticate agent name format
    const uppercaseAgent = agentName.toUpperCase();
    if (!AGENT_PERMISSIONS[uppercaseAgent]) {
      await this.logDecision(userId, agentRunId, uppercaseAgent, toolName, 'DENIED', `Unknown agent: ${uppercaseAgent}`, params);
      throw new ValidationError(`Security violation: Unknown agent name '${agentName}'`);
    }

    // 2. Check for admin/delete operations block first to enforce general sandboxing
    if (
      toolName.toLowerCase().includes('admin') || 
      toolName.toLowerCase().includes('delete_product') || 
      toolName.toLowerCase().includes('delete')
    ) {
      await this.logDecision(userId, agentRunId, uppercaseAgent, toolName, 'DENIED', `Blocked admin operation for ${uppercaseAgent}`, params);
      throw new ForbiddenError(`Access denied: Agent ${uppercaseAgent} cannot perform admin operations`);
    }

    // 3. Check agent permissions against predefined allowlist
    const allowedTools = AGENT_PERMISSIONS[uppercaseAgent];
    if (!allowedTools.includes(toolName)) {
      await this.logDecision(
        userId,
        agentRunId,
        uppercaseAgent,
        toolName,
        'DENIED',
        `Agent ${uppercaseAgent} does not have permission to run tool ${toolName}`,
        params
      );
      throw new ForbiddenError(
        `Access denied: Agent ${uppercaseAgent} is not permitted to execute tool ${toolName}`
      );
    }

    // 4. Record successful validation audit log
    await this.logDecision(userId, agentRunId, uppercaseAgent, toolName, 'ALLOWED', 'Access approved by Policy Engine', params);
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
      // 1. Create audit log event
      const auditQuery = `
        INSERT INTO audit_logs (user_id, event_type, actor, action_details)
        VALUES ($1, $2, $3, $4)
      `;
      await pool.query(auditQuery, [
        userId,
        `AGENT_EXECUTE_TOOL`,
        `agent`,
        JSON.stringify({ toolName, agentName, decision, reason }),
      ]);

      // 2. Insert decision row
      const policyQuery = `
        INSERT INTO policy_decisions (agent_run_id, policy_name, decision, reasoning, context)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(policyQuery, [
        agentRunId,
        `Agent:${agentName}:Tool:${toolName}`,
        decision,
        reason,
        JSON.stringify(params),
      ]);
    } catch (err: any) {
      logger.error('Failed to write policy decision/audit logs to database', { error: err.message });
    }
  }
}