"use strict";
// ============================================
// CommerceAI — Zod Validation Schemas
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolSchemas = exports.paginationSchema = exports.paymentVerifySchema = exports.paymentInitiateSchema = exports.createOrderSchema = exports.cartUpdateSchema = exports.cartWriteSchema = exports.productCompareSchema = exports.productSearchSchema = exports.registerSchema = exports.loginSchema = exports.passwordSchema = exports.emailSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
// --- Primitives ---
exports.uuidSchema = zod_1.z.string().uuid();
exports.emailSchema = zod_1.z.string().email().max(255).trim().toLowerCase();
exports.passwordSchema = zod_1.z.string().min(8).max(128);
// --- Auth ---
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1).max(128),
});
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
});
// --- Product Search ---
exports.productSearchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(500).trim(),
    category: zod_1.z.string().max(100).optional(),
    minPrice: zod_1.z.number().nonnegative().optional(),
    maxPrice: zod_1.z.number().nonnegative().optional(),
    limit: zod_1.z.number().int().min(1).max(50).default(10),
});
exports.productCompareSchema = zod_1.z.object({
    productIds: zod_1.z.array(exports.uuidSchema).min(2).max(4),
});
// --- Cart ---
exports.cartWriteSchema = zod_1.z.object({
    productId: exports.uuidSchema,
    quantity: zod_1.z.number().int().min(1).max(100),
});
exports.cartUpdateSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0).max(100),
});
// --- Order ---
exports.createOrderSchema = zod_1.z.object({
    cartId: exports.uuidSchema,
});
// --- Payment ---
exports.paymentInitiateSchema = zod_1.z.object({
    orderId: exports.uuidSchema,
});
exports.paymentVerifySchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().min(1),
    razorpayPaymentId: zod_1.z.string().min(1),
    razorpaySignature: zod_1.z.string().min(1),
});
// --- Pagination ---
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
// --- Agent Tool Schemas ---
exports.toolSchemas = {
    productSearch: exports.productSearchSchema,
    productCompare: exports.productCompareSchema,
    recommend: zod_1.z.object({
        userId: exports.uuidSchema,
        limit: zod_1.z.number().int().min(1).max(20).default(5),
    }),
    cartRead: zod_1.z.object({
        cartId: exports.uuidSchema,
    }),
    cartWrite: zod_1.z.object({
        cartId: exports.uuidSchema,
        action: zod_1.z.enum(['add', 'remove', 'update']),
        productId: exports.uuidSchema,
        quantity: zod_1.z.number().int().min(0).max(100),
    }),
    orderStatus: zod_1.z.object({
        orderId: exports.uuidSchema,
    }),
    paymentInit: zod_1.z.object({
        orderId: exports.uuidSchema,
    }),
};
//# sourceMappingURL=validation.js.map