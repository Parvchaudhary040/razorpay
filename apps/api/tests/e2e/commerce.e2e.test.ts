import request from 'supertest';
import { app } from '../../src/app';
import { pool, testConnection } from '@commerce-ai/database';
import { v4 as uuidv4 } from 'uuid';

describe('CommerceAI E2E Scenario Tests', () => {
  let authToken: string;
  let testUser = {
    name: 'E2E Test User',
    email: `e2e-${uuidv4()}@test.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    await testConnection();
    // Register User
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    authToken = res.body.accessToken;
  });

  afterAll(async () => {
    // Cleanup test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  it('1. Register Customer -> Done in beforeAll', () => {
    expect(authToken).toBeDefined();
  });

  it('2. Search for best laptop under 70000 with 16GB RAM for coding', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Find me the best laptop under ₹70,000 with at least 16GB RAM for coding.', agent: 'DISCOVERY_AGENT' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('PRODUCT_SEARCH');
    expect(res.body.data.agent).toBe('Discovery Agent');
    expect(res.body.data.result).toBeDefined();
    expect(Array.isArray(res.body.data.result.data)).toBe(true);
  });

  it('3. Add the Lenovo laptop to cart', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Add the Lenovo laptop 123e4567-e89b-12d3-a456-426614174000 to my cart.', agent: 'CHECKOUT_AGENT' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('ADD_TO_CART');
    expect(res.body.data.agent).toBe('Checkout Agent');
    expect(res.body.data.result).toBeDefined(); // Cart returned
  });

  it('4. Buy it (Checkout flow -> Confirmation needed)', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Buy it.', agent: 'CHECKOUT_AGENT' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresConfirmation).toBe(true);
    expect(res.body.data.confirmationContext).toBeDefined();
  });

  it('5. Confirm checkout (Executes Order & Payment)', async () => {
    const res = await request(app)
      .post('/api/ai/chat/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe('CHECKOUT_CONFIRMED');
    
    const paymentResult = res.body.data.result;
    expect(paymentResult).toBeDefined();
    expect(paymentResult.status).toBe('CREATED');
    expect(paymentResult.amount).toBeGreaterThan(0);
  });
});
