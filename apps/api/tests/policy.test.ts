import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';

describe('Deterministic Agent Permission Layer & Policy Engine Tests', () => {
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    // Clean test users
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['policy_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['policy_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['policy_%']);

    // Register test customer
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'policy_cust@example.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = registerRes.body.accessToken;
    customerId = registerRes.body.user.id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['policy_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['policy_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['policy_%']);
  });

  describe('Agent Permissions Allowlist enforcement', () => {
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
          agent: 'DISCOVERY_AGENT', // Discovery Agent cannot create payment!
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('is not permitted to execute tool');
    });

    it('should reject GROWTH_AGENT attempting to execute refund', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'refund my order',
          agent: 'GROWTH_AGENT', // Growth Agent cannot refund!
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('is not permitted to execute');
    });

    it('should reject CHECKOUT_AGENT attempting to perform admin operations', async () => {
      // We manually construct an evaluation test inside the route handler
      // wait, Checkout Agent tries to delete a product or run admin action
      // E.g. trigger delete product through update cart route or chat route
      // Let's call chat route with message matching an admin delete tool
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'search delete product ab431e60-2d73-4585-9f15-fd4f90502062',
          agent: 'CHECKOUT_AGENT', // Checkout Agent cannot perform admin operations!
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('cannot perform admin operations');
    });
  });
});