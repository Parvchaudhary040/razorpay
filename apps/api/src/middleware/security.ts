import rateLimit from 'express-rate-limit';
import { loadConfig, stripHtml } from '@commerce-ai/shared';
import { Request, Response, NextFunction } from 'express';

const config = loadConfig();
const isTest = process.env.NODE_ENV === 'test';

/** Auth Rate Limiter — 5 attempts per 15 minutes (bypassed in test) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 5,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Payment Rate Limiter — 10 requests per 15 minutes (bypassed in test) */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 10,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many payment requests. Please try again after 15 minutes.',
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** AI Endpoints Rate Limiter — 20 requests per minute (bypassed in test) */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 20,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many AI requests. Please slow down and try again in a minute.',
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** General APIs Rate Limiter — 100 requests per 15 minutes (bypassed in test) */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 100,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Input Sanitization Middleware — strips HTML from all string inputs in req.body */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = stripHtml(value);
      }
    }
  }
  next();
}
