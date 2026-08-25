import Razorpay from 'razorpay';
import { loadConfig } from '@commerce-ai/shared';

const config = loadConfig();

export const razorpayClient = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});