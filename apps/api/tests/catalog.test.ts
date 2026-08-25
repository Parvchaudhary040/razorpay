import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';

describe('Catalog Service Integration & Ownership Tests', () => {
  let customerToken: string;
  let merchantAToken: string;
  let merchantBToken: string;
  let adminToken: string;

  let merchantAId: string;
  let merchantBId: string;

  let productAId: string;
  let productBId: string;

  // Set up mock merchant UUIDs for tests (will insert into database)
  const merchantA_UUID = 'e1111111-1111-1111-1111-111111111111'; // seeded merchant
  const merchantB_UUID = 'e1111111-1111-1111-1111-111111111112'; // new test merchant

  beforeAll(async () => {
    // Clean test data
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Product%']);
    await pool.query('DELETE FROM products WHERE name LIKE $1', ['Test Product%']);
    await pool.query('DELETE FROM merchants WHERE email LIKE $1', ['catalog_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['catalog_%']);
    await pool.query('DELETE FROM merchants WHERE id = $1', [merchantB_UUID]);

    // Create merchant B row so the foreign key references succeed
    await pool.query(
      'INSERT INTO merchants (id, name, email, description) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [merchantB_UUID, 'Merchant B Corp', 'merch_b@example.com', 'Test merchant B']
    );

    // 1. Register users
    const resCust = await request(app)
      .post('/api/auth/register')
      .send({ email: 'catalog_cust@example.com', password: 'password123', role: 'CUSTOMER' });
    customerToken = resCust.body.accessToken;

    const resMerchA = await request(app)
      .post('/api/auth/register')
      .send({ email: 'catalog_merch_a@example.com', password: 'password123', role: 'MERCHANT' });
    merchantAToken = resMerchA.body.accessToken;
    merchantAId = resMerchA.body.user.id;

    const resMerchB = await request(app)
      .post('/api/auth/register')
      .send({ email: 'catalog_merch_b@example.com', password: 'password123', role: 'MERCHANT' });
    merchantBToken = resMerchB.body.accessToken;
    merchantBId = resMerchB.body.user.id;

    const resAdmin = await request(app)
      .post('/api/auth/register')
      .send({ email: 'catalog_admin@example.com', password: 'password123', role: 'ADMIN' });
    adminToken = resAdmin.body.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE name LIKE $1)', ['Test Product%']);
    await pool.query('DELETE FROM products WHERE name LIKE $1', ['Test Product%']);
    await pool.query('DELETE FROM merchants WHERE email LIKE $1', ['catalog_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['catalog_%']);
    await pool.query('DELETE FROM merchants WHERE id = $1', [merchantB_UUID]);
    // await pool.end();
  });

  describe('Product Creation & Role Protection', () => {
    it('should prevent CUSTOMER from creating a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Product Cust',
          description: 'A product description',
          price: 99.99,
          category: 'laptops',
          initialStock: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow MERCHANT to create a product for their merchant ID', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({
          name: 'Test Product A',
          description: 'Premium product by merchant A',
          price: 1999.00,
          category: 'headphones',
          initialStock: 50,
          merchantId: merchantAId, // using seeded merchant UUID
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Product A');
      productAId = res.body.data.id;
    });

    it('should allow another MERCHANT to create their own product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${merchantBToken}`)
        .send({
          name: 'Test Product B',
          description: 'Premium product by merchant B',
          price: 2499.00,
          category: 'keyboards',
          initialStock: 30,
          merchantId: merchantB_UUID,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      productBId = res.body.data.id;
    });
  });

  describe('Product Fetching, Filtering, & Search', () => {
    it('should allow CUSTOMER to list products with pagination and category filter', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10, category: 'headphones' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('should allow CUSTOMER to search products by keyword', async () => {
      const res = await request(app)
        .get('/api/products/search')
        .query({ q: 'Premium' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should allow CUSTOMER to compare 2 products', async () => {
      const res = await request(app)
        .get('/api/products/compare')
        .query({ ids: `${productAId},${productBId}` });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('Product Updates & Ownership checks', () => {
    it("should prevent MERCHANT from updating another merchant's product", async () => {
      // Merchant A tries to update product B (owned by merchant B)
      const res = await request(app)
        .patch(`/api/products/${productBId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({
          price: 2999.00,
          merchantId: merchantAId, // matching user merchant context
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow MERCHANT to update their own product and inventory stock', async () => {
      // Merchant A updates product A
      const res = await request(app)
        .patch(`/api/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({
          price: 1899.00,
          stockCount: 45,
          merchantId: merchantAId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(1899.00);
      expect(res.body.data.inventoryCount).toBe(45);
    });

    it('should allow ADMIN to update any product', async () => {
      const res = await request(app)
        .patch(`/api/products/${productAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 1799.00,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(1799.00);
    });
  });

  describe('Product Deletion & Ownership checks', () => {
    it("should prevent MERCHANT from deleting another merchant's product", async () => {
      // Merchant A tries to delete product B
      const res = await request(app)
        .delete(`/api/products/${productBId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({
          merchantId: merchantAId,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow MERCHANT to delete their own product', async () => {
      // Merchant A deletes product A
      const res = await request(app)
        .delete(`/api/products/${productAId}`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({
          merchantId: merchantAId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
    it('should allow ADMIN to delete any product', async () => {
      // Admin deletes product B
      const res = await request(app)
        .delete(`/api/products/${productBId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
