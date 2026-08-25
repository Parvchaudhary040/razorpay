# CommerceAI — System Architecture

> **Version:** 1.0.0 — Initial Design
> **Date:** 2026-08-24
> **Status:** Planning Phase — Awaiting Implementation Approval

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Map](#2-component-map)
3. [Trust Boundaries](#3-trust-boundaries)
4. [Data Flow](#4-data-flow)
5. [AI Agent Flow](#5-ai-agent-flow)
6. [Tool Flow (MCP)](#6-tool-flow-mcp)
7. [Payment Flow (Razorpay)](#7-payment-flow-razorpay)
8. [Database Flow](#8-database-flow)
9. [Repository Structure](#9-repository-structure)
10. [Technology Decisions](#10-technology-decisions)

---

## 1. System Overview

CommerceAI is a real-world **agentic commerce platform** that exposes an AI-powered shopping assistant to end customers. The assistant can:

- Understand natural-language product queries
- Search and discover products (semantic + keyword)
- Compare products side-by-side
- Recommend products based on user context
- Add/remove/update items in a cart
- Create and manage orders
- Initiate and verify Razorpay Test Mode payments
- Receive Razorpay webhook confirmations
- Maintain a fully auditable event trail

The AI is **never** the final authority for payments, permissions, order state, or inventory truth. All consequential actions are gated through validated, typed, approved business services.

---

## 2. Component Map

```
+-------------------------------------------------------------------------+
|                         CUSTOMER BROWSER                                |
|                                                                         |
|   +-------------+  +--------------+  +--------------+  +-----------+   |
|   |  ChatWindow  |  | ProductCards |  |  CartPage    |  | AuditPage |   |
|   |  (React)     |  |  (React)     |  |  (React)     |  |  (React)  |   |
|   +------+-------+  +------+-------+  +------+-------+  +-----+-----+   |
|          |                 |                  |                |         |
|          +-----------------+------------------+----------------+         |
|                                      |                                   |
|                              Vite + React + TS                           |
|                              Tailwind CSS + Zustand                      |
+-------------------------------------+-----------------------------------+
                                      | HTTPS (JWT Bearer)
                                      v
+-------------------------------------+-----------------------------------+
|                         NGINX REVERSE PROXY                             |
|                  (TLS termination, static file serving)                 |
+-------------------------------------+-----------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------+
|                      EXPRESS + TYPESCRIPT BACKEND                       |
|                                                                         |
|  +--------------+  +-----------------+  +---------------------------+   |
|  |  Auth Layer  |  |  Route Layer     |  |   Webhook Handler         |   |
|  |  JWT + RBAC  |  |  /api/v1/*      |  |  /webhooks/razorpay       |   |
|  +------+-------+  +--------+--------+  +---------------------------+   |
|         |                   |                                           |
|         v                   v                                           |
|  +-------------------------------------------------------------------+  |
|  |                    POLICY ENGINE                                  |  |
|  |   Validates every agent action against permission rules           |  |
|  +----------------------------+--------------------------------------+  |
|                               |                                         |
|          +--------------------+-------------------+                     |
|          v                                        v                     |
|  +-----------------------+          +---------------------------+       |
|  |   AI AGENT LAYER      |          |   BUSINESS SERVICE LAYER  |       |
|  |  (LangGraph Workflow) |          |  ProductService           |       |
|  |  ShoppingAgent        +-approved>|  CartService              |       |
|  |  AgentPermissions     |  tools   |  OrderService             |       |
|  +-----------------------+          |  PaymentService           |       |
|                                     |  RecommendationService    |       |
|                                     |  UserService              |       |
|                                     +--------------+------------+       |
+-----------------------------------------------------------+-------------+
                                                            |
                      +------------------------------------++-----------+
                      v                                    v            v
          +-------------------+         +-----------------+  +------------------+
          |   PostgreSQL 16   |         |   Redis 7       |  |  Razorpay API    |
          |   + pgvector      |         |  (Cache/Session)|  |  (Test Mode)     |
          |   (Primary Store) |         +-----------------+  +------------------+
          +-------------------+
```

---

## 3. Trust Boundaries

### Trust Level 0 — External / Untrusted
- Customer browser (React frontend)
- Razorpay webhook callbacks
- Public internet

**Controls:** HTTPS only, strict CORS, JWT authentication, webhook HMAC signature verification, request rate limiting.

### Trust Level 1 — Authenticated User
- Logged-in customer session with a valid JWT
- Claims: `userId`, `role`, `sessionId`, `iat`, `exp`

**Controls:** JWT verification middleware, role-based access control (RBAC), session expiry.

### Trust Level 2 — AI Agent Layer
- LangGraph ShoppingAgent running inside the backend process
- Can **only** invoke pre-approved MCP tools
- Cannot directly call business services, DB, or Redis
- Cannot execute shell commands or arbitrary HTTP requests

**Controls:** Approved tool registry, AgentPermissions checker, PolicyEngine validation before every tool invocation, input/output schema validation (Zod).

### Trust Level 3 — Business Service Layer
- ProductService, CartService, OrderService, PaymentService
- These are the **authority** for all consequential state changes
- Directly query PostgreSQL and Redis through typed repositories
- Payment operations call Razorpay SDK, never exposed to AI

**Controls:** Repository pattern (no raw SQL from services), parameterized queries, transaction management, audit logging on every mutation.

### Trust Level 4 — Infrastructure
- PostgreSQL, Redis
- Only accessible from backend process network
- Not exposed to any public network interface

**Controls:** Docker network isolation, credentials via environment variables, no direct AI access, no direct agent access.

```
  [Browser] --JWT--> [Express] --PolicyEngine--> [Agent] --approved tools--> [Services] --> [DB/Redis]
                                                    X                            X
                                             no direct DB               no raw credentials
                                             no raw HTTP                no shell access
```

---

## 4. Data Flow

### 4.1 Request Flow (Happy Path)

```
Customer
  |
  |  1. HTTPS POST /api/v1/chat/message   (JWT Bearer token)
  v
Nginx
  |  2. Proxy to backend:3001
  v
Express Auth Middleware
  |  3. Verify JWT => extract userId, role
  |  4. Rate limit check
  v
Route Handler (/routes/chat.ts)
  |  5. Parse and sanitize input
  v
Policy Engine
  |  6. Check user permissions for chat action
  v
AI Agent (LangGraph ShoppingAgent)
  |  7. Execute workflow graph with user message
  |  8. Gemini Pro: interpret intent
  |  9. Select approved tool(s)
  v
Tool Validator
  |  10. Validate tool call schema (Zod)
  |  11. Check AgentPermissions for this tool
  |  12. PolicyEngine re-validates tool action
  v
Approved Tool (e.g., productSearchTool)
  |  13. Call ProductService.search()
  v
ProductService
  |  14. Query PostgreSQL via Repository (parameterized)
  |  15. Check Redis cache first
  |  16. Write audit log entry
  v
Response bubbles back
  |  17. Tool result => Agent context
  |  18. Agent generates human response
  |  19. Audit log: agent response recorded
  |  20. HTTP 200 JSON to frontend
  v
Frontend renders AI response
```

### 4.2 Session and State

- Conversation history stored in Redis with TTL (session-scoped)
- Persistent conversation state stored in PostgreSQL
- Cart state: PostgreSQL (source of truth) + Redis cache (read performance)
- Order state: PostgreSQL only (no cache — always fresh reads for orders)

---

## 5. AI Agent Flow

### 5.1 LangGraph Shopping Agent

The core AI workflow is implemented as a **LangGraph StateGraph** with the following nodes:

```
                    +--------------+
                    |  START NODE  |
                    |  (user msg)  |
                    +------+-------+
                           |
                    +------v-------+
                    |  INTENT      |
                    |  CLASSIFIER  |<-- Gemini Pro
                    +------+-------+
                           |
         +-----------------+-----------------------+
         |                 |                       |
  +------v-------+  +------v-------+  +-----------v------+
  |  SEARCH      |  |  CART        |  |  ORDER/PAYMENT   |
  |  FLOW        |  |  FLOW        |  |  FLOW            |
  +------+-------+  +------+-------+  +-----------+------+
         |                 |                       |
  +------v-------+  +------v-------+  +-----------v------+
  |  TOOL        |  |  TOOL        |  |  TOOL            |
  |  EXECUTION   |  |  EXECUTION   |  |  EXECUTION       |
  |  (approved)  |  |  (approved)  |  |  (approved)      |
  +------+-------+  +------+-------+  +-----------+------+
         |                 |                       |
         +-----------------+-----------------------+
                           |
                    +------v-------+
                    |  RESPONSE    |
                    |  GENERATOR   |<-- Gemini Pro
                    +------+-------+
                           |
                    +------v-------+
                    |  AUDIT LOG   |
                    +--------------+
```

### 5.2 Agent State Schema

```typescript
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
}
```

### 5.3 Gemini Pro Integration

- Model: `gemini-pro` via `@langchain/google-genai`
- System prompt enforces: role boundaries, no PII logging, no credential exposure
- Temperature: 0.3 (deterministic for commerce actions)
- Tool calling: structured via LangChain tool definitions, validated with Zod before execution
- Context window management: Redis-backed sliding window conversation history

### 5.4 LangGraph vs LangChain Decision

| Use Case | Technology |
|---|---|
| Multi-step shopping workflow with conditional branches | LangGraph StateGraph |
| Single-step LLM calls (intent classification, response gen) | LangChain LCEL chains |
| Memory management | LangChain + Redis memory |
| Tool definitions | LangChain tool schema |
| Tool execution guard | Custom PolicyEngine (not LangChain) |

---

## 6. Tool Flow (MCP)

### 6.1 Approved Tool Registry

The AI agent can **only** invoke tools listed in the approved registry. No dynamic tool loading. No arbitrary HTTP. No filesystem.

| Tool Name | Permitted Actions | Requires Auth | Policy Check |
|---|---|---|---|
| productSearchTool | Search products by query/filters | No (public search) | Input sanitization |
| productCompareTool | Compare 2-4 products by ID | No | ID validation |
| recommendTool | Get recommendations for user | Yes (userId) | User ownership |
| cartReadTool | Read cart contents | Yes | Cart ownership |
| cartWriteTool | Add/remove/update cart items | Yes | Cart ownership + inventory check |
| orderStatusTool | Read order status | Yes | Order ownership |
| paymentInitTool | Create payment intent (returns order_id only) | Yes | Order ownership, no credentials exposed |

### 6.2 Tool Validation Chain

```
Agent calls tool(name, params)
        |
        v
ToolRegistry.get(name)
  -- not found? --> REJECT (AuditLog: unknown_tool_attempt)
        |
        v
Zod schema validation of params
  -- fail? --> REJECT (AuditLog: invalid_tool_params)
        |
        v
AgentPermissions.check(userId, tool, params)
  -- deny? --> REJECT (AuditLog: permission_denied)
        |
        v
PolicyEngine.evaluate(action, context)
  -- deny? --> REJECT (AuditLog: policy_violation)
        |
        v
Tool.execute(validated_params)
        |
        v
BusinessService.method(validated_params)
        |
        v
AuditLog.record(tool, params, result, userId)
        |
        v
Return sanitized result to agent
```

### 6.3 MCP Server Layout

Each MCP server is a thin, typed wrapper that exposes exactly the approved tools for a domain. The MCP servers run **within the backend process** — they do not expose a separate network port in the initial architecture.

```
mcp-servers/
  product-search/     <- productSearchTool, productCompareTool, recommendTool
  cart-manager/       <- cartReadTool, cartWriteTool
  order-manager/      <- orderStatusTool
  payment-gateway/    <- paymentInitTool  (read-only: returns order ID)
  user-context/       <- userPreferences (read-only)
```

---

## 7. Payment Flow (Razorpay)

### 7.1 Design Principles

- The LLM never sees Razorpay credentials. Key ID and Key Secret are backend-only env vars.
- The LLM never authorizes a payment. It can only request a payment intent via paymentInitTool, which returns an order_id.
- Payment authorization is done by the user in the browser via Razorpay's official JS SDK.
- Payment verification is done by the backend using HMAC-SHA256 signature verification.
- Webhook confirmation provides the final authoritative order state update.

### 7.2 Payment Sequence

```
User: "Proceed to checkout"
       |
       v
Agent: paymentInitTool(orderId)  [approved tool]
       |
       v
PaymentService.createRazorpayOrder(orderId, amount, currency)
       |  -> calls Razorpay SDK (server-side)
       |  -> stores razorpay_order_id in DB
       |  <- returns { razorpay_order_id, amount, currency }
       |
       v
Backend API response to frontend:
  { razorpay_order_id, razorpay_key_id, amount, currency }
  (key_secret NEVER sent to frontend)
       |
       v
Frontend: opens Razorpay JS Checkout modal
       |
       v (user pays in Razorpay modal)
       |
       v
Frontend: POST /api/v1/payments/verify
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
       |
       v
Backend: PaymentService.verifyPayment()
  HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
  === razorpay_signature  ?  VALID : REJECT
       |
       v (valid)
OrderService.markPaid(orderId)  [DB transaction]
AuditLogger.record(PAYMENT_VERIFIED, userId, orderId, paymentId)
       |
       v (async - from Razorpay servers)
POST /webhooks/razorpay
  X-Razorpay-Signature: <hmac>
  body: { event: "payment.captured", ... }
       |
       v
Backend: verify webhook HMAC signature
OrderService.confirmPaymentCapture(razorpay_payment_id)
AuditLogger.record(WEBHOOK_PAYMENT_CAPTURED, ...)
```

### 7.3 Payment State Machine

```
ORDER_CREATED
    |
    v  (paymentInitTool called)
PAYMENT_INITIATED
    |
    v  (user pays in browser)
PAYMENT_PROCESSING
    |
    +-- verify HMAC success --> PAYMENT_VERIFIED
    |                               |
    |                               v (webhook)
    |                          PAYMENT_CAPTURED --> ORDER_COMPLETE
    |
    +-- verify HMAC fail --> PAYMENT_FAILED
```

---

## 8. Database Flow

### 8.1 Schema Overview

```sql
-- Users
users (id UUID PK, email, password_hash, role, created_at, updated_at)

-- Products
products (id UUID PK, name, description, price, inventory_count,
          category, metadata JSONB, embedding vector(1536), created_at)

-- Cart
carts (id UUID PK, user_id FK, status, created_at, updated_at)
cart_items (id UUID PK, cart_id FK, product_id FK, quantity, unit_price, added_at)

-- Orders
orders (id UUID PK, user_id FK, cart_id FK, status, total_amount,
        razorpay_order_id, razorpay_payment_id, created_at, updated_at)
order_items (id UUID PK, order_id FK, product_id FK, quantity, unit_price)

-- Payments
payments (id UUID PK, order_id FK, user_id FK, razorpay_order_id,
          razorpay_payment_id, razorpay_signature, status,
          amount, currency, created_at, verified_at, captured_at)

-- Audit
audit_events (id UUID PK, event_type, user_id, session_id,
              entity_type, entity_id, actor TEXT,
              payload JSONB, ip_address INET, created_at)

-- Sessions
agent_sessions (id UUID PK, user_id FK, session_id, context JSONB,
                created_at, updated_at, expires_at)
```

### 8.2 Data Access Pattern

```
Request
  |
  v
BusinessService  (validation, business logic)
  |
  v
Repository  (typed DB access, parameterized queries only)
  |
  +---> Redis Cache  (read-through, TTL-based)
  |          |
  |          +-- MISS --> PostgreSQL --> populate cache
  |
  +--> PostgreSQL  (write-through for mutations)
            |
            +--> AuditLogger (every mutation logs event)
```

### 8.3 pgvector Semantic Search

- Product descriptions are embedded using Gemini text-embedding-004 model
- Embeddings stored in products.embedding vector(1536)
- productSearchTool uses cosine similarity: ORDER BY embedding <=> $query_embedding
- Hybrid search: semantic similarity + keyword fallback (PostgreSQL full-text search)
- Embeddings are generated at product ingestion time, not at query time

### 8.4 Repository Pattern Rules

1. No raw SQL outside Repository classes
2. All queries use parameterized statements
3. Transactions managed at Service layer, not Repository layer
4. No ORM (deliberate — full control over query plans)
5. Every write operation calls AuditLogger.record() before returning

---

## 9. Repository Structure

```
razorpay/
|-- docs/
|   |-- ARCHITECTURE.md          <- This file
|   +-- SECURITY.md              <- Security design
|
|-- backend/                     <- Express + TypeScript
|   +-- src/
|       |-- index.ts             <- App entry point
|       |-- app.ts               <- Express configuration
|       |-- config/env.ts        <- Env var loader
|       |-- agents/              <- LangGraph ShoppingAgent
|       |-- tools/approved/      <- All MCP tools (approved list)
|       |-- mcp/                 <- MCP server definitions
|       |-- policies/            <- PolicyEngine + rules
|       |-- middleware/auth/     <- JWT + authorization
|       |-- middleware/security/ <- Rate limit, sanitize
|       |-- routes/              <- Express routes
|       |-- services/            <- Business logic
|       |-- db/                  <- Pool, migrations, seeds
|       |-- cache/               <- Redis client + service
|       |-- audit/               <- Audit logger
|       |-- webhooks/            <- Razorpay webhook handler
|       +-- types/               <- TypeScript type definitions
|
|-- frontend/                    <- React + Vite + TypeScript + Tailwind
|   +-- src/
|       |-- components/          <- Chat, Product, Cart, Payment, Audit
|       |-- pages/               <- Route-level pages
|       |-- hooks/               <- Custom React hooks
|       |-- store/               <- Zustand state management
|       |-- services/            <- API client + domain APIs
|       +-- types/               <- Frontend types
|
|-- ai/                          <- AI layer (LangGraph + LangChain)
|   |-- graphs/                  <- LangGraph StateGraphs
|   |-- chains/                  <- LangChain LCEL chains
|   |-- prompts/                 <- System + domain prompts
|   |-- memory/                  <- Conversation memory
|   +-- embeddings/              <- pgvector embedding service
|
|-- mcp-servers/                 <- Domain MCP server stubs
|
|-- infra/
|   |-- docker/                  <- Dockerfiles + compose files
|   |-- nginx/                   <- Reverse proxy config
|   |-- postgres/init/           <- DB init scripts
|   +-- scripts/                 <- migrate + seed scripts
|
|-- secrets/                     <- gitignored, local secrets only
|-- .env.example                 <- Env template (no real values)
|-- .gitignore
+-- package.json                 <- Monorepo root
```

---

## 10. Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| LLM | Gemini Pro (google-genai) | Current, production-ready, structured tool calling |
| AI Framework | LangChain + LangGraph | LangChain for chains; LangGraph for stateful multi-step workflows |
| Tool Protocol | MCP | Standard, auditable, schema-validated tool boundary |
| Backend | Express + TypeScript | Mature, typed, wide ecosystem |
| Database | PostgreSQL 16 + pgvector | Single DB for all data + semantic search; no extra infra |
| Cache | Redis 7 | Session storage, cart caching, conversation history TTL |
| Payment | Razorpay (Test Mode) | HMAC-verified; credentials never touch AI layer |
| Frontend | React + Vite + Tailwind | Fast build, typed, component-based |
| State Mgmt | Zustand | Lightweight, TypeScript-native |
| Containers | Docker + Docker Compose | Reproducible dev + prod environments |
| Auth | JWT (RS256) | Stateless, verifiable, role-claims embedded |
| Secret Mgmt | Env vars + Docker secrets (prod) | No hardcoded secrets, gitignored |
| Audit | PostgreSQL audit_events table | Immutable, queryable, co-located with business data |
