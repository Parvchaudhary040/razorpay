# CommerceAI — Backend Architecture

> **Version:** 1.0.0
> **Date:** 2026-08-24
> **Stack:** Node.js · Express · TypeScript · PostgreSQL · Redis · LangChain · LangGraph · MCP · Razorpay

---

## Table of Contents

1. [Overview](#1-overview)
2. [Folder Structure](#2-folder-structure)
3. [Startup and Bootstrap Flow](#3-startup-and-bootstrap-flow)
4. [Middleware Pipeline](#4-middleware-pipeline)
5. [Route Layer](#5-route-layer)
6. [AI Agent Layer](#6-ai-agent-layer)
7. [Tool Layer (MCP)](#7-tool-layer-mcp)
8. [Policy Engine](#8-policy-engine)
9. [Service Layer](#9-service-layer)
10. [Repository Layer](#10-repository-layer)
11. [Database Layer (PostgreSQL + pgvector)](#11-database-layer-postgresql--pgvector)
12. [Cache Layer (Redis)](#12-cache-layer-redis)
13. [Payment Layer (Razorpay)](#13-payment-layer-razorpay)
14. [Webhook Handler](#14-webhook-handler)
15. [Audit Logger](#15-audit-logger)
16. [Error Handling](#16-error-handling)
17. [Configuration and Environment](#17-configuration-and-environment)
18. [TypeScript Type System](#18-typescript-type-system)
19. [Testing Strategy](#19-testing-strategy)
20. [Full Request Lifecycle](#20-full-request-lifecycle)

---

## 1. Overview

The CommerceAI backend is a production-grade Express/TypeScript API that serves as the single source of truth for all business operations. It hosts the AI agent (LangGraph), exposes REST endpoints, enforces security at every layer, and owns all database and payment interactions.

### Core Responsibilities

| Responsibility | Owner |
|---|---|
| JWT authentication and RBAC | Middleware layer |
| Natural language AI shopping assistant | LangGraph agent |
| Tool orchestration and validation | Tool layer + PolicyEngine |
| Product search (keyword + semantic) | ProductService + pgvector |
| Cart and order lifecycle | CartService, OrderService |
| Razorpay payment initiation and verification | PaymentService |
| Razorpay webhook handling | WebhookHandler |
| Immutable audit trail | AuditLogger |
| Redis caching | CacheService |

### What the Backend Guarantees

- The LLM never accesses PostgreSQL, Redis, or Razorpay directly
- All LLM tool calls are validated at 4 independent layers before execution
- Payment amounts are always sourced from the database, never from the frontend or LLM
- Audit events are written before the action completes and cannot be deleted
- Secrets never appear in logs, LLM context, or HTTP responses

---

## 2. Folder Structure

```
backend/
+-- src/
|   +-- index.ts                    Entry point — starts HTTP server
|   +-- app.ts                      Express app setup and route registration
|   |
|   +-- config/
|   |   +-- env.ts                  Loads and validates all env vars at startup
|   |
|   +-- middleware/
|   |   +-- auth/
|   |   |   +-- jwt.ts              Verifies RS256 JWT on protected routes
|   |   |   +-- authorize.ts        RBAC middleware — checks role claim
|   |   +-- security/
|   |       +-- rateLimit.ts        Per-IP and per-user rate limiting
|   |       +-- sanitize.ts         XSS and HTML stripping on request body
|   |
|   +-- routes/
|   |   +-- auth.ts                 POST /auth/login, refresh, logout, register
|   |   +-- chat.ts                 POST /chat/message  (AI agent entry point)
|   |   +-- products.ts             GET /products, /products/:id, /products/compare
|   |   +-- cart.ts                 GET/POST/PUT/DELETE /cart and /cart/items
|   |   +-- orders.ts               POST /orders, GET /orders/:id
|   |   +-- payments.ts             POST /payments/initiate, /payments/verify
|   |   +-- audit.ts                GET /audit  (admin only)
|   |
|   +-- agents/
|   |   +-- shoppingAgent.ts        LangGraph StateGraph — AI orchestrator
|   |   +-- agentState.ts           AgentState type and initializer
|   |   +-- agentPermissions.ts     Static permission table per user role
|   |
|   +-- tools/
|   |   +-- toolRegistry.ts         Static registry of all approved tools
|   |   +-- toolValidator.ts        4-layer validation before any tool executes
|   |   +-- approved/
|   |       +-- productSearchTool.ts
|   |       +-- productCompareTool.ts
|   |       +-- recommendTool.ts
|   |       +-- cartReadTool.ts
|   |       +-- cartWriteTool.ts
|   |       +-- orderStatusTool.ts
|   |       +-- paymentInitTool.ts
|   |
|   +-- mcp/
|   |   +-- mcpServer.ts            MCP server definitions (in-process)
|   |   +-- mcpSchemas.ts           Zod schemas for all MCP tool I/O
|   |
|   +-- policies/
|   |   +-- policyEngine.ts         Code-level guard for all agent actions
|   |   +-- rules.ts                Rule definitions per tool
|   |
|   +-- services/
|   |   +-- product/
|   |   |   +-- productService.ts
|   |   |   +-- productRepository.ts
|   |   +-- cart/
|   |   |   +-- cartService.ts
|   |   |   +-- cartRepository.ts
|   |   +-- order/
|   |   |   +-- orderService.ts
|   |   |   +-- orderRepository.ts
|   |   +-- payment/
|   |   |   +-- paymentService.ts
|   |   |   +-- paymentRepository.ts
|   |   +-- user/
|   |   |   +-- userService.ts
|   |   +-- recommendation/
|   |       +-- recommendationService.ts
|   |
|   +-- db/
|   |   +-- pool.ts                 PostgreSQL pg.Pool singleton
|   |   +-- migrations/
|   |   |   +-- 001_initial.sql     All core tables
|   |   |   +-- 002_pgvector.sql    Vector extension and embedding column
|   |   +-- seeds/
|   |       +-- products.sql        Sample products with embeddings
|   |
|   +-- cache/
|   |   +-- redisClient.ts          Redis client singleton
|   |   +-- cacheService.ts         Namespaced get/set/del helpers
|   |
|   +-- audit/
|   |   +-- auditLogger.ts          Append-only audit writer
|   |   +-- auditTypes.ts           AuditEventType enum and AuditEvent interface
|   |
|   +-- webhooks/
|   |   +-- razorpayWebhook.ts      HMAC verify + order state update
|   |
|   +-- types/
|   |   +-- index.ts
|   |   +-- agent.ts
|   |   +-- product.ts
|   |   +-- order.ts
|   |   +-- payment.ts
|   |
|   +-- utils/
|       +-- encryption.ts
|       +-- validation.ts
|       +-- errors.ts
|
+-- tests/
|   +-- unit/
|   +-- integration/
|   +-- e2e/
|
+-- package.json
+-- tsconfig.json
```

---

## 3. Startup and Bootstrap Flow

```
node dist/index.js
       |
       v
config/env.ts
  Validates all required env vars — throws if any are missing

       |
       v
db/pool.ts
  Creates pg.Pool  (max 20 connections)
  Tests connection on startup

       |
       v
cache/redisClient.ts
  Creates Redis client
  Connects and sends PING test

       |
       v
app.ts
  Registers global middleware (helmet, cors, json parser, rate limit, sanitize)
  Mounts route handlers
  Registers global error handler

       |
       v
index.ts
  Starts HTTP server on PORT (default 3001)
  Logs: "CommerceAI backend ready on :3001"
```

---

## 4. Middleware Pipeline

Every request passes through this ordered pipeline:

```
Incoming Request
       |
       v
[1] Helmet
    Sets security headers:
    Content-Security-Policy, HSTS, X-Frame-Options,
    X-Content-Type-Options, Referrer-Policy

[2] CORS
    Allows: process.env.FRONTEND_ORIGIN only
    Methods: GET, POST, PUT, DELETE, OPTIONS

[3] Body Parser
    express.json (protected routes, max 1MB)
    express.raw (webhook route only — preserves raw body for HMAC)

[4] Global Rate Limiter
    100 requests per 15 minutes per IP

[5] Route-specific Rate Limiters
    /auth/login          ->  5 requests per 15 min per IP
    /chat/message        ->  30 requests per minute per user

[6] sanitize.ts
    Strips HTML tags and script content from all string body fields

[7] jwt.ts  (protected routes only)
    Verifies RS256 JWT from Authorization: Bearer <token>
    Attaches: req.user = { userId, role, sessionId }

[8] authorize.ts  (role-restricted routes only)
    Checks req.user.role against required role for the route

[9] Route Handler
    Business logic begins here

[10] Global Error Handler
     Maps AppError subtypes to HTTP status codes
     Strips stack traces in production
```


---

## 5. Route Layer

Each route file is a thin orchestrator — it validates HTTP concerns and delegates all business logic to services or the agent.

### Route Map

```
POST   /api/v1/auth/login            UserService.authenticate()
POST   /api/v1/auth/refresh          UserService.refreshToken()
POST   /api/v1/auth/logout           UserService.revokeToken()
POST   /api/v1/auth/register         UserService.register()

POST   /api/v1/chat/message          ShoppingAgent.invoke()

GET    /api/v1/products              ProductService.list()
GET    /api/v1/products/search       ProductService.search()
GET    /api/v1/products/:id          ProductService.getById()
GET    /api/v1/products/compare      ProductService.compare()

GET    /api/v1/cart                  CartService.getCart()
POST   /api/v1/cart/items            CartService.addItem()
PUT    /api/v1/cart/items/:id        CartService.updateItem()
DELETE /api/v1/cart/items/:id        CartService.removeItem()
DELETE /api/v1/cart                  CartService.clearCart()

POST   /api/v1/orders                OrderService.createOrder()
GET    /api/v1/orders/:id            OrderService.getOrder()

POST   /api/v1/payments/initiate     PaymentService.createRazorpayOrder()
POST   /api/v1/payments/verify       PaymentService.verifyPayment()

GET    /api/v1/audit                 AuditLogger.query()  [admin only]

POST   /webhooks/razorpay            WebhookHandler.handle()
```

### Route Layer Rules

- Routes never write SQL directly
- Routes never call repositories directly
- Routes never call the LLM directly (only via ShoppingAgent)
- Routes validate path/query params with Zod before passing to services
- Routes attach userId from req.user, never from request body

---

## 6. AI Agent Layer

### 6.1 ShoppingAgent (LangGraph StateGraph)

```
agents/shoppingAgent.ts

ShoppingAgent
  constructor(userId, sessionId)
    Builds LangGraph StateGraph with nodes and edges
    Loads conversation history from Redis

  invoke(userMessage: string): Promise<AgentResponse>
    Runs the graph
    Returns: { message: string, toolResults: ToolResult[], auditEvents: AuditEvent[] }
```

### 6.2 LangGraph Graph Structure

```
START
  |
  v
intentClassifier
  Gemini Pro classifies intent into ShoppingIntent
  |
  v
conditional edge based on intent:
  |
  +-- SEARCH / COMPARE / RECOMMEND  -->  searchFlow
  |                                         |
  +-- ADD_TO_CART / VIEW_CART /      -->  cartFlow
  |   UPDATE_CART / REMOVE_FROM_CART    |
  |                                         |
  +-- CHECK_ORDER / INITIATE_PAYMENT -->  orderPaymentFlow
  |                                         |
  +-- UNKNOWN                        -->  responseGenerator (no tool call)
                                           |
  <-----------------------------------------+
  |
  v
responseGenerator
  Gemini Pro generates natural language response from toolResults
  |
  v
auditLog
  Flushes all accumulated audit events to database
  |
  v
END
```

### 6.3 Agent State Definition

```typescript
// agents/agentState.ts

interface AgentState {
  userId: string;
  sessionId: string;
  messages: BaseMessage[];
  intent: ShoppingIntent | null;
  toolResults: ToolResult[];
  cartId: string | null;
  orderId: string | null;
  pendingPaymentId: string | null;
  auditEvents: AuditEvent[];
  error: string | null;
}

type ShoppingIntent =
  | 'SEARCH' | 'COMPARE' | 'RECOMMEND'
  | 'ADD_TO_CART' | 'VIEW_CART' | 'UPDATE_CART' | 'REMOVE_FROM_CART'
  | 'CHECK_ORDER' | 'INITIATE_PAYMENT'
  | 'UNKNOWN';
```

### 6.4 Gemini Pro Configuration

```typescript
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-pro',
  temperature: 0.3,
  maxOutputTokens: 1024,
  apiKey: process.env.GEMINI_API_KEY,
});
```

### 6.5 Conversation Memory

- Redis key: `session:{sessionId}:history`   (TTL: 30 min sliding)
- Max messages in context window: last 20
- On session end: summary stored in PostgreSQL agent_sessions table
- History never contains: passwords, tokens, payment credentials

---

## 7. Tool Layer (MCP)

### 7.1 Tool Registry (Static — Immutable at Runtime)

```typescript
// tools/toolRegistry.ts

export const TOOL_REGISTRY: Record<string, ApprovedTool> = {
  productSearchTool:    new ProductSearchTool(),
  productCompareTool:   new ProductCompareTool(),
  recommendTool:        new RecommendTool(),
  cartReadTool:         new CartReadTool(),
  cartWriteTool:        new CartWriteTool(),
  orderStatusTool:      new OrderStatusTool(),
  paymentInitTool:      new PaymentInitTool(),
};
// Cannot be modified by LLM output, API calls, or user input
```

### 7.2 Tool Validation Flow (4 Layers)

```
Agent proposes: tool(name, params)
        |
[Layer 1] REGISTRY CHECK
        ToolRegistry.get(name)
        Not found? -> REJECT + AuditLog(UNKNOWN_TOOL_ATTEMPT)
        |
[Layer 2] ZOD SCHEMA VALIDATION
        tool.inputSchema.safeParse(params)
        Invalid? -> REJECT + AuditLog(TOOL_VALIDATION_FAILED)
        |
[Layer 3] AGENT PERMISSION CHECK
        AgentPermissions.check(userId, toolName, role)
        Denied? -> REJECT + AuditLog(PERMISSION_DENIED)
        |
[Layer 4] POLICY ENGINE
        PolicyEngine.evaluate(toolName, params, context)
        Denied? -> REJECT + AuditLog(POLICY_VIOLATION)
        |
        v
     EXECUTE
        AuditLog(AGENT_TOOL_CALL, status=attempted)
        result = tool.execute(validatedParams, context)
        AuditLog(AGENT_TOOL_CALL, status=success)
        |
        v
     SANITIZE OUTPUT
        Remove internal fields before returning to agent context
```

### 7.3 Tool Interface

```typescript
interface ApprovedTool<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: ZodSchema<TInput>;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
  sanitizeOutput(output: TOutput): TOutput;
}
```

### 7.4 Tool Definitions

```
productSearchTool
  Input:  query (string, max 500 chars), category?, minPrice?, maxPrice?, limit? (max 50)
  Action: ProductService.search() -> pgvector + keyword fallback
  Output: ProductSearchResult[]

productCompareTool
  Input:  productIds (UUID[], min 2, max 4)
  Action: ProductService.compare()
  Output: CompareResult (attribute map)

recommendTool
  Input:  userId (UUID), limit? (max 20)
  Auth:   Requires userId match — agent cannot query other users
  Action: RecommendationService.forUser()
  Output: ProductSearchResult[]

cartReadTool
  Input:  cartId (UUID)
  Auth:   Cart ownership verified by PolicyEngine
  Action: CartService.getCart()
  Output: Cart with items

cartWriteTool
  Input:  cartId, action (add|remove|update), productId, quantity
  Auth:   Cart ownership + inventory check via PolicyEngine
  Action: CartService.addItem() | removeItem() | updateItem()
  Output: Updated cart

orderStatusTool
  Input:  orderId (UUID)
  Auth:   Order ownership verified by PolicyEngine
  Action: OrderService.getOrder()
  Output: Order with status and items

paymentInitTool
  Input:  orderId (UUID)
  Auth:   Order ownership + order state check via PolicyEngine
  Action: PaymentService.createRazorpayOrder()
  Output: { razorpay_order_id, amount, currency }
          key_secret is NEVER included in output
```

---

## 8. Policy Engine

The PolicyEngine is a code-level guard that runs independently of the LLM. Even if prompt injection tricks the LLM into requesting an unauthorized action, the PolicyEngine rejects it.

```typescript
// policies/policyEngine.ts

class PolicyEngine {
  evaluate(toolName: string, params: unknown, context: PolicyContext): PolicyDecision {
    const rules = RULES[toolName] ?? [];
    for (const rule of rules) {
      const result = rule.evaluate(params, context);
      if (result.denied) {
        return { allowed: false, reason: result.reason };
      }
    }
    return { allowed: true };
  }
}
```

### Policy Rules by Tool

```
cartWriteTool rules:
  cart_ownership:      cart.userId must equal context.userId
  inventory_available: product.inventory_count >= requested quantity

paymentInitTool rules:
  order_ownership:           order.userId must equal context.userId
  order_ready_for_payment:   order.status must be CREATED or PAYMENT_FAILED

orderStatusTool rules:
  order_ownership_or_admin:  order.userId === context.userId OR role === admin

recommendTool rules:
  self_only:  params.userId must equal context.userId
```

---

## 9. Service Layer

Services are the authority for all business logic. They are called by:
- Route handlers (direct, for non-AI operations)
- Approved tools (via tool -> service, for AI operations)

They never receive raw LLM text output. They receive validated, typed parameters only.

### ProductService

```
search(query, filters)
  1. Generate query embedding via Gemini text-embedding-004
  2. pgvector cosine similarity search
  3. Fallback to PostgreSQL full-text search if no vector results
  4. Apply price and category filters
  5. Cache results in Redis (TTL: 2 min)
  6. Return sanitized ProductSearchResult[]

compare(productIds[])
  1. Fetch all products by IDs (max 4)
  2. Build side-by-side attribute comparison map
  3. Return CompareResult

getById(id)
  1. Check Redis cache (TTL: 5 min)
  2. Fetch from DB on cache miss
  3. Populate cache and return Product

list(pagination)
  1. Paginated DB query
  2. Return PaginatedResult<Product>
```

### CartService

```
getCart(userId)
  Get or create active cart for user
  Returns cart with items and computed total

addItem(cartId, productId, quantity, userId)
  1. Verify cart.userId === userId
  2. Verify product exists and inventory_count >= quantity
  3. Upsert cart_items (add or increment quantity)
  4. Invalidate Redis cache: cart:{userId}
  5. AuditLog(CART_ITEM_ADDED)
  6. Return updated cart

removeItem(cartId, itemId, userId)
  1. Verify cart ownership
  2. Delete cart_items row
  3. AuditLog(CART_ITEM_REMOVED)

updateItem(cartId, itemId, quantity, userId)
  1. Verify cart ownership
  2. Verify inventory_count >= quantity
  3. Update cart_items.quantity
  4. AuditLog(CART_ITEM_UPDATED)

clearCart(cartId, userId)
  1. Verify cart ownership
  2. Delete all cart_items for this cart
```

### OrderService

```
createOrder(userId, cartId)
  BEGIN TRANSACTION
    1. Fetch cart with items — verify ownership and non-empty
    2. Compute total from DB product prices (not cart cached prices)
    3. Decrement product.inventory_count for each item
    4. Create orders row
    5. Create order_items rows
    6. Update cart.status = CHECKED_OUT
  COMMIT
  AuditLog(ORDER_CREATED)
  Return order

getOrder(orderId, userId)
  1. Fetch from DB — NO CACHE (always fresh)
  2. Verify order.userId === userId OR role === admin
  3. Return order

markPaid(orderId, paymentId)
  Called by PaymentService after HMAC verification
  Transitions: PAYMENT_PROCESSING -> PAYMENT_VERIFIED
  AuditLog(PAYMENT_VERIFIED)

confirmPaymentCapture(razorpayPaymentId)
  Called by WebhookHandler
  Transitions: PAYMENT_VERIFIED -> PAYMENT_CAPTURED -> ORDER_COMPLETE
  AuditLog(WEBHOOK_PAYMENT_CAPTURED)
  AuditLog(ORDER_COMPLETED)
```

### PaymentService

```
createRazorpayOrder(orderId, userId)
  1. Fetch order from DB
  2. Verify order.userId === userId
  3. Verify order status is CREATED or PAYMENT_FAILED
  4. Re-read amount from DB (never from frontend or LLM)
  5. razorpay.orders.create({ amount: amount * 100, currency: 'INR' })
  6. Store razorpay_order_id in payments table
  7. Transition order to PAYMENT_INITIATED
  8. AuditLog(PAYMENT_INITIATED)
  9. Return { razorpay_order_id, razorpay_key_id, amount, currency }
     (key_secret NEVER returned)

verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature, userId)
  1. HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, KEY_SECRET)
  2. crypto.timingSafeEqual(expected, razorpaySignature)
  3. If invalid: AuditLog(PAYMENT_FAILED) + throw PaymentVerificationError
  4. If valid: update payment record status to VERIFIED
  5. Call OrderService.markPaid()
  6. AuditLog(PAYMENT_VERIFIED)
  7. Return { success: true, orderId }
```

### UserService

```
register(email, password)
  1. Check email uniqueness
  2. bcrypt.hash(password, 12)
  3. INSERT user
  4. Issue JWT (RS256) + refreshToken
  5. AuditLog(USER_REGISTER)

authenticate(email, password)
  1. Fetch user by email
  2. bcrypt.compare(password, hash)
  3. Issue JWT (RS256) access token (1h)
  4. Issue refreshToken (httpOnly cookie, 7d)
  5. AuditLog(USER_LOGIN)

refreshToken(refreshToken)
  1. Verify RS256 signature
  2. Check jti not in Redis revocation set
  3. Issue new access token

revokeToken(refreshToken)
  Add jti to Redis revocation set (TTL = remaining token lifetime)
  AuditLog(USER_LOGOUT)
```

### RecommendationService

```
forUser(userId, limit)
  1. Fetch user's last 5 ordered product embeddings
  2. Average them to form a user preference vector
  3. pgvector cosine similarity search against all products
  4. Exclude already-purchased products
  5. Return top N recommendations
```

---

## 10. Repository Layer

Repositories are the only layer that executes SQL. All queries are parameterized.

```typescript
// Parameterized query pattern (all repositories)
async findById(id: string): Promise<Product | null> {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

// Transaction pattern
async createOrderWithItems(order, items): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // ... inserts and inventory decrements
    await client.query('COMMIT');
    return orderRow;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Repository Rules

1. No raw SQL outside Repository classes
2. All queries use parameterized statements ($1, $2, ...)
3. Transactions managed at Service layer via client.connect()
4. No ORM — full control over query plans
5. Every write calls AuditLogger.record() before returning


---

## 11. Database Layer (PostgreSQL + pgvector)

### 11.1 Connection Pool

```typescript
// db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 11.2 Core Schema (Migration 001)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2) NOT NULL,
  inventory_count INT NOT NULL DEFAULT 0,
  category        TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  added_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id),
  cart_id             UUID REFERENCES carts(id),
  status              TEXT NOT NULL DEFAULT 'CREATED',
  total_amount        NUMERIC(12,2) NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  status              TEXT NOT NULL DEFAULT 'INITIATED',
  amount              NUMERIC(12,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  verified_at         TIMESTAMPTZ,
  captured_at         TIMESTAMPTZ
);

CREATE TABLE audit_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  TEXT NOT NULL,
  user_id     UUID,
  session_id  UUID,
  actor       TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  payload     JSONB DEFAULT '{}',
  result      TEXT,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit table is INSERT-only for the application user
REVOKE UPDATE, DELETE ON audit_events FROM commerceai_app;

CREATE TABLE agent_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  session_id UUID NOT NULL,
  context    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### 11.3 pgvector Setup (Migration 002)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products ADD COLUMN embedding vector(1536);

CREATE INDEX ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 11.4 Semantic Search Query

```sql
-- ProductRepository.semanticSearch()
SELECT id, name, description, price, category,
       1 - (embedding <=> $1) AS similarity
FROM   products
WHERE  inventory_count > 0
ORDER  BY embedding <=> $1
LIMIT  $2;
```

---

## 12. Cache Layer (Redis)

### Key Namespace Convention

```
session:{sessionId}:history      Conversation messages  (TTL: 30 min)
cart:{userId}                    Cart data              (TTL: 10 min)
product:{productId}              Product detail         (TTL: 5 min)
search:{queryHash}               Search results         (TTL: 2 min)
revoked:{jti}                    Revoked JWT token      (TTL: token remaining lifetime)
```

### Cache Strategy per Domain

| Domain | Strategy | TTL | Invalidation Trigger |
|---|---|---|---|
| Product detail | Read-through | 5 min | Product update |
| Product search | Cache-aside | 2 min | Time-based |
| Cart | Write-through | 10 min | Any cart mutation |
| Order | NO CACHE | — | Always fresh DB read |
| Payment | NO CACHE | — | Always fresh DB read |
| Session history | Write-through sliding | 30 min | Session end |
| JWT revocation | Write-once | Remaining TTL | N/A |

### CacheService Interface

```typescript
class CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

---

## 13. Payment Layer (Razorpay)

### Security Boundary

```
key_secret lives ONLY in:  process.env.RAZORPAY_KEY_SECRET
                            PaymentService (reads from env on startup)

key_secret NEVER reaches:  LLM context
                            Agent state
                            Tool results
                            HTTP response body
                            Log files
                            Redis
                            Frontend
```

### Payment Data Flow

```
paymentInitTool (approved tool call from agent)
        |
        v
PaymentService.createRazorpayOrder(orderId, userId)
        |
  Razorpay SDK: orders.create({ amount: dbAmount * 100, currency: 'INR' })
        |
  Store in DB: payments table { razorpay_order_id, status: INITIATED }
        |
  Return to route: { razorpay_order_id, razorpay_key_id, amount, currency }
        |
        v  (HTTP response to frontend)
        |
  Frontend: opens Razorpay JS Checkout modal
        |
        v  (user pays)
        |
  Frontend: POST /api/v1/payments/verify
    { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        |
        v
  PaymentService.verifyPayment()
    HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
    crypto.timingSafeEqual(expected, provided_signature)
        |
        v  (valid)
  OrderService.markPaid(orderId, paymentId)
  AuditLog(PAYMENT_VERIFIED)
        |
        v  (async — from Razorpay servers)
  POST /webhooks/razorpay
    Verified with HMAC of raw body + webhook_secret
  OrderService.confirmPaymentCapture()
  AuditLog(ORDER_COMPLETED)
```

### Payment State Machine

```
ORDER_CREATED
    |
    v  [paymentInitTool called]
PAYMENT_INITIATED
    |
    v  [user pays in Razorpay modal]
PAYMENT_PROCESSING
    |
    +--[HMAC valid]--> PAYMENT_VERIFIED
    |                        |
    |                  [webhook received]
    |                        v
    |                  PAYMENT_CAPTURED --> ORDER_COMPLETE
    |
    +--[HMAC invalid]--> PAYMENT_FAILED
```

---

## 14. Webhook Handler

```typescript
// webhooks/razorpayWebhook.ts
// IMPORTANT: Uses express.raw() — raw body preserved for HMAC

router.post('/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody   = req.body as Buffer;

    // Step 1: Verify HMAC before parsing
    const valid = verifyWebhookHMAC(rawBody, signature, WEBHOOK_SECRET);
    if (!valid) {
      await AuditLogger.record({ eventType: 'WEBHOOK_INVALID_SIGNATURE' });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Step 2: Parse only after verification
    const event = JSON.parse(rawBody.toString());
    await AuditLogger.record({ eventType: 'WEBHOOK_RECEIVED', payload: event });

    // Step 3: Handle event type
    switch (event.event) {
      case 'payment.captured':
        await OrderService.confirmPaymentCapture(event.payload.payment.entity.id);
        break;
      case 'payment.failed':
        await OrderService.markPaymentFailed(event.payload.payment.entity.id);
        break;
    }

    res.status(200).json({ status: 'ok' });
  }
);
```

---

## 15. Audit Logger

### Design

- Append-only: the application database user has UPDATE/DELETE revoked on audit_events
- Non-blocking: AuditLogger.record() never throws — failure is logged but does not break the main operation
- Sanitized: sensitive field names (password, secret, key, token, signature) are redacted before storage

```typescript
// audit/auditLogger.ts

class AuditLogger {
  static async record(event: AuditEventInput): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_events
         (event_type, user_id, session_id, actor, entity_type,
          entity_id, payload, result, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          event.eventType,
          event.userId,
          event.sessionId,
          event.actor,
          event.entityType,
          event.entityId,
          sanitizePayload(event.payload),
          event.result,
          event.ipAddress,
          event.userAgent,
        ]
      );
    } catch (err) {
      console.error('[AuditLogger] Failed to write event:', err);
    }
  }
}

function sanitizePayload(payload: unknown): unknown {
  // Recursively redact any key containing:
  // password, secret, key, token, signature, hash
  // Truncate string values > 1000 characters
}
```

### Required Audit Events

| Event Type | Triggered When |
|---|---|
| USER_REGISTER | New user registration |
| USER_LOGIN | Successful login |
| USER_LOGOUT | Logout or token revocation |
| AGENT_SESSION_START | ShoppingAgent.invoke() begins |
| AGENT_SESSION_END | ShoppingAgent.invoke() completes |
| AGENT_TOOL_CALL | Any tool execution (attempted + success) |
| TOOL_VALIDATION_FAILED | Zod schema rejection |
| UNKNOWN_TOOL_ATTEMPT | Agent tries unregistered tool name |
| PERMISSION_DENIED | RBAC rejection |
| POLICY_VIOLATION | PolicyEngine denial |
| CART_ITEM_ADDED | Item added to cart |
| CART_ITEM_REMOVED | Item removed from cart |
| CART_ITEM_UPDATED | Cart item quantity changed |
| ORDER_CREATED | New order from cart |
| PAYMENT_INITIATED | Razorpay order created |
| PAYMENT_VERIFIED | HMAC verification passed |
| PAYMENT_FAILED | HMAC verification failed |
| WEBHOOK_RECEIVED | Razorpay webhook arrived |
| WEBHOOK_VERIFIED | Webhook HMAC valid |
| WEBHOOK_INVALID_SIGNATURE | Webhook HMAC invalid |
| WEBHOOK_PAYMENT_CAPTURED | payment.captured event processed |
| ORDER_COMPLETED | Order moved to final state |

---

## 16. Error Handling

### Error Class Hierarchy

```typescript
// utils/errors.ts

class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true) {}
}

class NotFoundError extends AppError       // 404
class ForbiddenError extends AppError      // 403
class UnauthorizedError extends AppError   // 401
class ValidationError extends AppError     // 400
class PolicyError extends AppError         // 403
class PaymentVerificationError extends AppError  // 400
class ToolNotFoundError extends AppError   // 400
class ConflictError extends AppError       // 409
```

### Global Error Handler

```typescript
app.use((err, req, res, next) => {
  // Always log full error with stack trace server-side
  logger.error({ err, path: req.path, userId: req.user?.userId });

  if (err.isOperational) {
    // Known error — safe to surface code and message
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  }

  // Unknown error — return generic message, never stack trace
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
});
```

---

## 17. Configuration and Environment

```typescript
// config/env.ts

const required = [
  'GEMINI_API_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET', 'DATABASE_URL', 'REDIS_URL',
  'JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'FRONTEND_ORIGIN', 'NODE_ENV',
];

// Fail fast — do not start server with missing secrets
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

export const config = {
  port:              parseInt(process.env.PORT ?? '3001'),
  geminiApiKey:      process.env.GEMINI_API_KEY!,
  razorpayKeyId:     process.env.RAZORPAY_KEY_ID!,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret:     process.env.RAZORPAY_WEBHOOK_SECRET!,
  databaseUrl:       process.env.DATABASE_URL!,
  redisUrl:          process.env.REDIS_URL!,
  jwtPrivateKey:     process.env.JWT_PRIVATE_KEY!,
  jwtPublicKey:      process.env.JWT_PUBLIC_KEY!,
  frontendOrigin:    process.env.FRONTEND_ORIGIN!,
  nodeEnv:           process.env.NODE_ENV!,
  jwtExpiry:         process.env.JWT_EXPIRY ?? '1h',
  bcryptRounds:      parseInt(process.env.BCRYPT_ROUNDS ?? '12'),
};
```

---

## 18. TypeScript Type System

```typescript
// types/order.ts
enum OrderStatus {
  CREATED            = 'CREATED',
  PAYMENT_INITIATED  = 'PAYMENT_INITIATED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_VERIFIED   = 'PAYMENT_VERIFIED',
  PAYMENT_CAPTURED   = 'PAYMENT_CAPTURED',
  PAYMENT_FAILED     = 'PAYMENT_FAILED',
  ORDER_COMPLETE     = 'ORDER_COMPLETE',
  CANCELLED          = 'CANCELLED',
}

// types/payment.ts
enum PaymentStatus {
  INITIATED = 'INITIATED',
  VERIFIED  = 'VERIFIED',
  CAPTURED  = 'CAPTURED',
  FAILED    = 'FAILED',
  REFUNDED  = 'REFUNDED',
}

// types/agent.ts
interface ToolContext {
  userId: string;
  sessionId: string;
  role: 'customer' | 'admin';
  ipAddress: string;
}
```

### Type Safety Rules

- No `any` types in production code (tsconfig: `"strict": true`)
- All route handler request bodies typed with Zod (parse at boundary, typed thereafter)
- All DB row types defined in types/ (no `rows[0]` without assertion)
- All tool inputs and outputs typed via generics on ApprovedTool<TInput, TOutput>

---

## 19. Testing Strategy

### Unit Tests

| File | What to Test |
|---|---|
| policies/policyEngine.ts | cart_ownership, inventory_available, order_ownership, order_ready_for_payment |
| tools/toolValidator.ts | Unknown tool -> reject, Schema fail -> reject, Permission deny -> reject |
| services/payment/paymentService.ts | HMAC valid, HMAC invalid, timingSafeEqual behavior |
| audit/auditLogger.ts | Payload sanitization (redact secret/key/token fields) |
| services/user/userService.ts | bcrypt hash, JWT sign, refresh, revocation |
| services/cart/cartService.ts | Inventory check, ownership check, upsert logic |

### Integration Tests

| Scenario | Expected |
|---|---|
| POST /auth/login (valid) | 200, JWT + refreshToken cookie |
| POST /auth/login (wrong password) | 401, no token |
| POST /chat/message (unauthenticated) | 401 |
| POST /chat/message (injection attempt) | 200 with safe response, PolicyViolation in audit |
| POST /cart/items (other user's cart) | 403 |
| POST /payments/verify (invalid HMAC) | 400 |
| POST /webhooks/razorpay (invalid sig) | 400, WEBHOOK_INVALID_SIGNATURE in audit |

### E2E Tests

```
Full Commerce Flow:
  Register
  -> Login
  -> GET /products (browse)
  -> POST /chat/message ("find me a laptop under 80000")
  -> POST /cart/items (add recommended product)
  -> POST /orders (create order)
  -> POST /payments/initiate (get Razorpay order ID)
  -> POST /payments/verify (mock Razorpay callback with valid HMAC)
  -> POST /webhooks/razorpay (mock Razorpay webhook with valid HMAC)
  -> GET /orders/:id (verify ORDER_COMPLETE status)
  -> GET /audit (verify full event trail — admin token)
```

---

## 20. Full Request Lifecycle

### Example: "Add the Dell XPS 15 to my cart" via AI chat

```
1.  POST /api/v1/chat/message
    Body: { "message": "Add the Dell XPS 15 to my cart" }
    Header: Authorization: Bearer eyJhbGc...

2.  Middleware pipeline:
    helmet -> cors -> json parser -> rate limiter -> sanitize

3.  jwt.ts:
    Verify RS256 -> req.user = { userId: "u-001", role: "customer", sessionId: "s-001" }

4.  routes/chat.ts:
    Parse message, call ShoppingAgent.invoke("Add the Dell XPS 15 to my cart")

5.  ShoppingAgent (LangGraph):
    Node: intentClassifier
      Gemini Pro: intent = ADD_TO_CART, productQuery = "Dell XPS 15"

6.  ShoppingAgent:
    Node: cartFlow
      Resolve product ID via ProductService.search("Dell XPS 15") -> product "p-123"
      Select tool: cartWriteTool

7.  toolValidator.validateAndExecute("cartWriteTool", params, context):
    [Layer 1] Registry: cartWriteTool exists
    [Layer 2] Zod: { cartId: "c-001", action: "add", productId: "p-123", quantity: 1 } valid
    [Layer 3] AgentPermissions: customer role can call cartWriteTool
    [Layer 4] PolicyEngine:
      cart_ownership: fetch cart c-001 -> cart.userId = "u-001" === context.userId  PASS
      inventory_available: product inventory = 12 >= 1  PASS
    AuditLog(AGENT_TOOL_CALL, tool=cartWriteTool, status=attempted)

8.  cartWriteTool.execute() -> CartService.addItem("c-001", "p-123", 1, "u-001")
    Service-level ownership re-check: PASS
    Service-level inventory re-check: PASS
    INSERT cart_items: { cart_id: c-001, product_id: p-123, quantity: 1, unit_price: 149999 }
    Invalidate Redis: cart:u-001
    AuditLog(CART_ITEM_ADDED)

9.  Tool output sanitized -> remove cost_price, supplier fields

10. AuditLog(AGENT_TOOL_CALL, tool=cartWriteTool, status=success)

11. ShoppingAgent:
    Node: responseGenerator
      Gemini Pro: "Great! I've added the Dell XPS 15 to your cart.
                   Your cart total is now Rs. 1,49,999."

12. Node: auditLog -> flush all events to DB

13. HTTP 200:
    {
      "message": "Great! I've added the Dell XPS 15 to your cart...",
      "cartSummary": { "itemCount": 1, "total": 149999 }
    }

14. Frontend updates cart badge and chat history
```

**Security layers traversed:** HTTP -> Auth -> Rate Limit -> Sanitize -> JWT -> Route -> ShoppingAgent -> intentClassifier -> cartFlow -> ToolRegistry [4 layers] -> PolicyEngine [2 rules] -> CartService [2 checks] -> Repository -> PostgreSQL -> Redis -> AuditLogger -> responseGenerator -> AuditFlush -> Response

---

*End of CommerceAI Backend Architecture Document*
