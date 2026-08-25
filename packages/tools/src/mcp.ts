import { CommerceToolLayer } from './index';
import * as Errors from '@commerce-ai/shared';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ToolContext {
  userId: string;
  agentName: string;
  agentRunId: string;
}

export class MCPServer {
  constructor(
    public readonly name: string,
    public readonly description: string,
    private readonly supportedTools: string[]
  ) {}

  getSupportedTools(): string[] {
    return this.supportedTools;
  }

  async handleRequest(request: MCPRequest, context: ToolContext): Promise<MCPResponse> {
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32600, message: 'Invalid Request: missing or incorrect jsonrpc version' },
      };
    }

    try {
      switch (request.method) {
        case 'tools/list': {
          const { TOOL_REGISTRY } = require('./index');
          const tools = this.supportedTools.map((tName) => {
            const tool = TOOL_REGISTRY[tName];
            return {
              name: tool ? tool.name : tName,
              description: tool ? tool.description : 'Deprecated or internal helper tool',
              inputSchema: {},
            };
          });
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { tools },
          };
        }

        case 'tools/call': {
          const { name, arguments: args } = request.params || {};
          if (!this.supportedTools.includes(name)) {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Method not found: tool '${name}' is not supported by server '${this.name}'`,
              },
            };
          }

          const result = await CommerceToolLayer.execute(
            name,
            context.userId,
            args,
            context.agentName,
            context.agentRunId
          );

          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result),
                },
              ],
            },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32601, message: `Method not found: ${request.method}` },
          };
      }
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32000 - statusCode,
          message: err.message || 'Internal server error',
          data: {
            code: err.code || 'UNKNOWN_ERROR',
            statusCode: statusCode,
          },
        },
      };
    }
  }
}

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();

  registerServer(server: MCPServer) {
    this.servers.set(server.name, server);
  }

  async callTool(
    toolName: string,
    args: any,
    context: ToolContext
  ): Promise<any> {
    let targetServer: MCPServer | null = null;
    for (const server of this.servers.values()) {
      if (server.getSupportedTools().includes(toolName)) {
        targetServer = server;
        break;
      }
    }

    if (!targetServer) {
      throw new Error(`Client Error: No registered MCP Server supports tool '${toolName}'`);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Math.random().toString(36).substring(7),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await targetServer.handleRequest(request, context);

    if (response.error) {
      const code = response.error.data?.code;
      const message = response.error.message;
      const statusCode = response.error.data?.statusCode || 500;
      
      let error: Error;
      switch (code) {
        case 'NOT_FOUND':
          error = new Errors.NotFoundError(message);
          break;
        case 'UNAUTHORIZED':
          error = new Errors.UnauthorizedError(message);
          break;
        case 'FORBIDDEN':
          error = new Errors.ForbiddenError(message);
          break;
        case 'VALIDATION_ERROR':
          error = new Errors.ValidationError(message);
          break;
        case 'CONFLICT':
          error = new Errors.ConflictError(message);
          break;
        case 'POLICY_VIOLATION':
          error = new Errors.PolicyError(message);
          break;
        case 'RATE_LIMIT_EXCEEDED':
          error = new Errors.RateLimitError(message);
          break;
        case 'PAYMENT_VERIFICATION_FAILED':
          error = new Errors.PaymentVerificationError(message);
          break;
        default:
          error = new Errors.AppError(message, statusCode, code || 'MCP_ERROR');
      }
      throw error;
    }

    const textContent = response.result?.content?.[0]?.text;
    if (textContent === undefined) {
      return null;
    }

    try {
      return JSON.parse(textContent);
    } catch {
      return textContent;
    }
  }
}

// Instantiate the domain servers
export const productSearchServer = new MCPServer(
  'product-search',
  'Exposes tools for searching, comparing and getting recommendations of products.',
  ['search_products', 'get_product', 'compare_products', 'delete_product']
);

export const cartManagerServer = new MCPServer(
  'cart-manager',
  'Exposes tools for creating, reading and updating the shopping cart.',
  ['create_cart', 'get_cart', 'update_cart']
);

export const orderManagerServer = new MCPServer(
  'order-manager',
  'Exposes tools for order status tracking and management.',
  ['create_order']
);

export const paymentGatewayServer = new MCPServer(
  'payment-gateway',
  'Exposes tools for payment order initiation, checking payment status, and refunds.',
  ['create_payment', 'get_payment_status', 'refund']
);

export const userContextServer = new MCPServer(
  'user-context',
  'Exposes tools for reading user context preferences.',
  []
);

// Instantiate and configure the single client
export const mcpClient = new MCPClient();
mcpClient.registerServer(productSearchServer);
mcpClient.registerServer(cartManagerServer);
mcpClient.registerServer(orderManagerServer);
mcpClient.registerServer(paymentGatewayServer);
mcpClient.registerServer(userContextServer);