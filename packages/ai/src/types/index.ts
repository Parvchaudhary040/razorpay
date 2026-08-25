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