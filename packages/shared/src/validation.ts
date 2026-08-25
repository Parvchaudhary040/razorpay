// ============================================
// CommerceAI — Zod Validation Schemas
// ============================================

import { z } from 'zod';

// --- Primitives ---
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(255).trim().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);

// --- Auth ---
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// --- Product Search ---
export const productSearchSchema = z.object({
  query: z.string().min(1).max(500).trim(),
  category: z.string().max(100).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const productCompareSchema = z.object({
  productIds: z.array(uuidSchema).min(2).max(4),
});

// --- Cart ---
export const cartWriteSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1).max(100),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(100),
});

// --- Order ---
export const createOrderSchema = z.object({
  cartId: uuidSchema,
});

// --- Payment ---
export const paymentInitiateSchema = z.object({
  orderId: uuidSchema,
});

export const paymentVerifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// --- Pagination ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// --- Agent Tool Schemas ---
export const toolSchemas = {
  productSearch: productSearchSchema,
  productCompare: productCompareSchema,
  recommend: z.object({
    userId: uuidSchema,
    limit: z.number().int().min(1).max(20).default(5),
  }),
  cartRead: z.object({
    cartId: uuidSchema,
  }),
  cartWrite: z.object({
    cartId: uuidSchema,
    action: z.enum(['add', 'remove', 'update']),
    productId: uuidSchema,
    quantity: z.number().int().min(0).max(100),
  }),
  orderStatus: z.object({
    orderId: uuidSchema,
  }),
  paymentInit: z.object({
    orderId: uuidSchema,
  }),
} as const;

export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type ProductCompareInput = z.infer<typeof productCompareSchema>;
export type CartWriteInput = z.infer<typeof toolSchemas.cartWrite>;
