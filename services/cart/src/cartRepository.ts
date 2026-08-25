import { pool } from '@commerce-ai/database';

export interface CartItemDetails {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  specifications: Record<string, any>;
  inventoryCount: number;
}

export interface CartDetails {
  id: string;
  userId: string;
  status: string;
  items: CartItemDetails[];
  totalAmount: number;
}

export class CartRepository {
  /** Get or create an active cart for a user */
  static async getOrCreateActiveCart(userId: string): Promise<string> {
    const checkQuery = 'SELECT id FROM carts WHERE user_id = $1 AND status = $2';
    const checkRes = await pool.query(checkQuery, [userId, 'ACTIVE']);
    
    if (checkRes.rows.length > 0) {
      return checkRes.rows[0].id;
    }

    const insertQuery = 'INSERT INTO carts (user_id, status) VALUES ($1, $2) RETURNING id';
    const insertRes = await pool.query(insertQuery, [userId, 'ACTIVE']);
    return insertRes.rows[0].id;
  }

  /** Get full details of a cart by its ID */
  static async getCartDetails(cartId: string, userId: string): Promise<CartDetails> {
    const itemsQuery = `
      SELECT ci.product_id, ci.quantity, p.name, p.price, p.category, p.specifications, COALESCE(i.stock_count, 0) as stock_count
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `;
    const itemsRes = await pool.query(itemsQuery, [cartId]);
    
    let totalAmount = 0;
    const items: CartItemDetails[] = itemsRes.rows.map(row => {
      const price = parseFloat(row.price);
      const quantity = parseInt(row.quantity, 10);
      totalAmount += price * quantity;
      
      return {
        productId: row.product_id,
        name: row.name,
        price,
        quantity,
        category: row.category,
        specifications: row.specifications,
        inventoryCount: parseInt(row.stock_count, 10),
      };
    });

    return {
      id: cartId,
      userId,
      status: 'ACTIVE',
      items,
      totalAmount,
    };
  }

  /** Add or merge an item in cart */
  static async addItem(cartId: string, productId: string, quantity: number): Promise<void> {
    const query = `
      INSERT INTO cart_items (cart_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()
    `;
    await pool.query(query, [cartId, productId, quantity]);
  }

  /** Update quantity of an item */
  static async updateItemQuantity(cartId: string, productId: string, quantity: number): Promise<void> {
    const query = `
      UPDATE cart_items
      SET quantity = $1, updated_at = NOW()
      WHERE cart_id = $2 AND product_id = $3
    `;
    await pool.query(query, [quantity, cartId, productId]);
  }

  /** Remove item from cart */
  static async removeItem(cartId: string, productId: string): Promise<void> {
    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId]
    );
  }

  /** Clear all items in cart */
  static async clearCart(cartId: string): Promise<void> {
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  }
}