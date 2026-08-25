# CommerceAI — Architecture Documentation Index

> All architecture documents serve as the canonical reference for rebuilding,
> debugging, or reverting any part of the system.

---

## Architecture Documents

| Layer | File | Size | Sections |
|---|---|---|---|
| System-wide | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | ~22 KB | System overview, trust boundaries, data flow, AI flow, payment flow, DB schema |
| System-wide | [docs/SECURITY.md](docs/SECURITY.md) | ~24 KB | Auth, RBAC, agent permissions, prompt injection, payment security, audit, threat model |
| Backend | [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) | ~40 KB | Express, middleware, routes, agent, tools, PolicyEngine, services, repos, DB, cache, payments, webhooks, audit, errors, config, types, tests |
| Frontend | [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) | ~23 KB | React, routing, Zustand, API client, components, pages, hooks, Razorpay JS, auth flow, chat |
| AI Layer | [ai/ARCHITECTURE.md](ai/ARCHITECTURE.md) | ~22 KB | LangGraph graph, nodes, state, chains, prompts, memory, embeddings, Gemini config, security |
| MCP Servers | [mcp-servers/ARCHITECTURE.md](mcp-servers/ARCHITECTURE.md) | ~16 KB | All 5 MCP servers, tool schemas, security model, add-new-tool checklist |
| Infrastructure | [infra/ARCHITECTURE.md](infra/ARCHITECTURE.md) | ~20 KB | Docker services, Compose dev/prod, Dockerfiles, Nginx, PostgreSQL, Redis, migrations, runbook |

---

## Quick Reference: Where Is the Logic?

| If this breaks... | Read this doc |
|---|---|
| JWT auth not working | backend/ARCHITECTURE.md §4 (Middleware), §9 (UserService) |
| AI agent gives wrong response | ai/ARCHITECTURE.md §4-7 (Graph, Nodes, Routing) |
| Tool call rejected / permission error | backend/ARCHITECTURE.md §7 (Tool Layer), §8 (PolicyEngine) |
| Payment not verifying | backend/ARCHITECTURE.md §13 (Payment Layer) |
| Webhook not processing | backend/ARCHITECTURE.md §14 (Webhook Handler) |
| Search returns no results | ai/ARCHITECTURE.md §11 (Embedding Service), backend/ARCHITECTURE.md §9 (ProductService) |
| Cart state out of sync | frontend/ARCHITECTURE.md §5 (Zustand), §9 (useCart hook) |
| Razorpay modal not opening | frontend/ARCHITECTURE.md §10 (Payment Integration) |
| Audit events missing | backend/ARCHITECTURE.md §15 (Audit Logger) |
| Docker service not starting | infra/ARCHITECTURE.md §3-5 (Docker Services, Compose) |
| DB migration failed | infra/ARCHITECTURE.md §13 (Migrations), §16 (Runbook) |
| MCP tool not found | mcp-servers/ARCHITECTURE.md §4 (Tool Registry) |

---

## Rebuild Order (if starting from scratch)

```
1. Read docs/ARCHITECTURE.md        (understand the full system)
2. Read docs/SECURITY.md            (understand security requirements)
3. Set up infra/                    (Docker, PostgreSQL, Redis, Nginx)
4. Run migrations                   (infra/scripts/migrate.sh)
5. Implement backend/               (Express, services, repos, middleware)
6. Implement ai/                    (LangGraph, tools, memory)
7. Implement mcp-servers/           (tool definitions, schemas)
8. Implement frontend/              (React, Zustand, API client)
9. Run seeds                        (infra/scripts/seed.sh)
10. Test full flow                  (backend/tests/e2e/)
```

---

*These documents are the ground truth. If the code and the docs disagree, update the docs first, then the code.*
