import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JiraClient } from './clients/jiraClient.js';
import { createMcpServer } from './server/mcpServer.js';
import { loadConfig } from './utils/config.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const jiraClient = new JiraClient(config.jiraBaseUrl, config.jiraEmail, config.jiraToken, logger);
  const server = createMcpServer(jiraClient, logger);
  await server.connect(new StdioServerTransport());
  logger.info('jira-mcp server started on stdio');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup failure';
  logger.fatal({ error: message }, 'Unable to start jira-mcp');
  process.exitCode = 1;
});
