# CommerceAI
An AI-native commerce platform designed to demonstrate modern agentic architectures, comprehensive observability, and robust security constraints in LLM-driven applications.

## Architecture

CommerceAI uses a multi-agent system built on top of Express, PostgreSQL, Redis, and LangChain:
- **Commerce Supervisor**: The entry point for user requests. Classifies intent and routes to specialized agents.
- **Discovery Agent**: Handles product search, comparison, and detail lookups.
- **Checkout Agent**: Handles cart operations, order creation, and payment initialization.
- **Policy Engine**: A deterministic security boundary that evaluates every tool execution request against RBAC, ownership, and inventory rules.

## Setup & Execution

### Prerequisites
- Node.js >= 20.0.0
- Docker & Docker Compose (for local PostgreSQL and Redis)
- Gemini API Key

### Manual Execution (Without Docker for Node)
If Docker Desktop is unstable, you can run the services manually:

1. Start the infrastructure (Database & Redis):
   `ash
   docker-compose up db redis
   `
2. Run database migrations:
   `ash
   npm run build -w packages/database
   node packages/database/dist/migrate.js
   `
3. Start the Backend API:
   `ash
   npm run dev:api
   `
4. Start the Frontend Web App:
   `ash
   npm run dev:web
   `

## Security & Observability

- **Complete Audit Logging**: Every LLM interaction is traced from USER_REQUEST to TOOL_COMPLETED with an gent_run_id.
- **Policy Enforcement**: The PolicyEngine intercepts all tool executions. If an agent hallucinates a tool call or attempts to modify a resource it doesn't own, the policy engine blocks it.
- **Proactive Prompt Injection Defense**: Validates user inputs before they reach the LLM.

## Testing Constraints & Known Limitations
- The end-to-end (E2E) AI tests in pps/api/tests/e2e/commerce.e2e.test.ts require a valid GEMINI_API_KEY to successfully parse complex semantic intents (like extracting product IDs from natural language). 
- If the Gemini API key is invalid or absent, the system falls back to a rule-based regex classifier which will fail semantic extraction assertions in the test suite. 
- Ensure uuid is kept at v9 for Jest compatibility due to CommonJS/ESM module resolution conflicts.