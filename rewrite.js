const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/services/paymentService.ts');

const newContent = `import crypto from 'crypto';
import { pool } from '@commerce-ai/database';
import { loadConfig, NotFoundError, ValidationError, ForbiddenError, logger } from '@commerce-ai/shared';
import { razorpayClient } from '../utils/razorpay';

const config = loadConfig();

export class PaymentService {
  /**
   * Create Razorpay Payment Order
   */
  static async createPayment(userId: string, orderId: string) {
    logger.info(\`Initiating payment creation for order \${orderId} by user \${userId}\`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch order details with FOR UPDATE to prevent race conditions
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (orderRes.rows.length === 0) {
        throw new NotFoundError('Order not found');
      }
      const order = orderRes.rows[0];

      // 2. Validate order ownership
      if (order.user_id !== userId) {
        throw new ForbiddenError('Access denied: You do not own this order');
      }

      // 3. Validate order status
      if (order.status === 'PAID') {
        throw new ValidationError('Order is already paid');
      }
      if (!['PENDING', 'PAYMENT_PENDING'].includes(order.status)) {
        throw new ValidationError(\`Cannot pay for an order in status \${order.status}\`);
      }

      // 4. Duplicate payment protection
      const duplicateCheck = await client.query(
        "SELECT 1 FROM payments WHERE order_id = $1 AND status = 'CAPTURED'",
        [orderId]
      );
      if (duplicateCheck.rows.length > 0) {
        throw new ValidationError('Order is already paid');
      }

      const amountInPaise = Math.round(Number(order.total_amount) * 100);

      // 5. Create order in Razorpay
      let rzpOrder;
      try {
        rzpOrder = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderId,
        });
      } catch (err: any) {
        logger.error('Razorpay order creation failed', { error: err.message });
        throw new ValidationError(\`Razorpay order creation failed: \${err.message}\`);
      }

      // 6. Create payment record in database
      const paymentRes = await client.query(
        \`INSERT INTO payments (order_id, razorpay_order_id, amount, status)
         VALUES ($1, $2, $3, 'CREATED')
         RETURNING *\`,
        [orderId, rzpOrder.id, order.total_amount]
      );

      await client.query(
        "UPDATE orders SET status = 'PAYMENT_PENDING', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      await client.query('COMMIT');
      return {
        paymentId: paymentRes.rows[0].id,
        razorpayOrderId: rzpOrder.id,
        amount: order.total_amount,
        currency: 'INR',
        keyId: config.razorpay.keyId,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verify Razorpay Payment Signature
   */
  static async verifyPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    logger.info(\`Verifying payment signature for order \${razorpayOrderId}\`);

    // 1. Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(\`\${razorpayOrderId}|\${razorpayPaymentId}\`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      logger.warn('Payment signature verification failed', { razorpayOrderId, razorpayPaymentId });
      throw new ValidationError('Invalid payment signature');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Fetch payment and order details with FOR UPDATE
      const paymentRes = await client.query(
        \`SELECT p.*, o.user_id, o.status as order_status, o.total_amount
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE p.razorpay_order_id = $1 FOR UPDATE\`,
        [razorpayOrderId]
      );

      if (paymentRes.rows.length === 0) {
        throw new NotFoundError('Payment record not found');
      }
      const payment = paymentRes.rows[0];

      // 3. Verify resource ownership
      if (payment.user_id !== userId) {
        throw new ForbiddenError('Access denied: You do not own this order');
      }

      // 4. State validation
      if (payment.status === 'CAPTURED') {
        await client.query('ROLLBACK');
        return { success: true, paymentId: payment.id, orderId: payment.order_id, message: 'Already verified' };
      }

      // 5. Fetch payment details from Razorpay
      let rzpPayment;
      try {
        rzpPayment = await razorpayClient.payments.fetch(razorpayPaymentId);
      } catch (err: any) {
        logger.error('Razorpay payment fetch failed', { error: err.message });
        throw new ValidationError(\`Razorpay payment fetch failed: \${err.message}\`);
      }

      const expectedAmountInPaise = Math.round(Number(payment.total_amount) * 100);
      if (Number(rzpPayment.amount) !== expectedAmountInPaise) {
        throw new ValidationError('Payment amount mismatch');
      }

      // 6. Update payment status in database
      await client.query(
        \`UPDATE payments
         SET status = 'CAPTURED', razorpay_payment_id = $1, razorpay_signature = $2, updated_at = NOW()
         WHERE id = $3\`,
        [razorpayPaymentId, razorpaySignature, payment.id]
      );

      await client.query(
        "UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = $1",
        [payment.order_id]
      );

      await client.query('COMMIT');
      logger.info(\`Payment verified and captured successfully for order \${payment.order_id}\`);
      return { success: true, paymentId: payment.id, orderId: payment.order_id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch payment by ID (with ownership check)
   */
  static async getPayment(userId: string, role: string, paymentId: string) {
    const paymentQuery = \`
      SELECT p.*, o.user_id 
      FROM payments p 
      JOIN orders o ON p.order_id = o.id 
      WHERE p.id = $1
    \`;
    const paymentRes = await pool.query(paymentQuery, [paymentId]);
    if (paymentRes.rows.length === 0) {
      throw new NotFoundError('Payment not found');
    }
    const payment = paymentRes.rows[0];

    if (role !== 'ADMIN' && payment.user_id !== userId) {
      throw new ForbiddenError('Access denied: You do not own this payment resource');
    }

    return payment;
  }

  /**
   * Process Razorpay Webhook Event
   */
  static async processWebhook(rawBody: Buffer, signature: string) {
    logger.info('Processing Razorpay webhook');

    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('Webhook signature verification failed');
      throw new ValidationError('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;
    logger.info(\`Razorpay Webhook event received: \${event}\`);

    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity) {
      logger.warn('Invalid webhook payload: missing payment entity');
      return { status: 'ignored' };
    }

    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    if (!razorpayOrderId) {
      logger.warn('Webhook event missing razorpay_order_id');
      return { status: 'ignored' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 2. Fetch corresponding payment record WITH FOR UPDATE to prevent race condition
      const paymentRes = await client.query('SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE', [razorpayOrderId]);
      if (paymentRes.rows.length === 0) {
        logger.warn(\`No payment record found for razorpay_order_id: \${razorpayOrderId}\`);
        await client.query('ROLLBACK');
        return { status: 'ignored' };
      }
      const payment = paymentRes.rows[0];

      // 3. Webhook idempotency: skip if already captured
      if (payment.status === 'CAPTURED') {
        logger.info(\`Webhook event \${event} ignored: Payment is already CAPTURED\`);
        await client.query('ROLLBACK');
        return { status: 'ignored_duplicate' };
      }

      if (event === 'payment.captured') {
        await client.query(
          \`UPDATE payments
           SET status = 'CAPTURED', razorpay_payment_id = $1, updated_at = NOW()
           WHERE id = $2\`,
          [razorpayPaymentId, payment.id]
        );

        await client.query(
          "UPDATE orders SET status = 'PAID', updated_at = NOW() WHERE id = $1",
          [payment.order_id]
        );
        logger.info(\`Webhook processed: payment \${payment.id} set to CAPTURED, order set to PAID\`);
      } else if (event === 'payment.failed') {
        await client.query(
          \`UPDATE payments
           SET status = 'FAILED', razorpay_payment_id = $1, updated_at = NOW()
           WHERE id = $2\`,
          [razorpayPaymentId, payment.id]
        );

        logger.info(\`Webhook processed: payment \${payment.id} set to FAILED\`);
      }

      await client.query('COMMIT');
      return { status: 'processed' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Webhook processing transaction failed', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }
}
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('paymentService.ts rewritten successfully');