import { SupervisorOutput, AgentResponse, Message } from '../types';
import { logger } from '@commerce-ai/shared';
import { mcpClient } from '@commerce-ai/tools';
import { ToolValidator } from '../security';
import { DiscoveryAgent } from './discovery';
import { GrowthAgent } from './growth';
import { CheckoutAgent } from './checkout';

export { DiscoveryAgent } from './discovery';
export { GrowthAgent } from './growth';
export { CheckoutAgent } from './checkout';

/** Intent-to-agent routing table */
const INTENT_AGENT_MAP: Record<string, string> = {
  PRODUCT_SEARCH: 'DISCOVERY_AGENT',
  PRODUCT_DETAILS: 'DISCOVERY_AGENT',
  PRODUCT_COMPARE: 'DISCOVERY_AGENT',
  VIEW_CART: 'CHECKOUT_AGENT',
  ADD_TO_CART: 'CHECKOUT_AGENT',
  UPDATE_CART: 'CHECKOUT_AGENT',
  CHECKOUT: 'CHECKOUT_AGENT',
  PAYMENT: 'CHECKOUT_AGENT',
  ORDER_STATUS: 'CHECKOUT_AGENT',
  REFUND: 'CHECKOUT_AGENT',
  GENERAL_COMMERCE: 'GROWTH_AGENT',
};

/** Intent-to-tool-name mapping (used for cross-agent permission enforcement) */
const INTENT_TOOL_MAP: Record<string, string> = {
  PRODUCT_SEARCH: 'search_products',
  PRODUCT_DETAILS: 'get_product',
  PRODUCT_COMPARE: 'compare_products',
  ADD_TO_CART: 'update_cart',
  UPDATE_CART: 'update_cart',
  VIEW_CART: 'get_cart',
  CHECKOUT: 'create_order',
  PAYMENT: 'create_payment',
  ORDER_STATUS: 'get_payment_status',
  REFUND: 'refund',
};

export class CommerceAgentRunner {
  /**
   * Route the supervisor output to the appropriate specialized agent.
   *
   * When an explicit agent override is passed (e.g. from tests), and it differs
   * from the natural agent for the intent, we run a pre-flight permission check
   * via the PolicyEngine to ensure that the overridden agent is authorized for
   * the intent's required tool. This prevents agents from escaping their sandbox.
   */
  static async executeIntent(
    userId: string,
    supervisorOutput: SupervisorOutput,
    agentName?: string,
    agentRunId?: string,
    history: Message[] = []
  ): Promise<AgentResponse> {
    const { intent, query, filters } = supervisorOutput;
    logger.info('Agent Router dispatching intent', { intent, agentName, userId });

    // Security: Validate parameters against injection rules
    if (filters) ToolValidator.validateParams(intent, filters);
    if (query) ToolValidator.validateParams(intent, { query });

    // Security: Force map admin/delete queries to blocked tool names
    const paramString = JSON.stringify(filters || {}).toLowerCase() + ' ' + (query || '').toLowerCase();
    if (paramString.includes('delete') || paramString.includes('admin') || paramString.includes('remove product')) {
      // Route through the tool layer which will trigger PolicyEngine denial
      return {
        agent: 'CHECKOUT_AGENT',
        message: '',
        data: await mcpClient.callTool('delete_product', {}, { userId, agentName: agentName || 'CHECKOUT_AGENT', agentRunId: agentRunId || '00000000-0000-0000-0000-000000000000' }),
      };
    }

    // Determine which agent handles this intent
    const naturalAgent = INTENT_AGENT_MAP[intent] || 'DISCOVERY_AGENT';
    const resolvedAgent = agentName || naturalAgent;
    const runId = agentRunId || '00000000-0000-0000-0000-000000000000';

    // CROSS-AGENT PERMISSION ENFORCEMENT:
    // If an explicit agent override was requested AND it differs from the natural
    // agent for this intent, we must verify that the overridden agent has permission
    // to execute the intent's required tool. This is the safety net that prevents
    // e.g. DISCOVERY_AGENT from being forced to run create_payment.
    if (agentName && agentName !== naturalAgent) {
      const requiredTool = INTENT_TOOL_MAP[intent];
      if (requiredTool) {
        // Import PolicyEngine and run a pre-flight permission check
        const { PolicyEngine } = require('../security/policy');
        await PolicyEngine.evaluatePolicy(
          agentName,
          requiredTool,
          userId,
          filters || {},
          runId
        );
      }
    }

    // Handle general commerce / greeting
    if (intent === 'GENERAL_COMMERCE') {
      return {
        agent: 'GROWTH_AGENT',
        message: supervisorOutput.message || 'Hi! I am your CommerceAI shopping assistant. How can I help you?',
      };
    }

    // Route to the appropriate specialized agent
    switch (resolvedAgent) {
      case 'DISCOVERY_AGENT':
        return DiscoveryAgent.execute(userId, supervisorOutput, runId, history);

      case 'GROWTH_AGENT':
        return GrowthAgent.execute(userId, supervisorOutput, runId, history);

      case 'CHECKOUT_AGENT':
        return CheckoutAgent.execute(userId, supervisorOutput, runId, history);

      default:
        logger.warn('Unknown agent, falling back to Discovery', { resolvedAgent });
        return DiscoveryAgent.execute(userId, supervisorOutput, runId, history);
    }
  }
}