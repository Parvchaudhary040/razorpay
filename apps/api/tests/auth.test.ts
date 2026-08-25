import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';
import jwt from 'jsonwebtoken';
import { loadConfig } from '@commerce-ai/shared';

const config = loadConfig();

describe('Authentication & Authorization Tests', () => {
  let customerAToken: string;
  let customerBToken: string;
  let merchantAToken: string;
  let adminToken: string;
  
  let customerAId: string;
  let customerBId: string;
  let merchantAId: string;

  let orderAId: string;
  let productAId: string;
  
  const testMerchantAId = 'e1111111-1111-1111-1111-111111111111'; // matching seed merchant

  beforeAll(async () => {
    // Clear test tables to avoid conflicts
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM merchants WHERE email LIKE $1', ['test%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test%']);

    // 1. Register Customer A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_cust_a@example.com', password: 'password123', role: 'CUSTOMER' });
    customerAToken = resA.body.accessToken;
    customerAId = resA.body.user.id;

    // 2. Register Customer B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_cust_b@example.com', password: 'password123', role: 'CUSTOMER' });
    customerBToken = resB.body.accessToken;
    customerBId = resB.body.user.id;

    // 3. Register Merchant A
    const resM = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_merch_a@example.com', password: 'password123', role: 'MERCHANT' });
    merchantAToken = resM.body.accessToken;
    merchantAId = resM.body.user.id;

    // 4. Register Admin
    const resAdmin = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test_admin@example.com', password: 'password123', role: 'ADMIN' });
    adminToken = resAdmin.body.accessToken;

    // Create an order owned by Customer A for testing ownership checks
    const orderRes = await pool.query(
      'INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3) RETURNING id',
      [customerAId, 'PENDING', 250.00]
    );
    orderAId = orderRes.rows[0].id;

    // Retrieve a product ID from seed data
    const prodRes = await pool.query('SELECT id FROM products LIMIT 1');
    productAId = prodRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM merchants WHERE email LIKE $1', ['test%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test%']);
    // await pool.end();
  });

  // --- Registration Tests ---
  describe('POST /api/auth/register', () => {
    it('should successfully register a new customer', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test_register@example.com', password: 'password123', role: 'CUSTOMER' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test_register@example.com');
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test_cust_a@example.com', password: 'password123', role: 'CUSTOMER' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- Login Tests ---
  describe('POST /api/auth/login', () => {
    it('should successfully log in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test_cust_a@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test_cust_a@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // --- Exired & Token Verification Tests ---
  describe('Token Expiration & Verification', () => {
    it('should reject expired access tokens', async () => {
      // Create a token expired 1 hour ago
      const expiredToken = jwt.sign(
        { sub: customerAId, role: 'CUSTOMER', sessionId: 'mock-session' },
        config.jwt.secret,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Token has expired');
    });

    it('should reject malformed or missing tokens', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid token');
    });
  });

  // --- Access Control / RBAC Tests ---
  describe('Authorization and RBAC Rules', () => {
    it('should grant access to admin-only endpoint for ADMIN role', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('should block customer role accessing admin-only endpoint', async () => {
      const res = await request(app)
        .get('/api/test/admin-only')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should grant customer access to their own order', async () => {
      const res = await request(app)
        .get(`/api/test/orders/${orderAId}`)
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });

    it("should block customer from accessing another customer's order", async () => {
      const res = await request(app)
        .get(`/api/test/orders/${orderAId}`)
        .set('Authorization', `Bearer ${customerBToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('You do not own this order');
    });

    it("should block merchant from accessing another merchant's product", async () => {
      // Merchant A tries to access product A using an arbitrary other merchant ID in header
      const res = await request(app)
        .get(`/api/test/merchants/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .set('x-test-merchant-id', 'e1111111-1111-1111-1111-111111111112'); // different merchant ID
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('You do not own this product');
    });

    it('should allow merchant to access their own product', async () => {
      // Merchant A accesses product A with correct merchant ID matching seed
      const res = await request(app)
        .get(`/api/test/merchants/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .set('x-test-merchant-id', testMerchantAId); // matching seed merchant ID
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
  });
});
