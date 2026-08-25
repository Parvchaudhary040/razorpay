import { getGeminiModel } from '../models';
import { SUPERVISOR_SYSTEM_PROMPT } from '../prompts';
import { SupervisorOutput, SupervisorIntent } from '../types';
import { logger } from '@commerce-ai/shared';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

/** Rule-based Intent Classifier (Used as a fallback when Gemini is down or fails) */
export function ruleBasedFallbackClassifier(input: string): SupervisorOutput {
  const normalized = input.toLowerCase().trim();
  
  let intent: SupervisorIntent = 'GENERAL_COMMERCE';
  let query = '';
  let message = 'Processing your request...';

  if (normalized.includes('compare') || normalized.includes(' vs ')) {
    intent = 'PRODUCT_COMPARE';
    message = 'Comparing products for you...';
  } else if (normalized.includes('add') && normalized.includes('cart')) {
    intent = 'ADD_TO_CART';
    message = 'Adding product to your cart...';
  } else if (normalized.includes('view') && normalized.includes('cart') || normalized.includes('show') && normalized.includes('cart') || normalized === 'cart') {
    intent = 'VIEW_CART';
    message = 'Retrieving your shopping cart...';
  } else if (normalized.includes('remove') && normalized.includes('cart') || normalized.includes('delete') && normalized.includes('cart') || normalized.includes('update') && normalized.includes('cart') || normalized.includes('quantity')) {
    intent = 'UPDATE_CART';
    message = 'Updating your cart...';
  } else if (normalized.includes('checkout') || normalized.includes('place') && normalized.includes('order')) {
    intent = 'CHECKOUT';
    message = 'Preparing checkout details...';
  } else if (normalized.includes('pay') || normalized.includes('payment') || normalized.includes('razorpay')) {
    intent = 'PAYMENT';
    message = 'Initiating payment options...';
  } else if (normalized.includes('status') || normalized.includes('track') || normalized.includes('where is my order')) {
    intent = 'ORDER_STATUS';
    message = 'Checking your order status...';
  } else if (normalized.includes('refund')) {
    intent = 'REFUND';
    message = 'Handling your refund query...';
  } else if (normalized.includes('detail') || normalized.includes('info') || normalized.includes('spec') || normalized.includes('specs')) {
    intent = 'PRODUCT_DETAILS';
    message = 'Fetching product specifications...';
  } else if (
    normalized.includes('search') || 
    normalized.includes('find') || 
    normalized.includes('laptop') || 
    normalized.includes('phone') || 
    normalized.includes('headphone') || 
    normalized.includes('keyboard') || 
    normalized.includes('mouse') || 
    normalized.includes('monitor')
  ) {
    intent = 'PRODUCT_SEARCH';
    query = normalized.replace('search', '').replace('find', '').trim();
    message = 'Searching catalog for products...';
  } else {
    intent = 'GENERAL_COMMERCE';
    message = 'Hi! I am your CommerceAI shopping assistant. How can I help you?';
  }

  // Parse potential product IDs (UUID format) from query
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuids = normalized.match(uuidRegex);
  const filters: Record<string, any> = {};

  if (uuids && uuids.length > 0) {
    if (intent === 'PRODUCT_COMPARE') {
      filters.ids = uuids;
    } else if (intent === 'ADD_TO_CART' || intent === 'PRODUCT_DETAILS') {
      filters.productId = uuids[0];
      filters.quantity = 1;
    }
  }

  return {
    intent,
    query: query || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    message,
  };
}

export class CommerceSupervisor {
  /** Classify user input using Gemini Pro, fallback to rule-based parser on failures */
  static async classifyIntent(
    input: string,
    history: { role: 'user' | 'model'; content: string }[] = []
  ): Promise<SupervisorOutput> {
    try {
      // 1. Get Gemini Model instance
      const model = getGeminiModel();

      // 2. Prepare LangChain messages
      const messages = [
        new SystemMessage(SUPERVISOR_SYSTEM_PROMPT),
        ...history.map(msg => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content) 
            : new AIMessage(msg.content)
        ),
        new HumanMessage('<user_message>\n' + input + '\n</user_message>')
      ];

      // 3. Query the model
      const response = await model.invoke(messages);
      const outputText = response.content as string;

      // 4. Validate and Parse Structured Output
      return this.parseAndValidateOutput(outputText, input);
    } catch (err: any) {
      logger.warn('Gemini Supervisor failed. Falling back to Rule-Based Classifier.', {
        error: err.message,
        input,
      });
      return ruleBasedFallbackClassifier(input);
    }
  }

  /** Safe output validation and cleanup helper */
  private static parseAndValidateOutput(text: string, originalInput: string): SupervisorOutput {
    try {
      // Strip potential markdown JSON code block wrappers
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        const matches = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
          cleaned = matches[1].trim();
        }
      }

      const parsed = JSON.parse(cleaned) as SupervisorOutput;

      // Ensure required intent field is present and correct
      const allowedIntents: SupervisorIntent[] = [
        'PRODUCT_SEARCH',
        'PRODUCT_DETAILS',
        'PRODUCT_COMPARE',
        'ADD_TO_CART',
        'VIEW_CART',
        'UPDATE_CART',
        'CHECKOUT',
        'PAYMENT',
        'ORDER_STATUS',
        'REFUND',
        'GENERAL_COMMERCE'
      ];

      if (!parsed.intent || !allowedIntents.includes(parsed.intent)) {
        throw new Error(`Invalid intent returned: ${parsed.intent}`);
      }

      return parsed;
    } catch (err: any) {
      logger.warn('Failed to parse Gemini JSON output. Trying fallback.', {
        error: err.message,
        rawOutput: text,
      });
      return ruleBasedFallbackClassifier(originalInput);
    }
  }
}