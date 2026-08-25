import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '@commerce-ai/database';
import { CartService } from '@commerce-ai/cart';
import { ProductService } from '@commerce-ai/catalog';
import { ValidationError, NotFoundError } from '@commerce-ai/shared';

export const ordersRouter = Router();

ordersRouter.use(authenticate);

// GET /api/orders - Get user's orders
ordersRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - Get specific order details
ordersRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId, role } = req.user!;
    const { id } = req.params;

    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    const order = orderRes.rows[0];

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.user_id !== userId && role !== 'ADMIN') {
      throw new ValidationError('Access denied: You do not own this order');
    }

    const itemsRes = await pool.query(
      `SELECT oi.*, p.name as "productName", p.description as "productDescription" 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...order,
        items: itemsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders - Create order from active cart
ordersRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;

    // 1. Get user's cart
    const cart = await CartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new ValidationError('Cannot create order with an empty cart');
    }

    // 2. Verify inventory stock and compute total
    let total = 0;
    for (const item of cart.items) {
      const product = await ProductService.getProductById(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`);
      }
      if (product.inventoryCount < item.quantity) {
        throw new ValidationError(`Insufficient inventory stock for product: ${product.name}`);
      }
      total += Number(item.price) * item.quantity;
    }

    // 3. PostgreSQL Transaction to create order safely
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
      
      // Clear cart
      await CartService.clearCart(userId);

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});