import { Router } from 'express';
import { ValidationError } from '@commerce-ai/shared';
import { PaymentService } from '../services/paymentService';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/razorpay
 * Signature-verified Razorpay Webhook endpoint.
 */
webhooksRouter.post('/razorpay', async (req: any, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      throw new ValidationError('Webhook signature missing');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new ValidationError('Raw body not captured. Check server configuration.');
    }

    const result = await PaymentService.processWebhook(rawBody, signature);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});