import { SupervisorOutput } from '../types';
import { logger } from '@commerce-ai/shared';
import { CommerceToolLayer } from '@commerce-ai/tools';
import { ToolValidator } from '../security';

export class CommerceAgentRunner {
  /** Execute the corresponding business action by delegating to the secure CommerceToolLayer */
  static async executeIntent(
    userId: string,
    supervisorOutput: SupervisorOutput,
    agentName?: string,
    agentRunId?: string
  ): Promise<any> {
    const { intent, query, filters } = supervisorOutput;
    logger.info("Auditing intent parameters before secure execution", { query, filters });

    // Validate parameters against security injection rules (commands, traversals, URLs)
    if (filters) {
      ToolValidator.validateParams(intent, filters);
    }
    if (query) {
      ToolValidator.validateParams(intent, { query });
    }

    // Map intent to tool name for Policy Engine
    let toolName = 'general_commerce';
    switch (intent) {
      case 'PRODUCT_SEARCH': toolName = 'search_products'; break;
      case 'PRODUCT_DETAILS': toolName = 'get_product'; break;
      case 'PRODUCT_COMPARE': toolName = 'compare_products'; break;
      case 'ADD_TO_CART':
      case 'UPDATE_CART': toolName = 'update_cart'; break;
      case 'VIEW_CART': toolName = 'get_cart'; break;
      case 'CHECKOUT': toolName = 'create_order'; break;
      case 'PAYMENT': toolName = 'create_payment'; break;
      case 'ORDER_STATUS': toolName = 'get_payment_status'; break;
      case 'REFUND': toolName = 'refund'; break;
    }

    // Force map admin/delete queries to admin tool names
    const paramString = JSON.stringify(filters || {}).toLowerCase() + ' ' + (query || '').toLowerCase();
    if (paramString.includes('delete') || paramString.includes('admin') || paramString.includes('remove product')) {
      toolName = 'delete_product';
    }

    if (toolName === 'general_commerce') {
      return {
        action: 'CHAT_RESPONSE',
        message: supervisorOutput.message || 'How can I assist you today?',
      };
    }

    // Determine active agent if not explicitly requested
    let activeAgent = agentName;
    if (!activeAgent) {
      if (['search_products', 'get_product', 'compare_products'].includes(toolName)) {
        activeAgent = 'DISCOVERY_AGENT';
      } else if (toolName === 'get_cart') {
        activeAgent = 'GROWTH_AGENT';
      } else {
        activeAgent = 'CHECKOUT_AGENT';
      }
    }

    // Package parameters for tool call execution
    let params: any = { ...filters };
    if (toolName === 'search_products') {
      params = { query, ...params };
    }

    // Execute via secure Commerce Tool Layer
    return await CommerceToolLayer.execute(
      toolName,
      userId,
      params,
      activeAgent,
      agentRunId || '00000000-0000-0000-0000-000000000000'
    );
  }
}