import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const productSearchSchema: z.ZodObject<{
    query: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    category?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
}, {
    query: string;
    category?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    limit?: number | undefined;
}>;
export declare const productCompareSchema: z.ZodObject<{
    productIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    productIds: string[];
}, {
    productIds: string[];
}>;
export declare const cartWriteSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
}, {
    productId: string;
    quantity: number;
}>;
export declare const cartUpdateSchema: z.ZodObject<{
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
}, {
    quantity: number;
}>;
export declare const createOrderSchema: z.ZodObject<{
    cartId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cartId: string;
}, {
    cartId: string;
}>;
export declare const paymentInitiateSchema: z.ZodObject<{
    orderId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderId: string;
}, {
    orderId: string;
}>;
export declare const paymentVerifySchema: z.ZodObject<{
    razorpayOrderId: z.ZodString;
    razorpayPaymentId: z.ZodString;
    razorpaySignature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}, {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export declare const toolSchemas: {
    readonly productSearch: z.ZodObject<{
        query: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        minPrice: z.ZodOptional<z.ZodNumber>;
        maxPrice: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        limit: number;
        category?: string | undefined;
        minPrice?: number | undefined;
        maxPrice?: number | undefined;
    }, {
        query: string;
        category?: string | undefined;
        minPrice?: number | undefined;
        maxPrice?: number | undefined;
        limit?: number | undefined;
    }>;
    readonly productCompare: z.ZodObject<{
        productIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        productIds: string[];
    }, {
        productIds: string[];
    }>;
    readonly recommend: z.ZodObject<{
        userId: z.ZodString;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        userId: string;
    }, {
        userId: string;
        limit?: number | undefined;
    }>;
    readonly cartRead: z.ZodObject<{
        cartId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        cartId: string;
    }, {
        cartId: string;
    }>;
    readonly cartWrite: z.ZodObject<{
        cartId: z.ZodString;
        action: z.ZodEnum<["add", "remove", "update"]>;
        productId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
        cartId: string;
        action: "add" | "remove" | "update";
    }, {
        productId: string;
        quantity: number;
        cartId: string;
        action: "add" | "remove" | "update";
    }>;
    readonly orderStatus: z.ZodObject<{
        orderId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        orderId: string;
    }, {
        orderId: string;
    }>;
    readonly paymentInit: z.ZodObject<{
        orderId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        orderId: string;
    }, {
        orderId: string;
    }>;
};
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type ProductCompareInput = z.infer<typeof productCompareSchema>;
export type CartWriteInput = z.infer<typeof toolSchemas.cartWrite>;
//# sourceMappingURL=validation.d.ts.map