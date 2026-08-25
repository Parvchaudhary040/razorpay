import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';

describe('Specialized Agents (Discovery, Growth, Checkout) Integration Tests', () => {
  let customerToken: string;
  let customerId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Clean test users & carts
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['agent_test_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['agent_test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['agent_test_%']);

    // Register a test customer
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'agent_test_cust@example.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = registerRes.body.accessToken;
    customerId = registerRes.body.user.id;

    // Fetch a real seeded product ID from database
    const productRes = await pool.query('SELECT id FROM products WHERE price <= 50000 LIMIT 1');
    testProductId = productRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['agent_test_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['agent_test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['agent_test_%']);
  });

  describe('Discovery Agent', () => {
    it('should search products and return product data using Discovery Agent', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'search for premium headphones',
          agent: 'DISCOVERY_AGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agent).toBe('DISCOVERY_AGENT');
      expect(res.body.data.intent).toBe('PRODUCT_SEARCH');
      expect(Array.isArray(res.body.data.result)).toBe(true);
    });

    it('should display comparisons for multiple products', async () => {
      // Find two product IDs
      const prodRes = await pool.query('SELECT id FROM products LIMIT 2');
      if (prodRes.rows.length >= 2) {
        const id1 = prodRes.rows[0].id;
        const id2 = prodRes.rows[1].id;
        const res = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            message: `compare product ${id1} and product ${id2}`,
            agent: 'DISCOVERY_AGENT',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.intent).toBe('PRODUCT_COMPARE');
        expect(Array.isArray(res.body.data.result)).toBe(true);
        expect(res.body.data.result.length).toBe(2);
      }
    });
  });

  describe('Growth Agent', () => {
    it('should suggest complementary products when viewing empty cart', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'grettings, do you have any recommendation for me?',
          agent: 'GROWTH_AGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agent).toBe('GROWTH_AGENT');
    });
  });

  describe('Checkout Agent & Confirmation Gate', () => {
    it('should add product to cart through checkout agent', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: `add product ${testProductId} to my cart`,
          agent: 'CHECKOUT_AGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agent).toBe('CHECKOUT_AGENT');
      expect(res.body.data.result.items.length).toBeGreaterThan(0);
    });

    it('should return requiresConfirmation: true and order summary for checkout intent', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'checkout my cart please',
          agent: 'CHECKOUT_AGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresConfirmation).toBe(true);
      expect(res.body.data.confirmationContext).toBeDefined();
      expect(res.body.data.confirmationContext.action).toBe('CREATE_ORDER');
      expect(res.body.data.confirmationContext.totalAmount).toBeGreaterThan(0);
    });

    it('should successfully create order and clear cart ONLY after confirming checkout', async () => {
      // Send confirmation request
      const confirmRes = await request(app)
        .post('/api/ai/chat/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.agent).toBe('CHECKOUT_AGENT');
      expect(confirmRes.body.data.result).toBeDefined();
      expect(confirmRes.body.data.result.status).toBe('PENDING');

      // Cart should be empty now
      const cartRes = await request(app)
        .get('/api/carts')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(cartRes.body.data.items.length).toBe(0);
    });

    it('should return expired/no-confirmation message if confirming when none is pending', async () => {
      const confirmRes = await request(app)
        .post('/api/ai/chat/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.message).toContain('No pending checkout found');
      expect(confirmRes.body.data.result).toBeUndefined();
    });
  });
});