export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inventoryCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Order {
  id: string;
  userId: string;
  cartId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAYMENT_PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  razorpayOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolResults?: Array<{
    toolName: string;
    result: any;
  }>;
}

export interface AuditLog {
  id: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  actor: string;
  payload: any;
  ipAddress?: string;
  createdAt: string;
}