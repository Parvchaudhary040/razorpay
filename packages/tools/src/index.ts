import { z } from 'zod';
import { pool } from '@commerce-ai/database';
import { ProductService } from '@commerce-ai/catalog';
import { CartService } from '@commerce-ai/cart';
import { ValidationError, ForbiddenError, NotFoundError, logger, loadConfig } from '@commerce-ai/shared';
import { AuditLogger } from '@commerce-ai/database';
import { WorkflowEventType } from '@commerce-ai/shared';

import Razorpay from 'razorpay';

const config = loadConfig();
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

// Predefined Zod Input Schemas for all 10 Tools
export const ToolSchemas = {
  search_products: z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
  }),
  get_product: z.object({
    productId: z.string().uuid(),
  }),
  compare_products: z.object({
    ids: z.array(z.string().uuid()).min(2).max(4),
  }),
  create_cart: z.object({}),
  get_cart: z.object({}),
  update_cart: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().nonnegative(),
  }),
  create_order: z.object({}),
  create_payment: z.object({
    orderId: z.string().uuid(),
    amount: z.number().positive(),
  }),
  get_payment_status: z.object({
    paymentId: z.string().uuid(),
  }),
  refund: z.object({
    paymentId: z.string().uuid(),
    amount: z.number().positive(),
  }),
};

export interface ToolDefinition {
  name: string;
  description: string;
  allowedAgents: string[];
}

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  search_products: {
    name: 'search_products',
    description: 'Search catalog products with query keyword, category, and price range filters.',
    allowedAgents: ['DISCOVERY_AGENT', 'GROWTH_AGENT', 'CHECKOUT_AGENT'],
  },
  get_product: {
    name: 'get_product',
    description: 'Fetch detailed information of a specific product by its ID.',
    allowedAgents: ['DISCOVERY_AGENT', 'GROWTH_AGENT'],
  },
  compare_products: {
    name: 'compare_products',
    description: 'Compare detailed features of 2 to 4 products side-by-side.',
    allowedAgents: ['DISCOVERY_AGENT'],
  },
  create_cart: {
    name: 'create_cart',
    description: 'Create a new active shopping cart session for the customer.',
    allowedAgents: ['CHECKOUT_AGENT'],
  },
  get_cart: {
    name: 'get_cart',
    description: 'View the items and total value of the active shopping cart.',
    allowedAgents: ['GROWTH_AGENT', 'CHECKOUT_AGENT'],
  },
  update_cart: {
    name: 'update_cart',
    description: 'Add items or update item quantity in the shopping cart (0 to remove).',
    allowedAgents: ['CHECKOUT_AGENT'],
  },
  create_order: {
    name: 'create_order',
    description: 'Create a pending order from all items in the user\'s active shopping cart.',
    allowedAgents: ['CHECKOUT_AGENT'],
  },
  create_payment: {
    name: 'create_payment',
    description: 'Register payment details and initiate Razorpay payment checkout for a pending order.',
    allowedAgents: ['CHECKOUT_AGENT'],
  },
  get_payment_status: {
    name: 'get_payment_status',
    description: 'Check the status of a specific payment transaction.',
    allowedAgents: ['CHECKOUT_AGENT'],
  },
  refund: {
    name: 'refund',
    description: 'Initiate a refund for a previously captured payment.',
    allowedAgents: [], // No agents allowed - requires administrative intervention
  },
};

export class CommerceToolLayer {
  /**
   * Safe Tool Executor
   * Implements strict validation, deterministic routing, authorization checks,
   * resource ownership, and audit trail insertion.
   */
  static async execute(
    toolName: string,
    userId: string,
    params: any,
    agentName: string,
    agentRunId: string
  ): Promise<any> {
    try {
      const result = await this._executeInternal(toolName, userId, params, agentName, agentRunId);
      
      // AUDIT LOG: TOOL_COMPLETED
      await AuditLogger.logEvent(userId, WorkflowEventType.TOOL_COMPLETED, 'system', {
        agent_run_id: agentRunId,
        tool: toolName,
        agent: agentName,
        status: 'SUCCESS'
      });

      return result;
    } catch (err: any) {
      // AUDIT LOG: TOOL_COMPLETED (FAILED)
      await AuditLogger.logEvent(userId, WorkflowEventType.TOOL_COMPLETED, 'system', {
        agent_run_id: agentRunId,
        tool: toolName,
        agent: agentName,
        status: 'FAILED',
        error: err.message
      });
      throw err;
    }
  }

