export type SupervisorIntent =
  | 'PRODUCT_SEARCH'
  | 'PRODUCT_DETAILS'
  | 'PRODUCT_COMPARE'
  | 'ADD_TO_CART'
  | 'VIEW_CART'
  | 'UPDATE_CART'
  | 'CHECKOUT'
  | 'PAYMENT'
  | 'ORDER_STATUS'
  | 'REFUND'
  | 'GENERAL_COMMERCE';

export interface SupervisorOutput {
  intent: SupervisorIntent;
  query?: string;
  filters?: Record<string, any>;
  message?: string;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: string;
}

export interface ConversationState {
  userId: string;
  messages: Message[];
  metadata?: Record<string, any>;
}

export interface AgentWorkflowState {
  runId: string;
  userId: string;
  intent?: SupervisorIntent;
  extractedQuery?: string;
  filters?: Record<string, any>;
  supervisorMessage?: string;
  toolResults?: any[];
  agentResponse?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export type AgentName = 'DISCOVERY_AGENT' | 'GROWTH_AGENT' | 'CHECKOUT_AGENT';

export interface AgentResponse {
  /** The agent that produced this response */
  agent: AgentName;
  /** Human-friendly message from the agent */
  message: string;
  /** Raw tool result data */
  data?: any;
  /** Product suggestions or recommendations (Growth Agent) */
  suggestions?: Array<{
    productId: string;
    name: string;
    price: number;
    reason: string;
  }>;
  /** Whether the user must explicitly confirm before proceeding (Checkout Agent) */
  requiresConfirmation?: boolean;
  /** Context for a pending confirmation (order summary, total, etc.) */
  confirmationContext?: {
    action: 'CREATE_ORDER' | 'CREATE_PAYMENT';
    summary: string;
    totalAmount: number;
    itemCount: number;
    cartId: string;
  };
}

export interface CheckoutConfirmationState {
  userId: string;
  action: 'CREATE_ORDER' | 'CREATE_PAYMENT';
  totalAmount: number;
  itemCount: number;
  cartId: string;
  createdAt: string;
}