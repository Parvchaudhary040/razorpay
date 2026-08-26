import { Router } from 'express';
import { CommerceSupervisor, CommerceAgentRunner, AIStateManager, ToolValidator, CheckoutAgent } from '@commerce-ai/ai';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { aiLimiter } from '../middleware/security';
import { ValidationError } from '@commerce-ai/shared';
import { pool } from '@commerce-ai/database';
import { AuditLogger } from '@commerce-ai/database';
import { WorkflowEventType } from '@commerce-ai/shared';


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
    const history = conversation.messages;
    const historyForSupervisor = history.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: msg.content,
    }));

    // 4. Classify intent and extract parameters using supervisor
    const supervisorOutput = await CommerceSupervisor.classifyIntent(message, historyForSupervisor);

    // AUDIT LOG: AGENT_SELECTED
    await AuditLogger.logEvent(userId, WorkflowEventType.AGENT_SELECTED, 'agent', {
      agent_run_id: agentRunId,
      intent: supervisorOutput.intent,
      extracted_query: supervisorOutput.query,
      filters: supervisorOutput.filters
    });

    // 5. Execute through the specialized agent pipeline
    const agentResponse = await CommerceAgentRunner.executeIntent(
      userId,
      supervisorOutput,
      agent,
      agentRunId,
      history
    );

    // 6. Persist the interaction in conversation history
    await AIStateManager.appendMessage(userId, 'user', message);
    await AIStateManager.appendMessage(
      userId,
      'model',
      JSON.stringify({
        agent: agentResponse.agent,
        intent: supervisorOutput.intent,
        message: agentResponse.message,
        hasResult: !!agentResponse.data,
        requiresConfirmation: agentResponse.requiresConfirmation || false,
      })
    );

    // 7. Mark agent run session completed
    await pool.query(
      'UPDATE agent_runs SET status = $1, updated_at = NOW() WHERE id = $2',
      ['COMPLETED', agentRunId]
    );

    res.status(200).json({
      success: true,
      data: {
        agent: agentResponse.agent,
        intent: supervisorOutput.intent,
        extractedQuery: supervisorOutput.query,
        filters: supervisorOutput.filters,
        message: agentResponse.message,
        result: agentResponse.data,
        suggestions: agentResponse.suggestions,
        requiresConfirmation: agentResponse.requiresConfirmation || false,
        confirmationContext: agentResponse.confirmationContext,
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

/**
 * POST /api/ai/chat/confirm — Confirm a pending checkout or payment action.
 *
 * This endpoint is the ONLY way to execute order creation or payment initiation
 * after the Checkout Agent has presented a confirmation prompt. The confirmation
 * state is stored in Redis with a 5-minute TTL and is single-use.
 */
aiRouter.post('/chat/confirm', async (req: AuthenticatedRequest, res, next) => {
  let agentRunId: string | undefined;
  try {
    const { userId } = req.user!;

    // 1. Create audit context
    const runRes = await pool.query(
      'INSERT INTO agent_runs (user_id, status) VALUES ($1, $2) RETURNING id',
      [userId, 'RUNNING']
    );
    agentRunId = runRes.rows[0].id;

    // 2. Execute the confirmed action through the Checkout Agent
    const agentResponse = await CheckoutAgent.confirmCheckout(userId, agentRunId!);

    // 3. Persist confirmation in conversation history
    await AIStateManager.appendMessage(userId, 'user', '[USER_CONFIRMED_CHECKOUT]');
    await AIStateManager.appendMessage(
      userId,
      'model',
      JSON.stringify({
        agent: agentResponse.agent,
        intent: 'CHECKOUT_CONFIRMED',
        message: agentResponse.message,
        hasResult: !!agentResponse.data,
      })
    );

    // 4. Mark agent run completed
    await pool.query(
      'UPDATE agent_runs SET status = $1, updated_at = NOW() WHERE id = $2',
      ['COMPLETED', agentRunId]
    );

    res.status(200).json({
      success: true,
      data: {
        agent: agentResponse.agent,
        message: agentResponse.message,
        result: agentResponse.data,
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