  static async _executeInternal(
    toolName: string,
    userId: string,
    params: any,
    agentName: string,
    agentRunId: string
  ): Promise<any> {
    logger.info(`Executing tool: ${toolName}`, { toolName, userId, params, agentName, agentRunId });

    // AUDIT LOG: TOOL_CALLED
    await AuditLogger.logEvent(userId, WorkflowEventType.TOOL_CALLED, 'system', {
      agent_run_id: agentRunId,
      tool: toolName,
      agent: agentName,
      safe_metadata: params
    });

    // 1. Authenticate user & identify agent permission check first (Security Rule: Check permissions before input validation)
    const { PolicyEngine } = require('@commerce-ai/ai/dist/security/policy');
    
    // AUDIT LOG: TOOL_AUTHORIZATION (pre-policy check)
    await AuditLogger.logEvent(userId, WorkflowEventType.TOOL_AUTHORIZATION, 'system', {
      agent_run_id: agentRunId,
      tool: toolName,
      agent: agentName
    });

    await PolicyEngine.evaluatePolicy(agentName, toolName, userId, params, agentRunId);

    // 2. Check if tool exists in registry
    const tool = TOOL_REGISTRY[toolName];
    if (!tool) {
      throw new ValidationError(`Security violation: Attempted invocation of unknown tool '${toolName}'`);
    }

    // 3. Validate input parameters using predefined Zod schemas
    const parsedParams = (ToolSchemas as any)[toolName].safeParse(params);
    if (!parsedParams.success) {
      logger.warn(`Zod parameter validation failed for tool: ${toolName}`, { errors: parsedParams.error });
      throw new ValidationError(`Invalid tool parameters: ${parsedParams.error.message}`);
    }

    // 4. Create action audit record
    try {
      await pool.query(
        'INSERT INTO audit_logs (user_id, event_type, actor, action_details) VALUES ($1, $2, $3, $4)',
        [
          userId,
          `TOOL_EXECUTE_${toolName.toUpperCase()}`,
          'agent',
          JSON.stringify({ agentName, agentRunId, params: parsedParams.data }),
        ]
      );
    } catch (auditErr: any) {
      logger.error('Tool layer failed to write audit trail logs', { error: auditErr.message });
    }

    // 5. Execute secure pre-parameterized database or service actions
    try {
      switch (toolName) {
        case 'search_products': {
          const { query, category, minPrice, maxPrice } = parsedParams.data;
          if (query) {
            return await ProductService.searchProducts(query, { category, minPrice, maxPrice });
          }
          return await ProductService.listProducts(1, 10, category, minPrice, maxPrice);
        }

        case 'get_product': {
          const { productId } = parsedParams.data;
          const product = await ProductService.getProductById(productId);
          if (!product) throw new NotFoundError('Product not found');
          return product;
        }

        case 'compare_products': {
          const { ids } = parsedParams.data;
          return await ProductService.compareProducts(ids);
        }

        case 'create_cart': {
          return await CartService.getCart(userId);
        }

        case 'get_cart': {
          return await CartService.getCart(userId);
        }

        case 'update_cart': {
          const { productId, quantity } = parsedParams.data;
          if (quantity === 0) {
            return await CartService.removeCartItem(userId, productId);
          }
          return await CartService.addItemToCart(userId, productId, quantity);
        }

        case 'create_order': {
          const cart = await CartService.getCart(userId);
          if (cart.items.length === 0) {
            throw new ValidationError('Your cart is empty');
          }

          // Compute cart totals and verify inventory
          let total = 0;
          for (const item of cart.items) {
            const product = await ProductService.getProductById(item.productId);
            if (!product) throw new NotFoundError(`Product ${item.productId} not found`);
            if (product.inventoryCount < item.quantity) {
              throw new ValidationError(`Insufficient inventory stock for product: ${product.name}`);
            }
            total += Number(item.price) * item.quantity;
          }

          // PostgreSQL Transaction to create order safely
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            const orderRes = await client.query(
              'INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3) RETURNING *',
              [userId, 'PENDING', total]
            );
            const order = orderRes.rows[0];

            for (const item of cart.items) {
              await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, item.price]
              );
              // Decrement product inventory stock count
              await client.query(
                'UPDATE inventory SET stock_count = stock_count - $1 WHERE product_id = $2',
                [item.quantity, item.productId]
              );
            }

            await client.query('COMMIT');
            
            // Clear cart & invalidate cache
            await CartService.clearCart(userId);
            return order;
          } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
          } finally {
            client.release();
          }
        }

        case 'create_payment': {
          const { orderId } = parsedParams.data;
          const { PaymentService } = require('@commerce-ai/api/dist/services/paymentService');
          
          // PaymentService.createPayment inherently validates ownership and uses row-level locking
          return await PaymentService.createPayment(userId, orderId);
        }

        case 'get_payment_status': {
          const { paymentId } = parsedParams.data;
          
          // Resource ownership check: Order owner must match user
          const paymentQuery = `
            SELECT p.*, o.user_id 
            FROM payments p 
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = $1
          `;
          const paymentRes = await pool.query(paymentQuery, [paymentId]);
          if (paymentRes.rows.length === 0) {
            throw new NotFoundError('Payment not found');
          }
          const payment = paymentRes.rows[0];
          if (payment.user_id !== userId) {
            throw new ForbiddenError('Access denied: You do not own this payment resource');
          }

          return {
            paymentId: payment.id,
            orderId: payment.order_id,
            status: payment.status,
            amount: payment.amount,
            updatedAt: payment.updated_at,
          };
        }

        case 'refund': {
          const { paymentId, amount } = parsedParams.data;
          
          // Resource ownership check: Order owner must match user
          const paymentQuery = `
            SELECT p.*, o.user_id, o.id as order_id 
            FROM payments p 
            JOIN orders o ON p.order_id = o.id 
            WHERE p.id = $1
          `;
          const paymentRes = await pool.query(paymentQuery, [paymentId]);
          if (paymentRes.rows.length === 0) {
            throw new NotFoundError('Payment not found');
          }
          const payment = paymentRes.rows[0];
          if (payment.user_id !== userId) {
            throw new ForbiddenError('Access denied: You do not own this payment resource');
          }

          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            
            // Update payment state to REFUNDED
            const pRes = await client.query(
              'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
              ['REFUNDED', paymentId]
            );
            
            // Update order state to REFUNDED
            await client.query(
              'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
              ['REFUNDED', payment.order_id]
            );

            await client.query('COMMIT');
            return pRes.rows[0];
          } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
          } finally {
            client.release();
          }
        }

        default:
          throw new ValidationError(`Unknown tool handler: ${toolName}`);
      }
    } catch (err: any) {
      logger.error(`Error executing tool: ${toolName}`, { error: err.message });
      throw err;
    }
  }
}
export * from './mcp';
