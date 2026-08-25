import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ValidationError, uuidSchema } from '@commerce-ai/shared';
import { PaymentService } from '../services/paymentService';
import { z } from 'zod';

export const paymentsRouter = Router();

// Enforce authentication globally for all payments endpoints
paymentsRouter.use(authenticate);

const createPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

/**
 * POST /api/payments/create
 * Initiates Razorpay payment order for a customer's order.
 */
paymentsRouter.post('/create', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError((parsed as any).error.errors[0].message);
    }

    const result = await PaymentService.createPayment(userId, parsed.data.orderId);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature and updates payment state.
 */
paymentsRouter.post('/verify', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.user!;
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError((parsed as any).error.errors[0].message);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
    const result = await PaymentService.verifyPayment(
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/:id
 * Fetches specific payment transaction details (with ownership checks).
 */
paymentsRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId, role } = req.user!;
    const { id } = req.params;
    
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) {
      throw new ValidationError('Invalid payment ID format');
    }

    const payment = await PaymentService.getPayment(userId, role || 'CUSTOMER', id!);
    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (err) {
    next(err);
  }
});