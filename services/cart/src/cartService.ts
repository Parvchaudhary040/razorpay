import { CartRepository, CartDetails } from './cartRepository';
import { CacheManager } from '@commerce-ai/database';
import { NotFoundError, ValidationError } from '@commerce-ai/shared';

export class CartService {
  /** Get a user's active cart details (Checks Redis -> hit -> return; miss -> PostgreSQL -> cache -> return) */
  static async getCart(userId: string): Promise<CartDetails> {
    const cacheKey = `cart:${userId}`;
    const cachedCart = await CacheManager.get<CartDetails>(cacheKey);
    if (cachedCart) {
      return cachedCart;
    }

    const cartId = await CartRepository.getOrCreateActiveCart(userId);
    const cartDetails = await CartRepository.getCartDetails(cartId, userId);

    // Cache cart for 1 hour (3600 seconds)
    await CacheManager.set(cacheKey, cartDetails, 3600);

    return cartDetails;
  }

  /** Add item to cart with inventory availability check and cache invalidation */
  static async addItemToCart(userId: string, productId: string, quantity: number): Promise<CartDetails> {
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero');
    }

    // Check inventory stock count of target product (from cache/PG)
    // Wait, let's load from DB to get fresh stock representation
    const cartId = await CartRepository.getOrCreateActiveCart(userId);
    
    // Check if product exists and check stock limits
    const productRes = await CacheManager.get<any>(`product:${productId}`);
    let stockCount = productRes ? productRes.inventoryCount : null;

    if (stockCount === null) {
      // Fetch directly from database pool
      const { pool } = require('@commerce-ai/database');
      const dbRes = await pool.query('SELECT stock_count FROM inventory WHERE product_id = $1', [productId]);
      if (dbRes.rows.length === 0) {
        throw new NotFoundError('Product not found');
      }
      stockCount = parseInt(dbRes.rows[0].stock_count, 10);
    }

    if (stockCount < quantity) {
      throw new ValidationError(`Insufficient stock. Only ${stockCount} items available.`);
    }

    await CartRepository.addItem(cartId, productId, quantity);

    // Invalidate cart cache
    await CacheManager.del(`cart:${userId}`);

    // Return the updated cart details
    return this.getCart(userId);
  }

  /** Update quantity of cart item with inventory check and cache invalidation */
  static async updateCartItemQuantity(userId: string, productId: string, quantity: number): Promise<CartDetails> {
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero');
    }

    const cartId = await CartRepository.getOrCreateActiveCart(userId);
    const cartDetails = await this.getCart(userId);
    
    const existingItem = cartDetails.items.find(item => item.productId === productId);
    if (!existingItem) {
      throw new NotFoundError('Product not found in cart');
    }

    // Check stock availability
    const { pool } = require('@commerce-ai/database');
    const dbRes = await pool.query('SELECT stock_count FROM inventory WHERE product_id = $1', [productId]);
    if (dbRes.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }
    const stockCount = parseInt(dbRes.rows[0].stock_count, 10);
    if (stockCount < quantity) {
      throw new ValidationError(`Insufficient stock. Only ${stockCount} items available.`);
    }

    await CartRepository.updateItemQuantity(cartId, productId, quantity);

    // Invalidate cart cache
    await CacheManager.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  /** Remove item from cart and invalidate cache */
  static async removeCartItem(userId: string, productId: string): Promise<CartDetails> {
    const cartId = await CartRepository.getOrCreateActiveCart(userId);
    await CartRepository.removeItem(cartId, productId);

    // Invalidate cache
    await CacheManager.del(`cart:${userId}`);

    return this.getCart(userId);
  }

  /** Clear entire cart and invalidate cache */
  static async clearCart(userId: string): Promise<CartDetails> {
    const cartId = await CartRepository.getOrCreateActiveCart(userId);
    await CartRepository.clearCart(cartId);

    // Invalidate cache
    await CacheManager.del(`cart:${userId}`);

    return this.getCart(userId);
  }
}