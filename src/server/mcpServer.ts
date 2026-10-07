import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'pino';
import type { JiraApi } from '../clients/jiraClient.js';
import { createToolRegistry } from './toolRegistry.js';

export function createMcpServer(client: JiraApi, logger: Logger): Server {
  const server = new Server(
    { name: 'jira-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  const registry = createToolRegistry(client, logger);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: registry.tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => (
    registry.call(request.params.name, request.params.arguments)
  ));
  return server;
}
