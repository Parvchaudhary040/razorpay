import { Router } from 'express';
import { CartService } from '@commerce-ai/cart';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, uuidSchema } from '@commerce-ai/shared';

export const cartsRouter = Router();

// Apply auth middleware globally to all cart routes
cartsRouter.use(authenticate);

/** GET /api/carts â€” Get the authenticated user's active cart */
cartsRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const cart = await CartService.getCart(userId);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/carts/items â€” Add item to cart */
cartsRouter.post('/items', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const { productId, quantity } = req.body;

    const parseProduct = uuidSchema.safeParse(productId);
    if (!parseProduct.success) {
      throw new ValidationError('Invalid product ID format');
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }

    const cart = await CartService.addItemToCart(userId, productId, qty);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/carts/items/:productId â€” Update cart item quantity */
cartsRouter.patch('/items/:productId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const productId = req.params.productId as string;
    const { quantity } = req.body;

    const parseProduct = uuidSchema.safeParse(productId);
    if (!parseProduct.success) {
      throw new ValidationError('Invalid product ID format');
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new ValidationError('Quantity must be a positive integer');
    }

    const cart = await CartService.updateCartItemQuantity(userId, productId, qty);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/carts/items/:productId â€” Remove item from cart */
cartsRouter.delete('/items/:productId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const productId = req.params.productId as string;

    const parseProduct = uuidSchema.safeParse(productId);
    if (!parseProduct.success) {
      throw new ValidationError('Invalid product ID format');
    }

    const cart = await CartService.removeCartItem(userId, productId);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/carts â€” Clear cart */
cartsRouter.delete('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const cart = await CartService.clearCart(userId);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
});