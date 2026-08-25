# CommerceAI — Infrastructure Architecture

> **Version:** 1.0.0
> **Date:** 2026-08-24
> **Stack:** Docker · Docker Compose · Nginx · PostgreSQL 16 + pgvector · Redis 7

---

## Table of Contents

1. [Overview](#1-overview)
2. [Folder Structure](#2-folder-structure)
3. [Docker Services](#3-docker-services)
4. [Docker Compose — Development](#4-docker-compose--development)
5. [Docker Compose — Production](#5-docker-compose--production)
6. [Dockerfile: Backend](#6-dockerfile-backend)
7. [Dockerfile: Frontend](#7-dockerfile-frontend)
8. [Nginx Configuration](#8-nginx-configuration)
9. [PostgreSQL Setup](#9-postgresql-setup)
10. [Redis Setup](#10-redis-setup)
11. [Network Topology](#11-network-topology)
12. [Secrets Management in Docker](#12-secrets-management-in-docker)
13. [Database Migrations](#13-database-migrations)
14. [Database Seeding](#14-database-seeding)
15. [Health Checks](#15-health-checks)
16. [Rebuild and Recovery Runbook](#16-rebuild-and-recovery-runbook)

---

## 1. Overview

The CommerceAI infrastructure is fully containerized using Docker and Docker Compose. All services — PostgreSQL, Redis, backend, frontend, and Nginx — run in isolated containers connected through a private Docker network. No service is directly accessible from the public internet except Nginx on port 80/443.

### Service Inventory

| Service | Image | Port (internal) | Port (public) |
|---|---|---|---|
| postgres | pgvector/pgvector:pg16 | 5432 | NOT exposed |
| redis | redis:7-alpine | 6379 | NOT exposed |
| backend | custom (Dockerfile.backend) | 3001 | NOT exposed |
| frontend | custom (Dockerfile.frontend) | 80 (nginx) | NOT exposed |
| nginx | nginx:alpine | 80, 443 | 80, 443 |

---

## 2. Folder Structure

```
infra/
+-- docker/
|   +-- docker-compose.dev.yml     Development compose (hot reload, exposed ports for debugging)
|   +-- docker-compose.prod.yml    Production compose (no hot reload, no exposed debug ports)
|   +-- Dockerfile.backend         Multi-stage backend image
|   +-- Dockerfile.frontend        Multi-stage frontend image (Nginx static serve)
|
+-- nginx/
|   +-- nginx.conf                 Nginx reverse proxy + static file configuration
|
+-- postgres/
|   +-- init/
|       +-- 01_init.sql            Runs automatically on first container start
|
+-- scripts/
    +-- migrate.sh                 Runs all SQL migrations in order
    +-- seed.sh                    Seeds database with sample product data
```

---

## 3. Docker Services

### postgres

```yaml
image: pgvector/pgvector:pg16
# pgvector/pgvector:pg16 includes:
#   PostgreSQL 16
#   pgvector extension pre-installed (just needs CREATE EXTENSION)
environment:
  POSTGRES_USER: commerceai
  POSTGRES_PASSWORD: <from secrets>
  POSTGRES_DB: commerceai
volumes:
  - postgres_data:/var/lib/postgresql/data   # persistent named volume
  - ./infra/postgres/init:/docker-entrypoint-initdb.d  # auto-run on first start
networks:
  - backend_network
# NOT exposed on host — only reachable within backend_network
```

### redis

```yaml
image: redis:7-alpine
command: redis-server --requirepass <REDIS_PASSWORD> --save 60 1 --appendonly yes
volumes:
  - redis_data:/data      # persistent named volume
networks:
  - backend_network
# NOT exposed on host
```

### backend

```yaml
build:
  context: ./backend
  dockerfile: ../infra/docker/Dockerfile.backend
env_file: .env
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
networks:
  - backend_network
# NOT exposed on host — Nginx proxies to it
```

### frontend (production)

```yaml
build:
  context: ./frontend
  dockerfile: ../infra/docker/Dockerfile.frontend
networks:
  - frontend_network
# Nginx inside this container serves the static bundle
```

### nginx

```yaml
image: nginx:alpine
ports:
  - "80:80"
  - "443:443"
volumes:
  - ./infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf
  - ./infra/nginx/ssl:/etc/nginx/ssl  # TLS certs (production)
depends_on:
  - backend
  - frontend
networks:
  - backend_network
  - frontend_network
```

---

## 4. Docker Compose — Development

```yaml
# infra/docker/docker-compose.dev.yml

version: '3.9'

services:

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"   # exposed for local DB GUI (dev only)
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend_network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"   # exposed for local Redis GUI (dev only)
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend_network

  backend:
    build:
      context: ./backend
      dockerfile: ../infra/docker/Dockerfile.backend
      target: development      # uses ts-node-dev for hot reload
    env_file: .env
    volumes:
      - ./backend/src:/app/src  # mount src for hot reload
    ports:
      - "3001:3001"             # exposed directly in dev for testing
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - backend_network

  frontend:
    build:
      context: ./frontend
      dockerfile: ../infra/docker/Dockerfile.frontend
      target: development       # uses Vite dev server
    env_file: .env
    volumes:
      - ./frontend/src:/app/src
    ports:
      - "5173:5173"             # Vite dev server
    networks:
      - frontend_network

networks:
  backend_network:
    driver: bridge
  frontend_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 5. Docker Compose — Production

```yaml
# infra/docker/docker-compose.prod.yml

version: '3.9'

services:

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init:/docker-entrypoint-initdb.d
    # NO host port exposure in production
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend_network

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --save 60 1
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    # NO host port exposure in production
    networks:
      - backend_network

  backend:
    build:
      context: ./backend
      dockerfile: ../infra/docker/Dockerfile.backend
      target: production
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    # NO host port exposure — only Nginx can reach it
    networks:
      - backend_network

  frontend:
    build:
      context: ./frontend
      dockerfile: ../infra/docker/Dockerfile.frontend
      target: production
    restart: unless-stopped
    networks:
      - frontend_network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./infra/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - backend_network
      - frontend_network

networks:
  backend_network:
    driver: bridge
    internal: true    # backend_network is internal — no direct internet access
  frontend_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 6. Dockerfile: Backend

```dockerfile
# infra/docker/Dockerfile.backend

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Development stage — includes dev dependencies + ts-node-dev
FROM base AS development
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Build stage — compiles TypeScript
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build
# Output: dist/ folder with compiled JS

# Production stage — minimal image
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=base    /app/node_modules ./node_modules
COPY package*.json ./

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
```

---

## 7. Dockerfile: Frontend

```dockerfile
# infra/docker/Dockerfile.frontend

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage — Vite dev server
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Build stage — compiles to static assets
FROM base AS builder
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build
# Output: dist/ with index.html and hashed JS/CSS bundles

# Production stage — Nginx serves static files
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

---

## 8. Nginx Configuration

```nginx
# infra/nginx/nginx.conf

server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://checkout.razorpay.com; frame-src https://api.razorpay.com;";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # API proxy -> backend
    location /api/ {
        proxy_pass         http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    # Webhook proxy -> backend (raw body needed — no buffering)
    location /webhooks/ {
        proxy_pass         http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_request_buffering off;   # CRITICAL for webhook HMAC verification
    }

    # Static frontend files
    location / {
        root  /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA fallback

        # Cache static assets
        location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint (no auth needed)
    location /health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
```

### Nginx Security Notes

- `proxy_request_buffering off` on the webhook route is critical — Nginx buffering changes the raw body, which breaks Razorpay HMAC verification
- CSP header explicitly allows `checkout.razorpay.com` for the Razorpay JS script and `api.razorpay.com` for the iframe
- All other script sources are denied (no CDN injection)

---

## 9. PostgreSQL Setup

### Init Script (Runs on First Container Start)

```sql
-- infra/postgres/init/01_init.sql
-- This runs ONCE when the postgres container is first created.

-- Create application user with limited privileges
CREATE USER commerceai_app WITH PASSWORD '${APP_DB_PASSWORD}';
GRANT CONNECT ON DATABASE commerceai TO commerceai_app;
GRANT USAGE ON SCHEMA public TO commerceai_app;

-- App user can SELECT/INSERT/UPDATE/DELETE on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO commerceai_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO commerceai_app;

-- REVOKE DELETE/UPDATE on audit_events for immutability
-- (Applied again after migrations create the table)
```

### Persistent Volume

- Data volume: `postgres_data` (Docker named volume)
- Persists across container restarts and rebuilds
- Must be backed up before any destructive operations

---

## 10. Redis Setup

### Configuration

```
--requirepass <REDIS_PASSWORD>     Authentication required
--save 60 1                        Persist to disk every 60s if 1+ key changed
--appendonly yes                   AOF persistence (safer than RDB alone)
--maxmemory 256mb                  Memory cap
--maxmemory-policy allkeys-lru     Evict least-recently-used keys when full
```

### Redis as Non-Persistent for Certain Keys

| Key Pattern | Persistence | Reason |
|---|---|---|
| session:*:history | Ephemeral (TTL) | Conversation history can be lost without critical impact |
| cart:* | Ephemeral (TTL) | Source of truth is PostgreSQL |
| revoked:* | Persistent (AOF) | If lost, revoked tokens could be reused |
| product:* | Ephemeral (TTL) | Cache only |

---

## 11. Network Topology

```
INTERNET
    |
    v
[ Nginx :80/:443 ] -- Only public entry point
    |           |
    |           |
    v           v
[backend:3001]  [frontend static files served by nginx]
    |
    |  (backend_network -- internal Docker bridge)
    |
    +-----> [postgres:5432]  NOT reachable from internet
    |
    +-----> [redis:6379]     NOT reachable from internet
```

### Network Rules

| From | To | Allowed |
|---|---|---|
| Internet | Nginx port 80/443 | Yes |
| Internet | backend:3001 | No (no host port binding in prod) |
| Internet | postgres:5432 | No |
| Internet | redis:6379 | No |
| Nginx | backend:3001 | Yes (proxy_pass) |
| backend | postgres:5432 | Yes (backend_network) |
| backend | redis:6379 | Yes (backend_network) |
| frontend container | postgres | No |
| frontend container | redis | No |

---

## 12. Secrets Management in Docker

### Development

```bash
# All secrets in .env file (gitignored)
# Loaded via env_file: .env in docker-compose.dev.yml

cat .env
POSTGRES_USER=commerceai
POSTGRES_PASSWORD=devpassword
APP_DB_PASSWORD=devapppassword
REDIS_PASSWORD=devredispass
GEMINI_API_KEY=your-key-here
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
DATABASE_URL=postgresql://commerceai_app:devapppassword@postgres:5432/commerceai
REDIS_URL=redis://:devredispass@redis:6379
JWT_PRIVATE_KEY=<RSA private key>
JWT_PUBLIC_KEY=<RSA public key>
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Production (Target Pattern)

```yaml
# Use Docker Secrets or external secrets manager
# Example with Docker Swarm secrets:

secrets:
  postgres_password:
    external: true
  razorpay_key_secret:
    external: true

services:
  backend:
    secrets:
      - postgres_password
      - razorpay_key_secret
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

### Secret File Rules

1. `.env` is in `.gitignore` — never committed
2. `.env.example` contains variable names only — safe to commit
3. `secrets/` directory is gitignored — for local key files
4. RSA key pair files are gitignored (`.pem`, `.key`)
5. No secrets in Dockerfile (use build args only for VITE_ vars, never secrets)

---

## 13. Database Migrations

### Migration File Naming

```
backend/src/db/migrations/
  001_initial.sql       Core tables (users, products, carts, orders, payments, audit)
  002_pgvector.sql      pgvector extension and embedding column
  003_*.sql             Future migrations (sequential numbering)
```

### Running Migrations

```bash
# infra/scripts/migrate.sh

#!/bin/bash
set -e

echo "Running migrations..."

for file in backend/src/db/migrations/*.sql; do
  echo "Applying: $file"
  psql "$DATABASE_URL" -f "$file"
done

echo "Migrations complete."
```

### Migration Rules

1. Migration files are numbered sequentially (001, 002, 003, ...)
2. Each file must be idempotent where possible (use IF NOT EXISTS, IF EXISTS)
3. Never modify an existing migration file — create a new one
4. Destructive migrations (DROP, DELETE data) require a separate rollback migration file
5. Migrations are run on every deployment in CI/CD

---

## 14. Database Seeding

```bash
# infra/scripts/seed.sh

#!/bin/bash
set -e

echo "Seeding database..."
psql "$DATABASE_URL" -f "backend/src/db/seeds/products.sql"
echo "Seeding complete."
```

```sql
-- backend/src/db/seeds/products.sql
-- Sample products for development and testing

INSERT INTO products (name, description, price, inventory_count, category, metadata)
VALUES
  ('Sony WH-1000XM5', 'Industry-leading noise cancelling wireless headphones', 29990, 50, 'Electronics', '{"brand": "Sony", "color": "Black"}'),
  ('Dell XPS 15',     'High-performance laptop with OLED display',            149999, 20, 'Computers',   '{"brand": "Dell", "ram": "32GB"}'),
  ('Nike Air Max 270','Casual sneakers with Air cushioning',                    8995, 100,'Footwear',    '{"brand": "Nike", "sizes": [7,8,9,10,11]}')
ON CONFLICT DO NOTHING;
```

---

## 15. Health Checks

### Backend Health Endpoint

```typescript
// backend/src/routes/health.ts (added to app.ts)

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');     // DB check
    await redis.ping();               // Redis check
    res.status(200).json({ status: 'ok', db: 'ok', cache: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});
```

### Docker Healthcheck Summary

| Service | Healthcheck Command | Interval | Retries |
|---|---|---|---|
| postgres | pg_isready | 5s | 5 |
| redis | redis-cli ping | 5s | 5 |
| backend | wget /health | 30s | 3 |
| nginx | wget /health | 30s | 3 |

---

## 16. Rebuild and Recovery Runbook

### Start Development Environment

```bash
# From repo root
cp .env.example .env
# Fill in .env with your keys

docker compose -f infra/docker/docker-compose.dev.yml up -d

# Run migrations
docker compose exec backend sh -c "cd /app && bash infra/scripts/migrate.sh"

# Seed data
docker compose exec backend sh -c "cd /app && bash infra/scripts/seed.sh"
```

### Destroy and Rebuild (Development)

```bash
# Stop and remove containers
docker compose -f infra/docker/docker-compose.dev.yml down

# Remove named volumes (WARNING: deletes all DB data)
docker compose -f infra/docker/docker-compose.dev.yml down -v

# Rebuild images (no cache)
docker compose -f infra/docker/docker-compose.dev.yml build --no-cache

# Start fresh
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

### Restore from Backup (Production)

```bash
# Stop backend and frontend (keep postgres and redis running)
docker compose -f infra/docker/docker-compose.prod.yml stop backend frontend

# Restore postgres backup
docker compose exec postgres pg_restore -U commerceai -d commerceai /backup/latest.dump

# Restart all services
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### Emergency: Reset Audit Log Table (NOT recommended — for dev only)

```sql
-- DO NOT RUN IN PRODUCTION
-- Audit events are append-only and should never be deleted
-- This is only for dev environment reset

TRUNCATE audit_events;
-- Note: the application user does not have DELETE permission
-- This must be run as the postgres superuser
```

### Recover from Broken Migration

```bash
# Check which migration last succeeded by querying the DB
# (Add a migrations tracking table in future — schema_migrations)

# Manually revert the last migration SQL statements
# Then re-apply corrected migration file
psql $DATABASE_URL -f backend/src/db/migrations/003_corrected.sql
```

---

*End of CommerceAI Infrastructure Architecture Document*
