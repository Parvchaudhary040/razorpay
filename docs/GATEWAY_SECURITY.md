# CommerceAI — API Gateway Security Controls

This document details the API Gateway security layer implemented in the CommerceAI Express backend. All incoming traffic passes through this multi-layered defensive pipeline before reaching any route handler, business service, or PostgreSQL database.

---

## 1. Gateway Security Pipeline Order

Every incoming HTTP request traverses these controls sequentially:

```
Incoming HTTP Request
       |
       v
[1] Request ID Generator (requestIdMiddleware)
       |
[2] Security Headers (helmet)
       |
[3] CORS Configuration (cors)
       |
[4] Body Parsers & Payload Cap (express.json - limit: 1mb)
       |
[5] Input Sanitization (sanitizeInput - XSS HTML stripping)
       |
[6] Request ID Logger (winston request logging)
       |
[7] Route-Specific Rate Limiters (authLimiter, paymentLimiter, etc.)
       |
[8] JWT Authenticator (authenticate - verifies token signature & claims)
       |
[9] Role-Based Access Control (authorize - checks RBAC permissions)
       |
[10] Global Error Responder (centralized error formatter)
```

---

## 2. Implemented Controls

### 2.1 Request ID Tracking (`X-Request-Id`)
- **Control**: Every request is assigned a unique UUID `req.id` on entry. If a client sends an `X-Request-Id` header, the gateway propagates it; otherwise, the gateway generates a fresh UUID.
- **Header**: Returned to the client in the `X-Request-Id` HTTP response header.
- **Audit Value**: Injected into all structured logs and error logs to enable end-to-end tracing of individual requests.

### 2.2 Security Headers (Helmet)
- **Control**: Sets standard, HTTP-compliant security headers to prevent client-side vulnerabilities.
- **Specific Headers**:
  - `Content-Security-Policy`: Restricts scripts, frames, and resource origins.
  - `X-Frame-Options: DENY`: Prevents Clickjacking.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing.
  - `Strict-Transport-Security` (HSTS): Enforces HTTPS connections.
  - `Referrer-Policy`: Restricts referrer information.

### 2.3 Cross-Origin Resource Sharing (CORS)
- **Control**: Whitelists access only to the explicit frontend origin configured in environment variables (`FRONTEND_ORIGIN`).
- **Configuration**:
  - `credentials: true` (allows sending JWT refresh token httpOnly cookies securely).
  - Explicitly restricts allowed HTTP methods to: `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`.

### 2.4 Payload Size Caps
- **Control**: Enforces strict request body size limits at the parser layer.
- **Limits**:
  - JSON bodies: max `1MB`.
  - URL-encoded bodies: max `1MB`.
- **Mitigation**: Prevents Denial of Service (DoS) attacks via massive request payloads designed to crash or overload Node processes.

### 2.5 HTML Input Sanitization (XSS Defense)
- **Control**: Automatically inspects `req.body` and recursively strips HTML tags/scripts from all string properties using the `stripHtml` utility before matching routes.
- **Mitigation**: Neutralizes Cross-Site Scripting (XSS) injection attempts.

### 2.6 Domain-Specific Rate Limiting
To protect key resources, the gateway enforces separate rate limiting rules:

| Endpoint Domain | Limiter | Threshold | Action on Violation |
|---|---|---|---|
| **Authentication** | `authLimiter` | 5 requests per 15 minutes | HTTP 429 - `RATE_LIMIT_EXCEEDED` |
| **Payments** | `paymentLimiter` | 10 requests per 15 minutes | HTTP 429 - `RATE_LIMIT_EXCEEDED` |
| **AI assistant** | `aiLimiter` | 20 requests per minute | HTTP 429 - `RATE_LIMIT_EXCEEDED` |
| **General APIs** | `generalLimiter` | 100 requests per 15 minutes | HTTP 429 - `RATE_LIMIT_EXCEEDED` |

*Note: Rate limiters are automatically bypassed (threshold raised to 10,000) during test execution (`NODE_ENV=test`) to prevent test suite failures.*

### 2.7 JWT Authentication & Identity Enforcement
- **Control**: Decodes and verifies RS256 or HS256 JWT access tokens from the `Authorization: Bearer <token>` header.
- **Claims**: Populates `req.user` with `{ userId, role, sessionId }`.
- **Identity Guarantee**: Identity is always extracted from the verified JWT payload — never trusted from request body properties or client-supplied claims.

### 2.8 Role-Based Access Control (RBAC)
- **Control**: Sever-side route protection using curried `authorize(...roles)` middleware.
- **Allowed Roles**: `CUSTOMER`, `MERCHANT`, `ADMIN`.
- **Action**: Immediately rejects unauthorized roles with a `403 Forbidden` error.

### 2.9 Centralized Safe Error Handling
- **Control**: Prevents leakage of internal technical details to clients.
- **Error Response Structure**:
  ```json
  {
    "success": false,
    "error": {
      "code": "SAFE_ERROR_CODE",
      "message": "Human-readable message"
    }
  }
  ```
- **Information Disclosure Defenses**:
  - Operational errors (e.g., `ConflictError`, `ValidationError`) return safe codes (`CONFLICT`, `VALIDATION_ERROR`).
  - Unhandled server errors return generic `INTERNAL_SERVER_ERROR` with a safe message.
  - Stack traces are **never** returned in HTTP responses (only logged internally).
  - PostgreSQL database schemas, SQL statements, and internal file paths are completely stripped before returning response.