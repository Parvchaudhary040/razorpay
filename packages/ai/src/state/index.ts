import { CacheManager } from '@commerce-ai/database';
import { ConversationState, AgentWorkflowState, Message } from '../types';
import { logger } from '@commerce-ai/shared';

export class AIStateManager {
  /** Get conversation state for a user */
  static async getConversation(userId: string): Promise<ConversationState> {
    const key = `conversation:${userId}`;
    const cached = await CacheManager.get<ConversationState>(key);
    if (cached) return cached;

    // Return default clean conversation state if cache miss
    return {
      userId,
      messages: [],
    };
  }

  /** Save conversation state with 30 minutes expiration (1800 seconds) */
  static async saveConversation(state: ConversationState): Promise<void> {
    const key = `conversation:${state.userId}`;
    await CacheManager.set(key, state, 1800);
  }

  /** Append message to conversation history */
  static async appendMessage(userId: string, role: 'user' | 'model' | 'system', content: string): Promise<ConversationState> {
    const state = await this.getConversation(userId);
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    state.messages.push(newMessage);
    
    // Keep only last 20 messages to avoid context window swelling
    if (state.messages.length > 20) {
      state.messages = state.messages.slice(state.messages.length - 20);
    }
    
    await this.saveConversation(state);
    return state;
  }

  /** Get short-lived agent workflow run state */
  static async getWorkflowState(runId: string): Promise<AgentWorkflowState | null> {
    const key = `agent_workflow:${runId}`;
    return CacheManager.get<AgentWorkflowState>(key);
  }

  /** Save agent workflow state with 10 minutes expiration (600 seconds) */
  static async saveWorkflowState(state: AgentWorkflowState): Promise<void> {
    const key = `agent_workflow:${state.runId}`;
    await CacheManager.set(key, state, 600);
  }
}