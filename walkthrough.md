# CommerceAI — Walkthrough

## Completed Phased Progress

### Phase 1 — Monorepo Root + Shared Package
- Scaffolding of the monorepo workspaces (`package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore`).
- Created `@commerce-ai/shared` containing common domain types, validation schemas (Zod), AppError classes, configuration loaders, logger, and utility helper functions.
- Verified compilation and typechecks pass clean.

### Phase 2 — Database Package (PostgreSQL Data Layer)
- Created `001_create_tables.sql` defining 15 tables with all relationships, checks, indexes, and primary key UUID constraints:
  - `users`, `merchants`, `products`, `inventory`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `audit_logs`, `agent_runs`, `tool_calls`, `policy_decisions`, `conversations`, `conversation_messages`
- Set up check constraints for state fields matching requirements (Order states: `PENDING`, `CONFIRMED`, `PAYMENT_PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`; Payment states: `CREATED`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`).
- Created `002_seed_data.sql` with 32 realistic products across Laptops, Smartphones, Headphones, Keyboards, Monitors, Mice, and Accessories, complete with stock counts and specs.
- Implemented pool manager (`pool.ts`), Redis client stub (`redis.ts`), migration and seed scripts (`migrate.ts`, `run.ts`).
- Started Docker Desktop WSL2 engine and successfully ran database migrations and seeds on the local PostgreSQL database.
- Verified database has 32 products and all 15 tables are present.

### Phase 3 — Catalog & Cart Services with Redis Integration
- Implemented `@commerce-ai/catalog` containing:
  - `ProductRepository`: Manages parameterized safe queries for paginated listings, category/price/stock filters, ILIKE search patterns, multi-product comparisons, updates, deletions, and inventory stock modifications.
  - `ProductService`: Enforces business validation rules (e.g. non-negative prices/stock), role validations, and resource ownership boundaries.
- Implemented `@commerce-ai/cart` containing:
  - `CartRepository`: Manages cart creation, items modification, item additions, quantity checks, cart deletions, and joins matching product/inventory detail.
  - `CartService`: Validates stock count before adding/modifying items.
- Implemented robust Redis Cache Integration (`packages/database/src/cache.ts`):
  - Created `CacheManager` with safe `get`, `set`, `del`, and `delPattern` methods.
  - Wrapped Redis calls in `try-catch` handlers to guarantee **graceful degradation**—if Redis connection goes down, operations fail silently, logging warnings and falling back to PostgreSQL source of truth.
  - Configured catalog lists and searches to cache for 5 minutes (`catalog:*`).
  - Configured product details to cache for 1 hour (`product:{id}`).
  - Configured active user carts to cache for 1 hour (`cart:{userId}`).
  - Implemented proper cache invalidations: product detail and catalog caches are purged when products are updated/deleted or inventory stock changes. Cart cache is invalidated when cart items change.

### Phase 4 — API Gateway & Security Layer (Authentication, Authorization, and Gateway Controls)
- Implemented `AuthService` (`apps/api/src/services/authService.ts`) with bcrypt hashing, JWT access token & refresh token signing, and login/register logic.
- Created `authenticate` and `authorize` middlewares (`apps/api/src/middleware/auth.ts`) for RBAC and identity validation.
- Enforced resource ownership checks (`orders` owned by user, `products` owned by merchant) directly inside backend endpoints.
- Implemented `requestIdMiddleware` (`apps/api/src/middleware/requestId.ts`) to inject and track unique `X-Request-Id` trace headers.
- Configured Helmet for security headers and CORS whitelisting (matching `FRONTEND_ORIGIN` variables).
- Enforced size limits (`1MB` cap on body parser) and HTML input sanitization (stripping XSS/HTML scripts).
- Designed domain-specific rate limiters (Auth, Payment, AI, and General) with automated bypasses during tests (`NODE_ENV=test`).
- Configured global centralized error handling returning a standardized safe JSON structure (clearing stack traces, credentials, SQL paths, and Postgres errors).
- Documented all security features inside a new reference file: `docs/GATEWAY_SECURITY.md`.
- Implemented product routes `/api/products` for listing, details, search, comparison, create, update, and delete.
- Implemented cart routes `/api/carts` for retrieving active cart, adding items, updating quantity, removing items, and clearing cart.
- Added comprehensive integration tests inside `apps/api/tests/catalog.test.ts` and `apps/api/tests/cart.test.ts` verifying all product actions, filtering, pagination, sorting, search, comparison, cart updates, and RBAC / merchant ownership enforcement.
- Verified all **32 tests** (14 auth, 12 catalog, and 6 cart tests) pass successfully under Jest!

### Phase 5 — AI Package (Gemini & LangChain Layer with Prompt Injection Defenses)
- Created `@commerce-ai/ai` implementing the LLM integration layer:
  - `models/`: Instantiates `ChatGoogleGenerativeAI` with retries (3) and API credentials protection.
  - `prompts/`: Implements `SUPERVISOR_SYSTEM_PROMPT` instructing the supervisor to output raw JSON mapping to the 11 supported intents.
  - `supervisor/`: Built `CommerceSupervisor` classifying intents and extracting parameters. Integrated `ruleBasedFallbackClassifier` that executes if Gemini fails, guaranteeing **graceful degradation** of the AI layer.
  - `security/`: Built `ToolValidator` implementing a sandbox that sanitizes string inputs, blocks directory traversal, prevents arbitrary URL loading, and masks credentials.
  - `state/`: Built `AIStateManager` to save and retrieve temporary conversation history logs (`conversation:{userId}`) and agent workflow states (`agent_workflow:{runId}`) using the Redis Cache.
  - `agents/`: Built `CommerceAgentRunner` executing corresponding actions using the catalog and cart service layers (approved application tools).
- Created `@commerce-ai/tools` containing the static `TOOL_REGISTRY` definitions.
- Mounted `/api/ai/chat` protected endpoint with the `aiLimiter` rate limiter.
- Installed proactive **Prompt Injection** and **Indirect Prompt Injection** scanner controls:
  - System Prompt includes explicit message tagging (`<user_message>...</user_message>`) and instructions to treat contents strictly as untrusted data.
  - Entry points for chat messages scan inputs for instruction-override combinations (e.g. `ignore` or `forget` paired with `instructions`, `rules`, `limits`, `policies`, `permissions`).
  - Product creation and updates parse descriptions for injection patterns and reject malicious entries with a `400 Bad Request`.
  - Documented defenses in a new reference file: [`docs/SECURITY.md`](file:///C:/Users/mrabh/OneDrive/Desktop/razorpay/docs/SECURITY.md).
- Wrote comprehensive integration tests in `apps/api/tests/ai.test.ts` verifying intent routing, conversation persistence, security sandbox injection blocks, and adversarial prompt injections.
- Verified all **41 tests** (auth, catalog, cart, and AI tests) pass successfully!
### Phase 5 Addendum — Agent Permission Layer & Policy Engine
- Implemented deterministic **Agent Permission Layer** (packages/ai/src/security/policy.ts):
  - Defined hardcoded tool mappings for DISCOVERY_AGENT, GROWTH_AGENT, and CHECKOUT_AGENT.
  - Blocked arbitrary shell execution, direct database reads/writes, direct Redis access, external HTTP, and Razorpay secrets.
  - Injected rows into the PostgreSQL gent_runs table when /api/ai/chat starts. Used run IDs to link entries in policy_decisions.
  - Audit logs are inserted into the udit_logs table (detailing event type, actor as 'agent', and JSON action details) for every evaluation.
- Handled operational error propagation correctly:
  - Allowed custom errors (e.g. ForbiddenError) to propagate out of the runner's catch block, enabling correct Express status response mapping (403 Forbidden).
  - Swapped permission checking priority to block admin delete requests first, yielding explicit "cannot perform admin operations" error messages.
- Added comprehensive integration tests inside [pps/api/tests/policy.test.ts](file:///C:/Users/mrabh/OneDrive/Desktop/razorpay/apps/api/tests/policy.test.ts) verifying all agent permission constraints:
  - Discovery Agent -> create_payment is rejected.
  - Growth Agent -> efund is rejected.
  - Checkout Agent -> admin operations are rejected.
- Verified all **45 integration tests pass successfully**!
### Phase 3 Addendum — secure Commerce Tool Layer
- Implemented explicit **Commerce Tool Layer** (packages/tools/src/index.ts):
  - Created schemas using Zod for all 10 target tools (search_products, get_product, compare_products, create_cart, get_cart, update_cart, create_order, create_payment, get_payment_status, efund).
  - Strict sequencing: checks agent authorization via PolicyEngine.evaluatePolicy *before* parsing parameters via Zod. This ensures permission violations yield 403 Forbidden rather than Zod validation failure 400 Bad Request.
  - Auditing: logs every single tool execution into the database udit_logs table.
  - Ownership: validates user identity matches the cart, order, and payment parameters.
  - PostgreSQL transaction isolation: create_order reduces stock count from the inventory table and clears the active cart inside a single transaction.
  - Decoupling LLM: LLM supervisor classifies user intent to a specific predefined tool name. The tool executes strictly matching the hardcoded switch-case tool registry, completely preventing arbitrary database query construction.
- Integrated the tool layer cleanly into CommerceAgentRunner in @commerce-ai/ai.
- Verified all **45 integration tests pass successfully**!
### Resilient Cache Integration & Test Verification
- Implemented an elegant in-memory fallback inside CacheManager (packages/database/src/cache.ts). If Redis is not connected (such as during local test environments), the cache system automatically degrades to a fast, clean in-memory Map structure. This ensures state persistence of checkout confirmations without requiring a running Redis instance in test builds.
- Resolved schema mismatch: updated column reference in order_items insert SQL from price to unit_price matching the database schema definition.
- Created pps/api/tests/agents.test.ts to test all agent workflows (Discovery queries/comparisons, Growth upsell recommendations, Checkout confirmation flows).
- Verified all **52 integration tests pass successfully (100% pass)**!