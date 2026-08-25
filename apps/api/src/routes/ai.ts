import { Router } from 'express';
import { CommerceSupervisor, CommerceAgentRunner, AIStateManager, ToolValidator } from '@commerce-ai/ai';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { aiLimiter } from '../middleware/security';
import { ValidationError } from '@commerce-ai/shared';
import { pool } from '@commerce-ai/database';

export const aiRouter = Router();

// Apply auth middleware and rate limiting to all AI endpoints
aiRouter.use(authenticate);
aiRouter.use(aiLimiter);

/** POST /api/ai/chat — Talk to the AI shopping assistant with agent session tracking */
aiRouter.post('/chat', async (req: AuthenticatedRequest, res, next) => {
  let agentRunId: string | undefined;
  try {
    const { userId } = req.user!;
    const { message, agent } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new ValidationError('Message cannot be empty');
    }

    // 1. Create audit context for agent run session
    const runRes = await pool.query(
      'INSERT INTO agent_runs (user_id, status) VALUES ($1, $2) RETURNING id',
      [userId, 'RUNNING']
    );
    agentRunId = runRes.rows[0].id;

    // 2. Proactive Prompt Injection defense on incoming user input
    ToolValidator.detectPromptInjection(message, 'user');

    // 3. Get previous conversation history (up to last 20 messages from cache)
    const conversation = await AIStateManager.getConversation(userId);
    const history = conversation.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: msg.content,
    }));

    // 4. Classify intent and extract parameters using supervisor
    const supervisorOutput = await CommerceSupervisor.classifyIntent(message, history);

    // 5. Execute corresponding action using our business tools (Catalog, Cart, etc.)
    let toolResult: any = null;
    let executionError: string | null = null;
    try {
      toolResult = await CommerceAgentRunner.executeIntent(userId, supervisorOutput, agent, agentRunId);
    } catch (err: any) {
      if (err.statusCode || err.code || err instanceof ValidationError) {
        throw err;
      }
      executionError = err.message;
    }

    // 6. Formulate the agent's friendly text response
    let finalMessage = supervisorOutput.message || 'I have completed your request.';
    if (executionError) {
      finalMessage = `I encountered an issue: ${executionError}`;
    } else if (supervisorOutput.intent === 'PRODUCT_SEARCH' && Array.isArray(toolResult)) {
      finalMessage = `I found ${toolResult.length} products matching your request.`;
    } else if (supervisorOutput.intent === 'ADD_TO_CART') {
      finalMessage = 'I have added the item to your cart.';
    }

    // 7. Persist the interaction in conversation history
    await AIStateManager.appendMessage(userId, 'user', message);
    await AIStateManager.appendMessage(
      userId,
      'model',
      JSON.stringify({
        intent: supervisorOutput.intent,
        message: finalMessage,
        hasResult: !!toolResult && !executionError,
      })
    );

    // 8. Mark agent run session completed
    await pool.query(
      'UPDATE agent_runs SET status = $1, updated_at = NOW() WHERE id = $2',
      ['COMPLETED', agentRunId]
    );

    res.status(200).json({
      success: true,
      data: {
        intent: supervisorOutput.intent,
        extractedQuery: supervisorOutput.query,
        filters: supervisorOutput.filters,
        result: toolResult,
        message: finalMessage,
      },
    });
  } catch (err) {
    if (agentRunId) {
      await pool.query(
        'UPDATE agent_runs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['FAILED', agentRunId]
      ).catch(() => {});
    }
    next(err);
  }
});