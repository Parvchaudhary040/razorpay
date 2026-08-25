# CommerceAI — Frontend Architecture

> **Version:** 1.0.0
> **Date:** 2026-08-24
> **Stack:** React 18 · Vite · TypeScript · Tailwind CSS · Zustand · Axios · React Router v6

---

## Table of Contents

1. [Overview](#1-overview)
2. [Folder Structure](#2-folder-structure)
3. [Application Bootstrap](#3-application-bootstrap)
4. [Routing](#4-routing)
5. [State Management (Zustand)](#5-state-management-zustand)
6. [API Service Layer](#6-api-service-layer)
7. [Component Architecture](#7-component-architecture)
8. [Pages](#8-pages)
9. [Custom Hooks](#9-custom-hooks)
10. [Payment Integration (Razorpay JS)](#10-payment-integration-razorpay-js)
11. [Authentication Flow](#11-authentication-flow)
12. [Chat and AI Interaction](#12-chat-and-ai-interaction)
13. [Styling System (Tailwind)](#13-styling-system-tailwind)
14. [Security Constraints](#14-security-constraints)
15. [Environment Configuration](#15-environment-configuration)
16. [TypeScript Types](#16-typescript-types)
17. [Testing Strategy](#17-testing-strategy)
18. [Full User Journey](#18-full-user-journey)

---

## 1. Overview

The CommerceAI frontend is a React 18 SPA built with Vite and TypeScript. It provides the customer-facing UI for interacting with the AI shopping assistant, browsing and comparing products, managing a cart, and completing a Razorpay payment.

### What the Frontend Does

- Renders the AI chat interface and displays assistant responses
- Shows product search results, comparison views, and recommendations
- Manages cart UI state, synced with backend via REST API
- Renders the checkout page and launches the Razorpay JS modal
- Sends the payment verification callback to the backend
- Displays the order confirmation and audit trail (own orders only)

### What the Frontend NEVER Does

- Never stores Razorpay key_secret (only key_id is used on frontend)
- Never computes or authorizes payment amounts (always from backend)
- Never stores JWT access tokens in localStorage (memory only)
- Never calls PostgreSQL or Redis directly
- Never trusts backend responses for payment confirmation without server-side verification
- Never modifies order or payment state directly

---

## 2. Folder Structure

```
frontend/
+-- src/
|   +-- main.tsx                    React app entry point
|   +-- App.tsx                     Root component — Router + layout
|   +-- index.css                   Global styles + Tailwind directives
|   |
|   +-- pages/
|   |   +-- LoginPage.tsx           Login / register form
|   |   +-- ChatPage.tsx            AI shopping assistant chat interface
|   |   +-- ProductsPage.tsx        Product listing and search results
|   |   +-- CartPage.tsx            Cart management
|   |   +-- CheckoutPage.tsx        Order summary + Razorpay payment trigger
|   |   +-- OrderPage.tsx           Order confirmation and status
|   |   +-- AuditPage.tsx           Audit trail (own orders) — customer view
|   |
|   +-- components/
|   |   +-- chat/
|   |   |   +-- ChatWindow.tsx      Full chat interface with message history
|   |   |   +-- MessageBubble.tsx   Single message (user or AI) with styling
|   |   |   +-- ChatInput.tsx       Textarea + send button
|   |   +-- product/
|   |   |   +-- ProductCard.tsx     Product tile with image, name, price, add-to-cart
|   |   |   +-- ProductSearch.tsx   Search bar with debounce
|   |   |   +-- ProductCompare.tsx  Side-by-side comparison table
|   |   +-- cart/
|   |   |   +-- CartItem.tsx        Single cart item with quantity controls
|   |   |   +-- CartSummary.tsx     Cart totals and checkout button
|   |   +-- order/
|   |   |   +-- OrderDetail.tsx     Full order breakdown
|   |   |   +-- OrderStatus.tsx     Visual status tracker (step indicator)
|   |   +-- payment/
|   |   |   +-- RazorpayButton.tsx  Loads Razorpay JS SDK and opens modal
|   |   |   +-- PaymentStatus.tsx   Shows payment success / failure state
|   |   +-- audit/
|   |   |   +-- AuditTable.tsx      Paginated table of audit events
|   |   +-- layout/
|   |       +-- Navbar.tsx          Top navigation with cart badge and user menu
|   |       +-- Sidebar.tsx         Category and filter sidebar (products page)
|   |
|   +-- hooks/
|   |   +-- useAuth.ts              Auth state, login, logout, token refresh
|   |   +-- useChat.ts              Send message, receive response, history
|   |   +-- useCart.ts              Cart CRUD, optimistic updates, sync
|   |   +-- usePayment.ts           Razorpay modal lifecycle, verification
|   |
|   +-- store/
|   |   +-- index.ts                Re-exports all stores
|   |   +-- authStore.ts            Zustand: user, accessToken, isAuthenticated
|   |   +-- cartStore.ts            Zustand: cart items, count, total
|   |   +-- chatStore.ts            Zustand: message history, loading state
|   |
|   +-- services/
|   |   +-- apiClient.ts            Axios instance with JWT interceptor + refresh
|   |   +-- authApi.ts              login(), register(), refresh(), logout()
|   |   +-- productApi.ts           list(), search(), getById(), compare()
|   |   +-- cartApi.ts              getCart(), addItem(), updateItem(), removeItem()
|   |   +-- orderApi.ts             createOrder(), getOrder()
|   |   +-- paymentApi.ts           initiate(), verify()
|   |   +-- chatApi.ts              sendMessage()
|   |
|   +-- types/
|   |   +-- index.ts                Re-exports all frontend types
|   |
|   +-- utils/
|       +-- index.ts                formatPrice(), formatDate(), debounce(), etc.
|
+-- public/
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- tailwind.config.ts
+-- postcss.config.ts
```

---

## 3. Application Bootstrap

```
index.html  (public entry — Vite injects <script type="module" src="/src/main.tsx">)
      |
      v
main.tsx
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
      |
      v
App.tsx
  Wraps everything in:
    <BrowserRouter>
      <AuthGuard>         checks persisted session on mount
        <Routes>
          ...page routes
        </Routes>
      </AuthGuard>
    </BrowserRouter>
```

### On Mount (AuthGuard)

```
1. Read refreshToken from httpOnly cookie (exists if previously logged in)
2. Call authApi.refresh() -> new accessToken
3. If success: store accessToken in authStore (memory only)
4. If failure: redirect to /login
```

---

## 4. Routing

```typescript
// App.tsx

<Routes>
  <Route path="/login"     element={<LoginPage />} />

  {/* Protected routes — redirect to /login if unauthenticated */}
  <Route element={<ProtectedRoute />}>
    <Route path="/"          element={<ChatPage />} />
    <Route path="/products"  element={<ProductsPage />} />
    <Route path="/cart"      element={<CartPage />} />
    <Route path="/checkout"  element={<CheckoutPage />} />
    <Route path="/orders/:id" element={<OrderPage />} />
    <Route path="/audit"     element={<AuditPage />} />
  </Route>
</Routes>
```

### ProtectedRoute Logic

```typescript
// If authStore.isAuthenticated === false -> <Navigate to="/login" replace />
// Else -> <Outlet /> (renders child route)
```

---

## 5. State Management (Zustand)

### authStore

```typescript
// store/authStore.ts

interface AuthState {
  userId: string | null;
  role: 'customer' | 'admin' | null;
  accessToken: string | null;  // MEMORY ONLY — never localStorage
  isAuthenticated: boolean;
  setAuth: (userId, role, accessToken) => void;
  clearAuth: () => void;
}
```

### cartStore

```typescript
// store/cartStore.ts

interface CartState {
  cartId: string | null;
  items: CartItem[];
  itemCount: number;
  total: number;
  isLoading: boolean;
  setCart: (cart: Cart) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}
```

### chatStore

```typescript
// store/chatStore.ts

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  addUserMessage: (text: string) => void;
  addAIMessage: (text: string, toolResults?: ToolResult[]) => void;
  setLoading: (loading: boolean) => void;
  clearHistory: () => void;
}
```

### State Rules

1. Access tokens live in authStore (memory) — never localStorage or sessionStorage
2. Cart state is always synced from backend response after each mutation
3. Chat history is frontend-only display state — source of truth is Redis session on backend
4. No payment amounts stored in Zustand — always fetched fresh from backend on checkout

---

## 6. API Service Layer

### apiClient (Axios Instance)

```typescript
// services/apiClient.ts

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,   // sends httpOnly refreshToken cookie automatically
});

// Request interceptor: attach accessToken from authStore
apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 -> silent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await authApi.refresh();
      authStore.getState().setAuth(..., newToken);
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Service Definitions

```typescript
// services/chatApi.ts
sendMessage(message: string): Promise<{ message: string; cartSummary?: CartSummary }>
  POST /api/v1/chat/message

// services/productApi.ts
list(pagination): Promise<PaginatedResult<Product>>
  GET /api/v1/products

search(query, filters): Promise<ProductSearchResult[]>
  GET /api/v1/products/search?query=...

getById(id): Promise<Product>
  GET /api/v1/products/:id

compare(ids[]): Promise<CompareResult>
  GET /api/v1/products/compare?ids=id1,id2

// services/cartApi.ts
getCart(): Promise<Cart>
  GET /api/v1/cart

addItem(productId, quantity): Promise<Cart>
  POST /api/v1/cart/items

updateItem(itemId, quantity): Promise<Cart>
  PUT /api/v1/cart/items/:id

removeItem(itemId): Promise<Cart>
  DELETE /api/v1/cart/items/:id

// services/orderApi.ts
createOrder(cartId): Promise<Order>
  POST /api/v1/orders

getOrder(orderId): Promise<Order>
  GET /api/v1/orders/:id

// services/paymentApi.ts
initiate(orderId): Promise<{ razorpay_order_id, razorpay_key_id, amount, currency }>
  POST /api/v1/payments/initiate

verify(razorpay_order_id, razorpay_payment_id, razorpay_signature): Promise<{ success, orderId }>
  POST /api/v1/payments/verify
```

---

## 7. Component Architecture

### Component Rules

1. Components are pure UI — they receive data as props or from hooks
2. No API calls directly in components — all calls go through hooks
3. No direct Zustand store access in components — use hooks (useCart, useAuth, etc.)
4. No business logic in components — validation and decisions in hooks or services

### Component Hierarchy

```
App
+-- Navbar
+-- Sidebar (products page only)
+-- Pages
    +-- ChatPage
    |   +-- ChatWindow
    |       +-- MessageBubble (user)
    |       +-- MessageBubble (AI)
    |           +-- ProductCard (inline recommendation)
    |       +-- ChatInput
    |
    +-- ProductsPage
    |   +-- ProductSearch
    |   +-- ProductCard[]
    |   +-- ProductCompare (when 2+ selected)
    |
    +-- CartPage
    |   +-- CartItem[] (with quantity controls)
    |   +-- CartSummary (total + checkout button)
    |
    +-- CheckoutPage
    |   +-- OrderDetail (summary before payment)
    |   +-- RazorpayButton
    |   +-- PaymentStatus
    |
    +-- OrderPage
    |   +-- OrderDetail
    |   +-- OrderStatus (step tracker)
    |
    +-- AuditPage
        +-- AuditTable (paginated)
```

---

## 8. Pages

### ChatPage

```typescript
// pages/ChatPage.tsx

State: messages from chatStore, isLoading
On mount: load session from backend if sessionId exists
On send: useChat.sendMessage(text) -> POST /api/v1/chat/message
         -> addAIMessage(response.message)
         -> if response.cartSummary -> update cartStore
```

### ProductsPage

```typescript
// pages/ProductsPage.tsx

State: products[], selectedIds[] for compare, searchQuery, filters
On mount: productApi.list() -> render ProductCard grid
On search: debounced productApi.search(query)
On select (for compare): add productId to selectedIds (max 4)
On compare click: productApi.compare(selectedIds) -> show ProductCompare
```

### CartPage

```typescript
// pages/CartPage.tsx

State: cart from cartStore (synced with backend)
On mount: useCart.loadCart() -> GET /api/v1/cart -> cartStore.setCart()
On quantity change: useCart.updateItem() -> PUT /cart/items/:id
On remove: useCart.removeItem() -> DELETE /cart/items/:id
On checkout: navigate('/checkout')
```

### CheckoutPage

```typescript
// pages/CheckoutPage.tsx

State: order (from orderApi), paymentData (from paymentApi)
On mount:
  1. orderApi.createOrder(cartId) -> set order
  2. paymentApi.initiate(orderId) -> set { razorpay_order_id, key_id, amount }
Render: OrderDetail (summary) + RazorpayButton
On payment success: paymentApi.verify(...) -> navigate('/orders/:id')
On payment failure: show PaymentStatus(failed) + retry option
```

### OrderPage

```typescript
// pages/OrderPage.tsx

State: order from orderApi.getOrder(orderId)
Polling: re-fetches every 5s until order.status === ORDER_COMPLETE
Renders: OrderDetail + OrderStatus tracker
```

---

## 9. Custom Hooks

### useAuth

```typescript
// hooks/useAuth.ts

{
  isAuthenticated,  user, role,
  login(email, password)   -> authApi.login() -> setAuth() -> navigate('/')
  logout()                 -> authApi.logout() -> clearAuth() -> navigate('/login')
  refresh()                -> authApi.refresh() -> update accessToken in store
}
```

### useChat

```typescript
// hooks/useChat.ts

{
  messages, isLoading,
  sendMessage(text: string)
    1. addUserMessage(text) to chatStore
    2. setLoading(true)
    3. chatApi.sendMessage(text) -> { message, cartSummary }
    4. addAIMessage(message)
    5. if cartSummary: cartStore.setCart(cartSummary)
    6. setLoading(false)
}
```

### useCart

```typescript
// hooks/useCart.ts

{
  cart, items, total, itemCount, isLoading,
  loadCart()              -> cartApi.getCart() -> cartStore.setCart()
  addItem(productId, qty) -> cartApi.addItem() -> cartStore.setCart(response)
  updateItem(id, qty)     -> cartApi.updateItem() -> cartStore.setCart(response)
  removeItem(id)          -> cartApi.removeItem() -> cartStore.setCart(response)
}
```

### usePayment

```typescript
// hooks/usePayment.ts

{
  paymentStatus,  // idle | loading | success | failed
  initiatePayment(orderId)
    1. paymentApi.initiate(orderId) -> { razorpay_order_id, key_id, amount }
    2. Load Razorpay JS SDK (dynamic script inject)
    3. new Razorpay({ key, order_id, amount, handler: onSuccess })
    4. rzp.open()
  onSuccess(razorpayResponse)
    5. paymentApi.verify(response) -> { success, orderId }
    6. if success: setStatus('success') -> navigate('/orders/:id')
    7. if fail:    setStatus('failed')
}
```

---

## 10. Payment Integration (Razorpay JS)

### How Razorpay JS Works in the Frontend

```
CheckoutPage mounts
      |
      v
usePayment.initiatePayment(orderId)
      |
      v [backend call]
POST /api/v1/payments/initiate
  <- { razorpay_order_id, razorpay_key_id, amount, currency }
  (key_secret is NEVER in this response)
      |
      v
Load Razorpay Checkout JS dynamically:
  <script src="https://checkout.razorpay.com/v1/checkout.js">
      |
      v
new Razorpay({
  key:      razorpay_key_id,
  order_id: razorpay_order_id,
  amount:   amount,           <- from backend, not from UI state
  currency: 'INR',
  name:     'CommerceAI',
  handler:  function(response) {
    // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    verifyPayment(response);
  },
  modal: {
    ondismiss: () => setStatus('idle')
  }
})
rzp.open()
      |
      v (user completes payment in Razorpay iframe)
      |
handler called with response
      |
      v
POST /api/v1/payments/verify
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
  <- { success: true, orderId }
      |
      v
navigate('/orders/:orderId')
```

### Critical Rules

- The Razorpay JS script is loaded dynamically — not in index.html (loads only when needed)
- The payment amount shown in the modal is set by the backend response, not by cart state
- The `handler` function sends all three Razorpay fields to the backend for HMAC verification
- If verification fails: the frontend shows an error state — it does NOT mark the order as paid
- Payment status is only trusted after the backend `/payments/verify` response says success

---

## 11. Authentication Flow

### Login

```
User submits LoginPage form (email + password)
      |
      v
useAuth.login(email, password)
      |
      v
authApi.login() -> POST /api/v1/auth/login
  <- { accessToken }  +  Set-Cookie: refreshToken (httpOnly, Secure, SameSite=Strict)
      |
      v
authStore.setAuth(userId, role, accessToken)
  accessToken stored in MEMORY (Zustand) — never localStorage
  refreshToken in httpOnly cookie — not accessible by JS
      |
      v
navigate('/') -> ChatPage
```

### Silent Token Refresh

```
apiClient interceptor catches 401 response
      |
      v
authApi.refresh() -> POST /api/v1/auth/refresh
  Cookie: refreshToken (sent automatically by browser)
  <- { accessToken }
      |
      v
authStore.setAuth(... new accessToken ...)
Retry original request with new token
```

### Logout

```
useAuth.logout()
      |
      v
authApi.logout() -> POST /api/v1/auth/logout
  (sends refreshToken cookie, backend adds jti to Redis revocation set)
      |
      v
authStore.clearAuth()  -> accessToken removed from memory
navigate('/login')
```

---

## 12. Chat and AI Interaction

### Message Flow

```
User types in ChatInput -> presses Enter or Send button
      |
      v
useChat.sendMessage(text)
  addUserMessage(text) to chatStore -> UI updates immediately
  setLoading(true) -> show typing indicator in ChatWindow
      |
      v
chatApi.sendMessage(text) -> POST /api/v1/chat/message
  { message: "..." }
  <- { message: "AI response", cartSummary?: {...} }
      |
      v
addAIMessage(response.message)
if response.cartSummary: cartStore.setCart(cartSummary)
setLoading(false)
```

### Chat Message Types

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolResults?: ToolResult[];  // products, cart updates, etc. from AI
}
```

### Inline Product Rendering

When the AI response includes product recommendations, the `MessageBubble` component renders `ProductCard` components inline within the chat — allowing the user to add items directly from the chat.

---

## 13. Styling System (Tailwind)

### Tailwind Configuration

```typescript
// tailwind.config.ts

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#6366f1', hover: '#4f46e5' },  // indigo
        surface:  { DEFAULT: '#1e1e2e', card: '#2a2a3e' },   // dark surfaces
        accent:   { DEFAULT: '#a78bfa' },                    // violet
        success:  '#22c55e',
        error:    '#ef4444',
        warning:  '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

### Design Principles

1. Dark mode by default (dark surface colors)
2. Inter font from Google Fonts
3. Indigo/violet primary palette
4. All interactive elements have hover + focus states
5. Smooth transitions on cart badge, chat messages, payment modal

---

## 14. Security Constraints

| Constraint | Implementation |
|---|---|
| Access token not in localStorage | authStore (Zustand in-memory only) |
| Refresh token not accessible by JS | httpOnly cookie set by backend |
| Razorpay key_secret never on frontend | Backend never sends it; only key_id in response |
| Payment amount not from UI state | Amount always from backend initiate response |
| CORS | Backend restricts to VITE_API_BASE_URL origin only |
| No eval() or innerHTML | Strict React JSX, no dangerouslySetInnerHTML |
| No direct DB calls | All data via backend REST API through apiClient |

---

## 15. Environment Configuration

```
# frontend/.env.example

VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_NAME=CommerceAI
```

### Vite Environment Rules

- Only `VITE_` prefixed variables are exposed to the browser bundle
- `VITE_API_BASE_URL` points to the backend (proxied via Nginx in production)
- No secrets ever in frontend env vars

---

## 16. TypeScript Types

```typescript
// Re-exported from backend types (shared type package or copy)

interface Product {
  id: string; name: string; description: string;
  price: number; category: string; inventoryCount: number;
}

interface CartItem {
  id: string; productId: string; product: Product;
  quantity: number; unitPrice: number;
}

interface Cart {
  id: string; items: CartItem[]; total: number; itemCount: number;
}

interface Order {
  id: string; status: OrderStatus; items: OrderItem[];
  totalAmount: number; createdAt: string;
  razorpayOrderId?: string;
}

interface ChatMessage {
  id: string; role: 'user' | 'assistant';
  content: string; timestamp: Date;
}
```

---

## 17. Testing Strategy

| Test | Tool | What to Test |
|---|---|---|
| Unit | Vitest | useCart, useAuth, usePayment hooks |
| Unit | Vitest | apiClient interceptor (token refresh logic) |
| Component | React Testing Library | ChatWindow renders messages, CartItem quantity controls |
| E2E | Playwright | Full login -> chat -> cart -> checkout -> payment flow |

### Critical E2E Scenarios

```
1. Login flow:     invalid creds -> error shown, valid -> redirect to chat
2. Chat flow:      send message -> AI response rendered, inline product shown
3. Cart flow:      add via chat -> cart badge increments, CartPage shows item
4. Payment flow:   checkout -> Razorpay modal opens, success -> OrderPage
5. Token refresh:  expire token in-memory -> silent refresh -> request retried
```

---

## 18. Full User Journey

```
1.  User opens browser -> /login
    LoginPage renders

2.  User submits credentials
    authApi.login() -> accessToken (memory) + refreshToken (cookie)
    Redirect to / (ChatPage)

3.  ChatPage loads
    useChat: loads existing session history from backend (if any)

4.  User types: "Show me laptops under 80000"
    chatApi.sendMessage() -> backend runs LangGraph agent
    AI uses productSearchTool
    Response: "Here are 3 laptops under Rs. 80,000" + ProductCards inline

5.  User clicks "Add to Cart" on ProductCard in chat
    cartApi.addItem() -> cartStore updated -> Navbar badge = 1

6.  User navigates to /cart
    CartPage: CartItem shown, quantity control, total = Rs. 74,999
    User clicks "Proceed to Checkout"

7.  navigate('/checkout')
    CheckoutPage:
      orderApi.createOrder() -> order created
      paymentApi.initiate() -> razorpay_order_id + key_id + amount from backend
      RazorpayButton renders

8.  User clicks "Pay Now"
    Razorpay JS modal opens (loaded dynamically)
    User enters test card details
    Razorpay calls handler() with payment response

9.  handler: paymentApi.verify() -> POST /payments/verify
    Backend HMAC verification -> success
    navigate('/orders/:orderId')

10. OrderPage:
    orderApi.getOrder() -> status: ORDER_COMPLETE (after webhook)
    OrderStatus shows all steps completed

11. User navigates to /audit
    AuditTable shows: login, chat messages, cart actions, order, payment events
```

---

*End of CommerceAI Frontend Architecture Document*
