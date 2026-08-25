import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';
import { CacheManager } from '@commerce-ai/database';
import { CheckoutAgent } from '@commerce-ai/ai';
import { CartService } from '@commerce-ai/cart';
import { CommerceToolLayer } from '@commerce-ai/tools';

describe('Deterministic Policy Engine & Verification Tests', () => {
  let customerToken: string;
  let customerId: string;
  let otherToken: string;
  let otherId: string;
  let cheapProductId: string;
  let expensiveProductId: string;

  async function createAgentRun(userId: string): Promise<string> {
    const res = await pool.query(
      "INSERT INTO agent_runs (user_id, status) VALUES ($1, 'RUNNING') RETURNING id",
      [userId]
    );
    return res.rows[0].id;
  }

  beforeAll(async () => {
    // Clean test users
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['policy_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['policy_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['policy_%']);

    // Register test customer 1
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'policy_cust1@example.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = registerRes.body.accessToken;
    customerId = registerRes.body.user.id;

    // Register test customer 2 (other user)
    const registerRes2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'policy_cust2@example.com', password: 'password123', role: 'CUSTOMER' });
    otherToken = registerRes2.body.accessToken;
    otherId = registerRes2.body.user.id;

    // Retrieve or insert a cheap product
    const cheapRes = await pool.query('SELECT id FROM products WHERE price <= 5000 LIMIT 1');
    if (cheapRes.rows.length > 0) {
      cheapProductId = cheapRes.rows[0].id;
    } else {
      const insertCheap = await pool.query(
        `INSERT INTO products (merchant_id, name, description, price, category, specifications) 
         VALUES ('a1111111-1111-1111-1111-111111111111', 'Cheap Test Item', 'A cheap item', 100, 'laptops', '{}') 
         RETURNING id`
      );
      cheapProductId = insertCheap.rows[0].id;
      await pool.query('INSERT INTO inventory (product_id, stock_count) VALUES ($1, 100)', [cheapProductId]);
    }

    // Retrieve or insert an expensive product
    const expensiveRes = await pool.query('SELECT id FROM products WHERE price > 50000 LIMIT 1');
    if (expensiveRes.rows.length > 0) {
      expensiveProductId = expensiveRes.rows[0].id;
    } else {
      const insertExp = await pool.query(
        `INSERT INTO products (merchant_id, name, description, price, category, specifications) 
         VALUES ('a1111111-1111-1111-1111-111111111111', 'Expensive Test Item', 'An expensive item', 60000, 'laptops', '{}') 
         RETURNING id`
      );
      expensiveProductId = insertExp.rows[0].id;
      await pool.query('INSERT INTO inventory (product_id, stock_count) VALUES ($1, 100)', [expensiveProductId]);
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['policy_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['policy_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['policy_%']);
  });

  describe('1. Agent Permissions Allowlist enforcement', () => {
    it('should allow DISCOVERY_AGENT to search products', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'search for keyboards',
          agent: 'DISCOVERY_AGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent).toBe('PRODUCT_SEARCH');
    });

    it('should reject DISCOVERY_AGENT attempting to execute create_payment', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'pay for my order',
          agent: 'DISCOVERY_AGENT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject CHECKOUT_AGENT attempting to perform admin operations', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'search delete product ab431e60-2d73-4585-9f15-fd4f90502062',
          agent: 'CHECKOUT_AGENT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Explicit User Confirmation Policy', () => {
    it('should block Checkout Agent order execution if not explicitly confirmed', async () => {
      // Clear cart, add a product, then try to checkout directly
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [customerId]);
      await CacheManager.del(`cart:${customerId}`);
      
      const addRes = await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: cheapProductId, quantity: 1 });
      expect(addRes.status).toBe(200);

      // Directly confirming without pending token should fail
      await CacheManager.del(`checkout_confirm:${customerId}`);
      const confirmRes = await request(app)
        .post('/api/ai/chat/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.message).toContain('No pending checkout found');
    });
  });

  describe('3. User Purchase Limits Policy', () => {
    it('should block orders exceeding ₹50,000 and return REQUIRES_APPROVAL', async () => {
      // Clear cart
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [customerId]);
      await CacheManager.del(`cart:${customerId}`);

      // Add expensive product (> ₹50,000)
      await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: expensiveProductId, quantity: 1 });

      // Trigger checkout intent
      const checkoutRes = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'checkout my cart',
          agent: 'CHECKOUT_AGENT',
        });
      expect(checkoutRes.status).toBe(200);

      // Try confirming. The policy engine should enforce limit and return 403 POLICY_VIOLATION
      const confirmRes = await request(app)
        .post('/api/ai/chat/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(confirmRes.status).toBe(403);
      expect(confirmRes.body.success).toBe(false);
      expect(confirmRes.body.error.code).toBe('POLICY_VIOLATION');
      expect(confirmRes.body.error.message).toContain('REQUIRES_APPROVAL: Transaction exceeds configured user limit');
    });

    it('should allow orders under ₹50,000', async () => {
      // Clear cart
      await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)', [customerId]);
      await CacheManager.del(`cart:${customerId}`);

      // Add cheap product
      await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: cheapProductId, quantity: 1 });

      // Trigger checkout
      const checkoutRes = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'checkout my cart',
          agent: 'CHECKOUT_AGENT',
        });
      expect(checkoutRes.status).toBe(200);

      // Confirm checkout
      const confirmRes = await request(app)
        .post('/api/ai/chat/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.result.status).toBe('PENDING');
    });
  });

  describe('4. Order Ownership & Resource Access Control', () => {
    it('should prevent user from initiating payment on another user\'s order', async () => {
      // Create order for user 1 (done in the previous test)
      const orderRes = await pool.query('SELECT id FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [customerId]);
      const user1OrderId = orderRes.rows[0].id;

      // User 2 (otherToken) attempts to confirm payment for User 1's order
      const agentRunId = await createAgentRun(otherId);
      await CacheManager.set(`checkout_approved_execution:${otherId}`, true, 5);

      // Calling tools directly through CommerceToolLayer is the correct security boundary check
      await expect(
        CommerceToolLayer.execute(
          'create_payment',
          otherId,
          { orderId: user1OrderId, amount: 1000 },
          'CHECKOUT_AGENT',
          agentRunId
        )
      ).rejects.toThrow(/Access denied: You do not own this order/);

      // Clean token
      await CacheManager.del(`checkout_approved_execution:${otherId}`);
    });
  });

  describe('5. Inventory Availability Checks', () => {
    it('should block order creation if item quantity exceeds available stock', async () => {
      // Clear cart
      const cart = await CartService.getCart(customerId);
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
      await CacheManager.del(`cart:${customerId}`);

      // Set product stock count to 2
      await pool.query('UPDATE inventory SET stock_count = 2 WHERE product_id = $1', [cheapProductId]);

      // Add 5 items directly to cart
      await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 5)',
        [cart.id, cheapProductId]
      );
      // Invalidate cart cache!
      await CacheManager.del(`cart:${customerId}`);

      const agentRunId = await createAgentRun(customerId);

      // Set checkout approval token
      const pendingState = {
        userId: customerId,
        action: 'CREATE_ORDER' as const,
        totalAmount: 500,
        itemCount: 5,
        cartId: cart.id,
        createdAt: new Date().toISOString()
      };
      await CacheManager.set(`checkout_confirm:${customerId}`, pendingState, 300);
      await CacheManager.set(`checkout_approved_execution:${customerId}`, true, 5);

      // Call CheckoutAgent.confirmCheckout directly
      await expect(
        CheckoutAgent.confirmCheckout(customerId, agentRunId)
      ).rejects.toThrow(/Insufficient inventory stock/);

      // Reset stock count
      await pool.query('UPDATE inventory SET stock_count = 100 WHERE product_id = $1', [cheapProductId]);
    });
  });

  describe('6. Idempotency Protection Policy', () => {
    it('should reject duplicate identical tool executions within 30 seconds', async () => {
      const cart = await CartService.getCart(customerId);
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
      await CacheManager.del(`cart:${customerId}`);

      await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 1)',
        [cart.id, cheapProductId]
      );
      await CacheManager.del(`cart:${customerId}`);

      const pendingState = {
        userId: customerId,
        action: 'CREATE_ORDER' as const,
        totalAmount: 100,
        itemCount: 1,
        cartId: cart.id,
        createdAt: new Date().toISOString()
      };

      const agentRunId = await createAgentRun(customerId);

      // Confirm 1
      await CacheManager.set(`checkout_confirm:${customerId}`, pendingState, 300);
      await CacheManager.set(`checkout_approved_execution:${customerId}`, true, 5);
      const res1 = await CheckoutAgent.confirmCheckout(customerId, agentRunId);
      expect(res1.data).toBeDefined();

      // Confirm 2 immediately with same params and same agentRunId (simulates duplicate submission in same flow)
      await CacheManager.set(`checkout_confirm:${customerId}`, pendingState, 300);
      await CacheManager.set(`checkout_approved_execution:${customerId}`, true, 5);
      await expect(
        CheckoutAgent.confirmCheckout(customerId, agentRunId)
      ).rejects.toThrow(/Duplicate transaction detected/);
    });
  });

  describe('7. Suspicious Activity (Repeated Transactions) Policy', () => {
    it('should block if more than 3 successful checkouts occur within 1 minute', async () => {
      const mockCheckout = async (priceOffset: number) => {
        const cart = await CartService.getCart(customerId);
        await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
        await CacheManager.del(`cart:${customerId}`);

        await pool.query(
          'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 1)',
          [cart.id, cheapProductId]
        );
        await CacheManager.del(`cart:${customerId}`);
        
        const pendingState = {
          userId: customerId,
          action: 'CREATE_ORDER' as const,
          totalAmount: 100 + priceOffset, // vary the fingerprint to avoid duplicate policy block
          itemCount: 1,
          cartId: cart.id,
          createdAt: new Date().toISOString()
        };
        
        const runId = await createAgentRun(customerId);
        await CacheManager.set(`checkout_confirm:${customerId}`, pendingState, 300);
        await CacheManager.set(`checkout_approved_execution:${customerId}`, true, 5);
        await CheckoutAgent.confirmCheckout(customerId, runId);
      };

      // Clear policy decisions history to clean test
      await pool.query('DELETE FROM policy_decisions');

      // Perform 3 successful checkouts with slight variations and distinct agent runs
      await mockCheckout(1);
      await mockCheckout(2);
      await mockCheckout(3);

      // Checkout 4 should trigger repeated transaction rate block
      const cart = await CartService.getCart(customerId);
      await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
      await CacheManager.del(`cart:${customerId}`);

      await pool.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 1)',
        [cart.id, cheapProductId]
      );
      await CacheManager.del(`cart:${customerId}`);

      const pendingState = {
        userId: customerId,
        action: 'CREATE_ORDER' as const,
        totalAmount: 104,
        itemCount: 1,
        cartId: cart.id,
        createdAt: new Date().toISOString()
      };
      
      const runId = await createAgentRun(customerId);
      await CacheManager.set(`checkout_confirm:${customerId}`, pendingState, 300);
      await CacheManager.set(`checkout_approved_execution:${customerId}`, true, 5);
      await expect(
        CheckoutAgent.confirmCheckout(customerId, runId)
      ).rejects.toThrow(/Too many transactions/);
    });
  });
});