import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { 
  loadConfig, 
  logger, 
  AppError, 
  NotFoundError,
  ForbiddenError,
  NotFoundError as SharedNotFoundError
} from '@commerce-ai/shared';
import { pool } from '@commerce-ai/database';
import { 
  generalLimiter, 
  authLimiter, 
  paymentLimiter, 
  aiLimiter, 
  sanitizeInput 
} from './middleware/security';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { cartsRouter } from './routes/carts';
import { aiRouter } from './routes/ai';
import { paymentsRouter } from './routes/payments';
import { webhooksRouter } from './routes/webhooks';
import { auditRouter } from './routes/audit';
import { ordersRouter } from './routes/orders';
import { authenticate, authorize, AuthenticatedRequest } from './middleware/auth';
import { requestIdMiddleware, RequestWithId } from './middleware/requestId';

const config = loadConfig();

export const app = express();

// --- 1. Request ID (Must be first to track request lifecycle) ---
app.use(requestIdMiddleware);

// --- 2. Security Headers (Helmet) ---
app.use(helmet());

// --- 3. CORS Configuration ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  config.cors.origin
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));

// --- 4. Body Parsers (Request size limits enforced here) ---
app.use(express.json({
  limit: '1mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- 5. Input Sanitization ---
app.use(sanitizeInput);

// --- 6. Global Request & Security Logging Middleware ---
app.use((req: RequestWithId, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Structured security logging
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  next();
});

// --- 7. Health Check Endpoint (General Rate Limit) ---
app.get('/health', generalLimiter, async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        database: 'UP',
      },
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({
      success: false,
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// --- 8. Routes & Specific Rate Limits ---

// Authentication routes (Auth Rate Limiting)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/payments', paymentLimiter, paymentsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/audit', auditRouter);
app.use('/api/orders', ordersRouter);

// Stub AI endpoints (AI Rate Limiting)
app.post('/api/ai/chat', aiLimiter, authenticate, (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'AI chat processed successfully' });
});

// Stub Payment endpoints (Payment Rate Limiting)


// --- 9. Test Routes for Auth & Ownership verification (General Rate Limit) ---
app.get('/api/test/admin-only', generalLimiter, authenticate, authorize('ADMIN'), (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Success admin' });
});

app.get('/api/test/orders/:orderId', generalLimiter, authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { userId, role } = req.user!;

    const result = await pool.query('SELECT user_id FROM orders WHERE id = $1', [orderId]);
    const order = result.rows[0];

    if (!order) {
      throw new SharedNotFoundError('Order not found');
    }

    if (order.user_id !== userId && role !== 'ADMIN') {
      logger.warn('Unauthorized resource access attempt', {
        requestId: (req as RequestWithId).id,
        userId,
        resourceId: orderId,
        resourceType: 'order',
      });
      throw new ForbiddenError('Access denied: You do not own this order');
    }

    res.status(200).json({ success: true, message: 'Access granted', orderId });
  } catch (err) {
    next(err);
  }
});

app.get('/api/test/merchants/products/:productId', generalLimiter, authenticate, authorize('MERCHANT'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const testMerchantId = req.headers['x-test-merchant-id'] as string;
    
    if (!testMerchantId) {
      throw new ForbiddenError('Merchant association context missing');
    }

    const result = await pool.query('SELECT merchant_id FROM products WHERE id = $1', [productId]);
    const product = result.rows[0];

    if (!product) {
      throw new SharedNotFoundError('Product not found');
    }

    if (product.merchant_id !== testMerchantId) {
      logger.warn('Unauthorized merchant resource access attempt', {
        requestId: (req as RequestWithId).id,
        merchantId: testMerchantId,
        resourceId: productId,
        resourceType: 'product',
      });
      throw new ForbiddenError('Access denied: You do not own this product');
    }

    res.status(200).json({ success: true, message: 'Access granted', productId });
  } catch (err) {
    next(err);
  }
});

// --- 10. 404 Route Handler ---
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// --- 11. Global Centralized Error Handler (Formatted according to security specifications) ---
app.use((err: Error, req: RequestWithId, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    // Log structured operational errors with Request ID
    logger.warn(`Operational error: ${err.message}`, {
      requestId: req.id,
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Log unhandled non-operational errors (stack trace logged ONLY internally, never returned)
  logger.error('Unhandled server error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  // Database error checks (never leak internal Postgres errors/schemas/SQL)
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let clientMessage = 'An unexpected error occurred. Please try again later.';

  // Return standard safe error structure
  res.status(500).json({
    success: false,
    error: {
      code: errorCode,
      message: clientMessage,
    },
  });
});
