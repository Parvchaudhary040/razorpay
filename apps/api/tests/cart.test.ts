import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';

describe('Cart Service Integration & Cache Invalidation Tests', () => {
  let customerToken: string;
  let customerId: string;
  let testProductId: string; // From seeded data

  beforeAll(async () => {
    // Clean test users & carts
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['cart_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['cart_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['cart_%']);

    // Register a test customer
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'cart_test_cust@example.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = registerRes.body.accessToken;
    customerId = registerRes.body.user.id;

    // Fetch a real seeded product ID from database
    const productRes = await pool.query('SELECT id FROM products LIMIT 1');
    testProductId = productRes.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['cart_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['cart_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['cart_%']);
    // We do NOT close the pool here to avoid ending the pool for other test files running in band.
  });

  describe('GET /api/carts', () => {
    it('should return a clean active cart with no items for a new user', async () => {
      const res = await request(app)
        .get('/api/carts')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(customerId);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.totalAmount).toBe(0);
    });
  });

  describe('POST /api/carts/items', () => {
    it('should add a product to the cart and return updated totals', async () => {
      const res = await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProductId,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].productId).toBe(testProductId);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.totalAmount).toBeGreaterThan(0);
    });

    it('should reject quantity larger than inventory stock count', async () => {
      const res = await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProductId,
          quantity: 99999, // exceeds stock limit
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Insufficient stock');
    });
  });

  describe('PATCH /api/carts/items/:productId', () => {
    it('should update item quantity in cart', async () => {
      const res = await request(app)
        .patch(`/api/carts/items/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(3);
    });
  });

  describe('DELETE /api/carts/items/:productId', () => {
    it('should delete a product item from cart', async () => {
      const res = await request(app)
        .delete(`/api/carts/items/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(0);
      expect(res.body.data.totalAmount).toBe(0);
    });
  });

  describe('DELETE /api/carts', () => {
    it('should clear all items from the cart', async () => {
      // Add first
      await request(app)
        .post('/api/carts/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: testProductId, quantity: 1 });

      // Clear
      const res = await request(app)
        .delete('/api/carts')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(0);
    });
  });
});