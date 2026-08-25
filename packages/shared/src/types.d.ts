export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
export interface User {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserCreateInput {
    email: string;
    password: string;
}
export interface AuthResult {
    accessToken: string;
    user: Pick<User, 'id' | 'email' | 'role'>;
}
export interface JwtPayload {
    sub: string;
    role: UserRole;
    sessionId: string;
    iat?: number;
    exp?: number;
}
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    inventoryCount: number;
    category: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
export interface ProductSearchResult {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    similarity?: number;
}
export interface CompareResult {
    products: Product[];
    attributes: string[];
}
export interface SearchFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
}
export type CartStatus = 'ACTIVE' | 'CHECKED_OUT' | 'ABANDONED';
export interface Cart {
    id: string;
    userId: string;
    status: CartStatus;
    items: CartItem[];
    total: number;
    itemCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    addedAt: Date;
}
export type CartWriteAction = 'add' | 'remove' | 'update';
export declare enum OrderStatus {
    CREATED = "CREATED",
    PAYMENT_INITIATED = "PAYMENT_INITIATED",
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING",
    PAYMENT_VERIFIED = "PAYMENT_VERIFIED",
    PAYMENT_CAPTURED = "PAYMENT_CAPTURED",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    ORDER_COMPLETE = "ORDER_COMPLETE",
    CANCELLED = "CANCELLED"
}
export interface Order {
    id: string;
    userId: string;
    cartId: string;
    status: OrderStatus;
    totalAmount: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
}
export declare enum PaymentStatus {
    INITIATED = "INITIATED",
    VERIFIED = "VERIFIED",
    CAPTURED = "CAPTURED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export interface Payment {
    id: string;
    orderId: string;
    userId: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    createdAt: Date;
    verifiedAt?: Date;
    capturedAt?: Date;
}
export interface RazorpayOrderResponse {
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
}
export interface PaymentVerifyInput {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export type AuditActor = 'user' | 'agent' | 'system' | 'webhook';
export interface AuditEvent {
    id: string;
    eventType: string;
    userId?: string;
    sessionId?: string;
    actor: AuditActor;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    result?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
export interface AuditEventInput {
    eventType: string;
    userId?: string;
    sessionId?: string;
    actor: AuditActor;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
    result?: string;
    ipAddress?: string;
    userAgent?: string;
}
export type ShoppingIntent = 'SEARCH' | 'COMPARE' | 'RECOMMEND' | 'ADD_TO_CART' | 'VIEW_CART' | 'UPDATE_CART' | 'REMOVE_FROM_CART' | 'CHECK_ORDER' | 'INITIATE_PAYMENT' | 'GENERAL' | 'UNKNOWN';
export interface ToolContext {
    userId: string;
    sessionId: string;
    role: UserRole;
    ipAddress: string;
}
export interface ToolResult {
    tool: string;
    success: boolean;
    data?: unknown;
    error?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=types.d.ts.map