# CommerceAI — MCP Servers Architecture

> **Version:** 1.0.0
> **Date:** 2026-08-24
> **Protocol:** Model Context Protocol (MCP)

---

## Table of Contents

1. [Overview](#1-overview)
2. [MCP in CommerceAI](#2-mcp-in-commerceai)
3. [Folder Structure](#3-folder-structure)
4. [Tool Registry and Validation](#4-tool-registry-and-validation)
5. [MCP Server: product-search](#5-mcp-server-product-search)
6. [MCP Server: cart-manager](#6-mcp-server-cart-manager)
7. [MCP Server: order-manager](#7-mcp-server-order-manager)
8. [MCP Server: payment-gateway](#8-mcp-server-payment-gateway)
9. [MCP Server: user-context](#9-mcp-server-user-context)
10. [Tool Schema Definitions](#10-tool-schema-definitions)
11. [Security Model](#11-security-model)
12. [Adding a New Tool](#12-adding-a-new-tool)
13. [Full Tool Invocation Trace](#13-full-tool-invocation-trace)

---

## 1. Overview

The MCP servers in CommerceAI implement the **Model Context Protocol** — a standard protocol that defines how AI models interact with external tools and resources. Each MCP server exposes a group of domain-specific tools that the LangGraph shopping agent can call.

### Why MCP

- Standard, auditable protocol for AI-tool interaction
- Schema-validated inputs and outputs
- Tool definitions are explicit and discoverable
- Separates tool *definition* (MCP) from tool *execution policy* (backend PolicyEngine)

---

## 2. MCP in CommerceAI

### Architecture Position

```
LangGraph ShoppingAgent
        |
        v [proposes tool call]
ToolValidator (backend/src/tools/toolValidator.ts)
  -- Registry check
  -- Zod validation
  -- AgentPermissions check
  -- PolicyEngine check
        |
        v [approved]
MCP Server (in-process, within backend)
  -- Resolves tool definition
  -- Calls underlying business service
        |
        v
Business Service (ProductService, CartService, etc.)
        |
        v
PostgreSQL / Redis
```

### MCP Deployment Mode

In the initial architecture, MCP servers run **in-process** within the backend Node.js process. They do not expose separate network ports. This simplifies the initial setup while preserving the MCP protocol boundaries.

Future: MCP servers can be extracted to separate microservices if scaling requires it.

---

## 3. Folder Structure

```
mcp-servers/
+-- product-search/
|   +-- index.ts     Exposes: productSearchTool, productCompareTool, recommendTool
|
+-- cart-manager/
|   +-- index.ts     Exposes: cartReadTool, cartWriteTool
|
+-- order-manager/
|   +-- index.ts     Exposes: orderStatusTool
|
+-- payment-gateway/
|   +-- index.ts     Exposes: paymentInitTool
|
+-- user-context/
    +-- index.ts     Exposes: userPreferencesTool (read-only)
```

---

## 4. Tool Registry and Validation

```typescript
// backend/src/tools/toolRegistry.ts

// The registry is the single source of truth for all approved tools.
// It is defined at compile time and cannot be modified at runtime.

export const TOOL_REGISTRY: Record<string, ApprovedTool> = {
  productSearchTool:    productSearchServer.getTool('productSearchTool'),
  productCompareTool:   productSearchServer.getTool('productCompareTool'),
  recommendTool:        productSearchServer.getTool('recommendTool'),
  cartReadTool:         cartManagerServer.getTool('cartReadTool'),
  cartWriteTool:        cartManagerServer.getTool('cartWriteTool'),
  orderStatusTool:      orderManagerServer.getTool('orderStatusTool'),
  paymentInitTool:      paymentGatewayServer.getTool('paymentInitTool'),
};
```

### ApprovedTool Interface

```typescript
interface ApprovedTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: ZodSchema<TInput>;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
  sanitizeOutput(output: TOutput): Partial<TOutput>;
}
```

---

## 5. MCP Server: product-search

```typescript
// mcp-servers/product-search/index.ts

export const productSearchServer = {
  name: 'product-search',
  version: '1.0.0',
  tools: {

    productSearchTool: {
      name: 'productSearchTool',
      description: 'Search for products using natural language query and optional filters.',
      inputSchema: z.object({
        query:     z.string().min(1).max(500).trim(),
        category:  z.string().optional(),
        minPrice:  z.number().positive().optional(),
        maxPrice:  z.number().positive().optional(),
        limit:     z.number().int().min(1).max(50).default(10),
      }),
      execute: async (input, context) => {
        // Calls ProductService.search()
        // pgvector semantic search + keyword fallback
        return ProductService.search(input.query, {
          category: input.category,
          minPrice:  input.minPrice,
          maxPrice:  input.maxPrice,
          limit:     input.limit,
        });
      },
      sanitizeOutput: (products) => products.map(p => ({
        id: p.id, name: p.name, description: p.description,
        price: p.price, category: p.category,
        // cost_price, supplier, internalNotes stripped here
      })),
    },

    productCompareTool: {
      name: 'productCompareTool',
      description: 'Compare 2 to 4 products side by side by their IDs.',
      inputSchema: z.object({
        productIds: z.array(z.string().uuid()).min(2).max(4),
      }),
      execute: async (input, context) => {
        return ProductService.compare(input.productIds);
      },
      sanitizeOutput: (result) => result,
    },

    recommendTool: {
      name: 'recommendTool',
      description: 'Get personalized product recommendations for the current user.',
      inputSchema: z.object({
        userId: z.string().uuid(),
        limit:  z.number().int().min(1).max(20).default(5),
      }),
      execute: async (input, context) => {
        // PolicyEngine ensures input.userId === context.userId
        return RecommendationService.forUser(input.userId, input.limit);
      },
      sanitizeOutput: (products) => products.map(p => ({
        id: p.id, name: p.name, price: p.price, category: p.category,
      })),
    },
  },
};
```

---

## 6. MCP Server: cart-manager

```typescript
// mcp-servers/cart-manager/index.ts

export const cartManagerServer = {
  name: 'cart-manager',
  version: '1.0.0',
  tools: {

    cartReadTool: {
      name: 'cartReadTool',
      description: 'Read the current contents and total of the user cart.',
      inputSchema: z.object({
        cartId: z.string().uuid(),
      }),
      execute: async (input, context) => {
        // PolicyEngine has already verified cart ownership
        return CartService.getCart(input.cartId);
      },
      sanitizeOutput: (cart) => ({
        id: cart.id,
        items: cart.items.map(i => ({
          id: i.id, productId: i.productId,
          productName: i.product.name,
          quantity: i.quantity, unitPrice: i.unitPrice,
        })),
        itemCount: cart.items.length,
        total: cart.total,
      }),
    },

    cartWriteTool: {
      name: 'cartWriteTool',
      description: 'Add, remove, or update items in the user cart.',
      inputSchema: z.object({
        cartId:    z.string().uuid(),
        action:    z.enum(['add', 'remove', 'update']),
        productId: z.string().uuid(),
        quantity:  z.number().int().min(0).max(100),
      }),
      execute: async (input, context) => {
        // PolicyEngine has verified: cart ownership + inventory check
        switch (input.action) {
          case 'add':
            return CartService.addItem(input.cartId, input.productId, input.quantity, context.userId);
          case 'remove':
            return CartService.removeItem(input.cartId, input.productId, context.userId);
          case 'update':
            return CartService.updateItem(input.cartId, input.productId, input.quantity, context.userId);
        }
      },
      sanitizeOutput: (cart) => ({
        itemCount: cart.items.length,
        total: cart.total,
        lastAction: 'success',
      }),
    },
  },
};
```

---

## 7. MCP Server: order-manager

```typescript
// mcp-servers/order-manager/index.ts

export const orderManagerServer = {
  name: 'order-manager',
  version: '1.0.0',
  tools: {

    orderStatusTool: {
      name: 'orderStatusTool',
      description: 'Check the status and details of an order.',
      inputSchema: z.object({
        orderId: z.string().uuid(),
      }),
      execute: async (input, context) => {
        // PolicyEngine has verified order ownership
        return OrderService.getOrder(input.orderId, context.userId);
      },
      sanitizeOutput: (order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        // razorpay_payment_id stripped — not needed in agent context
      }),
    },
  },
};
```

---

## 8. MCP Server: payment-gateway

```typescript
// mcp-servers/payment-gateway/index.ts

// CRITICAL: This server only initiates a payment intent.
// It NEVER authorizes, captures, or confirms payment.
// It NEVER exposes Razorpay key_secret to the agent.

export const paymentGatewayServer = {
  name: 'payment-gateway',
  version: '1.0.0',
  tools: {

    paymentInitTool: {
      name: 'paymentInitTool',
      description: 'Initiate a payment for an order. Returns a Razorpay order ID for the frontend to open the payment modal.',
      inputSchema: z.object({
        orderId: z.string().uuid(),
      }),
      execute: async (input, context) => {
        // PolicyEngine has verified:
        //   - order belongs to context.userId
        //   - order is in CREATED or PAYMENT_FAILED status
        const result = await PaymentService.createRazorpayOrder(input.orderId, context.userId);
        return result;
        // result = { razorpay_order_id, razorpay_key_id, amount, currency }
        // key_secret is NOT in result — PaymentService never includes it
      },
      sanitizeOutput: (result) => ({
        razorpay_order_id: result.razorpay_order_id,
        amount: result.amount,
        currency: result.currency,
        // razorpay_key_id is included — needed by frontend to open modal
        razorpay_key_id: result.razorpay_key_id,
      }),
    },
  },
};
```

---

## 9. MCP Server: user-context

```typescript
// mcp-servers/user-context/index.ts

export const userContextServer = {
  name: 'user-context',
  version: '1.0.0',
  tools: {

    userPreferencesTool: {
      name: 'userPreferencesTool',
      description: 'Read the current user preferences and shopping history summary for personalization.',
      inputSchema: z.object({
        userId: z.string().uuid(),
      }),
      execute: async (input, context) => {
        // PolicyEngine ensures input.userId === context.userId
        return UserService.getPreferences(input.userId);
      },
      sanitizeOutput: (prefs) => ({
        preferredCategories: prefs.preferredCategories,
        recentlyViewedCount: prefs.recentlyViewedCount,
        totalOrders: prefs.totalOrders,
        // email, phone, password_hash, address NEVER included
      }),
    },
  },
};
```

---

## 10. Tool Schema Definitions

All tool input schemas live in `backend/src/mcp/mcpSchemas.ts` as the canonical reference.

```typescript
// backend/src/mcp/mcpSchemas.ts

export const schemas = {
  productSearch: z.object({
    query: z.string().min(1).max(500).trim(),
    category: z.string().max(100).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(50).default(10),
  }),

  productCompare: z.object({
    productIds: z.array(z.string().uuid()).min(2).max(4),
  }),

  recommend: z.object({
    userId: z.string().uuid(),
    limit: z.number().int().min(1).max(20).default(5),
  }),

  cartRead: z.object({
    cartId: z.string().uuid(),
  }),

  cartWrite: z.object({
    cartId:    z.string().uuid(),
    action:    z.enum(['add', 'remove', 'update']),
    productId: z.string().uuid(),
    quantity:  z.number().int().min(0).max(100),
  }),

  orderStatus: z.object({
    orderId: z.string().uuid(),
  }),

  paymentInit: z.object({
    orderId: z.string().uuid(),
  }),
};
```

---

## 11. Security Model

### What Each MCP Server Is Allowed to Do

| MCP Server | Allowed Operations | Forbidden |
|---|---|---|
| product-search | Read products, compute similarity | Write products, access user PII |
| cart-manager | Read/write own cart only | Access other users' carts, set prices |
| order-manager | Read own order status | Modify order status, access other orders |
| payment-gateway | Create Razorpay order intent | View key_secret, capture/refund payments |
| user-context | Read own preferences | Read other users, modify preferences |

### Key Security Properties

1. **No MCP server calls another MCP server** — all calls go through validated business services
2. **PolicyEngine runs before the MCP server executes** — ownership and state checks happen in policy layer
3. **Sanitize output runs after the MCP server executes** — sensitive fields stripped before LLM sees result
4. **MCP servers have no network exposure** — in-process only (initial architecture)
5. **payment-gateway MCP never includes key_secret** — PaymentService withholds it at the service layer

---

## 12. Adding a New Tool

### Step-by-Step Checklist

```
1. CREATE business service method
   - Add method to relevant service (e.g., ProductService.getByCategory())
   - Add parameterized repository query

2. CREATE tool in appropriate MCP server
   - Add to mcp-servers/<domain>/index.ts
   - Define: name, description, inputSchema (Zod), execute(), sanitizeOutput()

3. REGISTER tool in tool registry
   - Add entry to TOOL_REGISTRY in backend/src/tools/toolRegistry.ts

4. ADD policy rules (if needed)
   - Add rule(s) to RULES[toolName] in backend/src/policies/rules.ts

5. ADD agent permission
   - Add entry to AgentPermissions table in backend/src/agents/agentPermissions.ts

6. ADD audit event type
   - Add new event type to AuditEventType enum in backend/src/audit/auditTypes.ts

7. ADD unit tests
   - Test the tool schema (valid input, invalid input)
   - Test the policy rule (ownership check, state check)
   - Test the service method

8. UPDATE this ARCHITECTURE.md
   - Add tool to the appropriate MCP server section
   - Add to the Tool Schema Definitions section

NEVER:
- Skip PolicyEngine rule registration
- Skip AuditLogger event type registration
- Add tool without Zod input schema
- Add tool without sanitizeOutput implementation
- Modify TOOL_REGISTRY to dynamically accept new tools at runtime
```

---

## 13. Full Tool Invocation Trace

### Tool: cartWriteTool (action: add)

```
LangGraph cartFlow node proposes:
  toolValidator.validateAndExecute('cartWriteTool', {
    cartId: 'c-001', action: 'add', productId: 'p-123', quantity: 1
  }, { userId: 'u-001', sessionId: 's-001', role: 'customer', ipAddress: '...' })

[Layer 1 — Registry]
  TOOL_REGISTRY['cartWriteTool'] -> found: cartManagerServer.tools.cartWriteTool

[Layer 2 — Zod Schema]
  schemas.cartWrite.safeParse({ cartId: 'c-001', action: 'add', productId: 'p-123', quantity: 1 })
  -> success: true
  -> parsed: { cartId: 'c-001', action: 'add', productId: 'p-123', quantity: 1 }

[Layer 3 — AgentPermissions]
  AgentPermissions['customer']['cartWriteTool'] -> ALLOWED

[Layer 4 — PolicyEngine]
  Rule 1: cart_ownership
    SELECT user_id FROM carts WHERE id = 'c-001'
    -> 'u-001' === context.userId 'u-001' -> PASS
  Rule 2: inventory_available
    SELECT inventory_count FROM products WHERE id = 'p-123'
    -> 15 >= 1 -> PASS

AuditLogger.record({ eventType: 'AGENT_TOOL_CALL', result: 'attempted', ... })

[MCP Server Execution]
  cartManagerServer.tools.cartWriteTool.execute(
    { cartId: 'c-001', action: 'add', productId: 'p-123', quantity: 1 },
    { userId: 'u-001', ... }
  )
    -> CartService.addItem('c-001', 'p-123', 1, 'u-001')
    -> CartRepository.upsertItem(...)
    -> INSERT/UPDATE cart_items
    -> AuditLogger.record({ eventType: 'CART_ITEM_ADDED', ... })
    -> Return: full Cart object

[sanitizeOutput]
  Strip internal fields -> return { itemCount: 1, total: 4499, lastAction: 'success' }

AuditLogger.record({ eventType: 'AGENT_TOOL_CALL', result: 'success', ... })

Return to LangGraph state:
  toolResults.append({ tool: 'cartWriteTool', data: { itemCount: 1, total: 4499 } })
```

---

*End of CommerceAI MCP Servers Architecture Document*
