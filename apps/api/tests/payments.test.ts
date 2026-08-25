import request from 'supertest';
import { app } from '../src/app';
import { pool } from '@commerce-ai/database';
import { CartService } from '@commerce-ai/cart';
import crypto from 'crypto';

// 1. Globally mock razorpay library to avoid any external network requests
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: jest.fn().mockImplementation(async (params) => {
          return {
            id: 'order_mock_' + Math.random().toString(36).substring(7),
            amount: params.amount,
            currency: params.currency,
            receipt: params.receipt,
          };
        }),
      },
      payments: {
        fetch: jest.fn().mockImplementation(async (paymentId) => {
          // Extract mock amount from paymentId format pay_mock_X
          const match = paymentId.match(/pay_mock_(\d+)/);
          const amount = match ? parseInt(match[1], 10) : 100000;
          return {
            id: paymentId,
            amount: amount,
            status: 'captured',
            method: 'card',
          };
        }),
      },
    };
  });
});

describe('Razorpay Test Mode Integration & Webhooks Tests', () => {
  let customerAId: string;
  let customerAToken: string;
  let customerBId: string;
  let customerBToken: string;
  let cheapProductId: string;

  beforeAll(async () => {
    // Cleanup existing test data
    await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['pay_test_%']);
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['pay_test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['pay_test_%']);

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ email: 'pay_test_custA@example.com', password: 'password123', role: 'CUSTOMER' });
    customerAToken = resA.body.accessToken;
    customerAId = resA.body.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ email: 'pay_test_custB@example.com', password: 'password123', role: 'CUSTOMER' });
    customerBToken = resB.body.accessToken;
    customerBId = resB.body.user.id;

    // Retrieve or insert a product
    const productRes = await pool.query('SELECT id FROM products LIMIT 1');
    if (productRes.rows.length > 0) {
      cheapProductId = productRes.rows[0].id;
    } else {
      const inserted = await pool.query(
        `INSERT INTO products (merchant_id, name, description, price, category, specifications)
         VALUES ('a1111111-1111-1111-1111-111111111111', 'Payment Test Product', 'Test product', 500, 'electronics', '{}')
         RETURNING id`
      );
      cheapProductId = inserted.rows[0].id;
      await pool.query('INSERT INTO inventory (product_id, stock_count) VALUES ($1, 100)', [cheapProductId]);
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['pay_test_%']);
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['pay_test_%']);
    await pool.query('DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['pay_test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['pay_test_%']);
  });

  async function createOrderForUser(userId: string, quantity = 2): Promise<string> {
    const cart = await CartService.getCart(userId);
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    await CartService.addItemToCart(userId, cheapProductId, quantity);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        "INSERT INTO orders (user_id, status, total_amount) VALUES ($1, 'PENDING', $2) RETURNING id",
        [userId, quantity * 500] // 500 per item
      );
      const orderId = orderRes.rows[0].id;
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, 500)",
        [orderId, cheapProductId, quantity]
      );
      await client.query('COMMIT');
      await CartService.clearCart(userId);
      return orderId;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  describe('1. Create Razorpay Payment Order', () => {
    it('should successfully create a payment order for the owner', async () => {
      const orderId = await createOrderForUser(customerAId);

      const res = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.razorpayOrderId).toBeDefined();
      expect(Number(res.body.data.amount)).toBe(1000); // 2 * 500 = 1000

      // Check order status changed to PAYMENT_PENDING
      const orderRes = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
      expect(orderRes.rows[0].status).toBe('PAYMENT_PENDING');
    });

    it('should block payment creation for unauthorized order (not owned by user)', async () => {
      const orderId = await createOrderForUser(customerAId);

      const res = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ orderId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject payment creation for an already paid order', async () => {
      const orderId = await createOrderForUser(customerAId);
      
      // Update order to PAID in DB directly
      await pool.query("UPDATE orders SET status = 'PAID' WHERE id = $1", [orderId]);

      const res = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already paid');
    });
  });

  describe('2. Verify Razorpay Payment Signature', () => {
    it('should successfully verify a valid payment signature', async () => {
      const orderId = await createOrderForUser(customerAId, 2); // amount = 1000
      
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;
      const razorpayPaymentId = 'pay_mock_100000'; // Matches amount 100000 paise = 1000 INR

      // Generate signature
      const keySecret = 'rzp_test_secret_1234567890';
      const signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: signature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Check payment status updated to CAPTURED
      const paymentRes = await pool.query('SELECT status FROM payments WHERE razorpay_order_id = $1', [razorpayOrderId]);
      expect(paymentRes.rows[0].status).toBe('CAPTURED');

      // Check order status updated to PAID
      const orderRes = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
      expect(orderRes.rows[0].status).toBe('PAID');
    });

    it('should reject verification if payment signature is invalid', async () => {
      const orderId = await createOrderForUser(customerAId, 2);
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_mock_100000',
          razorpay_signature: 'invalid_garbage_signature_hash',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid payment signature');
    });

    it('should reject verification if payment amount is mismatched', async () => {
      const orderId = await createOrderForUser(customerAId, 2); // total = 1000 INR
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;
      const razorpayPaymentId = 'pay_mock_50000'; // 50000 paise = 500 INR (Mismatched!)

      const keySecret = 'rzp_test_secret_1234567890';
      const signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: signature,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Payment amount mismatch');
    });

    it('should enforce double payment protection (cannot pay again)', async () => {
      const orderId = await createOrderForUser(customerAId);
      
      // Update order and payments to completed
      await pool.query("UPDATE orders SET status = 'PAID' WHERE id = $1", [orderId]);
      await pool.query(
        "INSERT INTO payments (order_id, razorpay_order_id, status, amount) VALUES ($1, $2, 'CAPTURED', 500)",
        [orderId, 'rzp_order_completed_123']
      );

      const res = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Order is already paid');
    });
  });

  describe('3. Webhooks Verification and Processing', () => {
    it('should process payment.captured webhook and update status successfully', async () => {
      const orderId = await createOrderForUser(customerAId, 2);
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;
      const rzpPaymentId = 'pay_captured_123';

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: rzpPaymentId,
              order_id: razorpayOrderId,
              amount: 100000,
              method: 'netbanking',
            },
          },
        },
      };

      const webhookSecret = 'rzp_test_webhook_secret_1234567890';
      const bodyString = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.from(bodyString))
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(bodyString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('processed');

      // Check payment captured
      const paymentRes = await pool.query('SELECT status, razorpay_payment_id FROM payments WHERE razorpay_order_id = $1', [razorpayOrderId]);
      expect(paymentRes.rows[0].status).toBe('CAPTURED');
      expect(paymentRes.rows[0].razorpay_payment_id).toBe(rzpPaymentId);

      // Check order status PAID
      const orderRes = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
      expect(orderRes.rows[0].status).toBe('PAID');
    });

    it('should ignore duplicate webhook event (idempotency)', async () => {
      const orderId = await createOrderForUser(customerAId, 2);
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;
      
      // Update payment to CAPTURED directly
      await pool.query("UPDATE payments SET status = 'CAPTURED' WHERE razorpay_order_id = $1", [razorpayOrderId]);

      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_duplicate_123',
              order_id: razorpayOrderId,
              amount: 100000,
              method: 'netbanking',
            },
          },
        },
      };

      const webhookSecret = 'rzp_test_webhook_secret_1234567890';
      const bodyString = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.from(bodyString))
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(bodyString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ignored_duplicate');
    });

    it('should handle payment.failed webhook event and mark payment failed', async () => {
      const orderId = await createOrderForUser(customerAId, 2);
      const createRes = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ orderId });

      const razorpayOrderId = createRes.body.data.razorpayOrderId;

      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_123',
              order_id: razorpayOrderId,
              amount: 100000,
              method: 'card',
            },
          },
        },
      };

      const webhookSecret = 'rzp_test_webhook_secret_1234567890';
      const bodyString = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.from(bodyString))
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(bodyString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('processed');

      // Check status transitions to FAILED
      const paymentRes = await pool.query('SELECT status FROM payments WHERE razorpay_order_id = $1', [razorpayOrderId]);
      expect(paymentRes.rows[0].status).toBe('FAILED');
    });

    it('should reject webhook requests with invalid signature', async () => {
      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', 'invalid_signature_hash')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ event: 'payment.captured' }));

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid webhook signature');
    });
  });
});