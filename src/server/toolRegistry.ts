import type { Logger } from 'pino';
import { z } from 'zod';
import type { JiraApi } from '../clients/jiraClient.js';
import {
  assignIssueSchema,
  createIssueSchema,
  getIssueSchema,
  searchJiraSchema,
  transitionIssueSchema,
  updateIssueSchema,
} from '../schemas/jiraSchemas.js';
import { assignIssue } from '../tools/assignIssue.js';
import { createIssue } from '../tools/createIssue.js';
import { getIssue } from '../tools/getIssue.js';
import { searchJira } from '../tools/searchJira.js';
import { transitionIssue } from '../tools/transitionIssue.js';
import { updateIssue } from '../tools/updateIssue.js';

interface ToolDefinition<Schema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: Schema;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: 'string'; description: string }>;
    required?: string[];
  };
  handler(input: z.output<Schema>): Promise<unknown>;
}

function defineTool<Schema extends z.ZodType>(
  definition: ToolDefinition<Schema>,
): ToolDefinition {
  return definition as ToolDefinition;
}

export function createToolRegistry(client: JiraApi, logger: Logger) {
  const definitions: ToolDefinition[] = [
    defineTool({
      name: 'search_jira',
      description: 'Search Jira issues using JQL.',
      schema: searchJiraSchema,
      inputSchema: {
        type: 'object',
        properties: { jql: { type: 'string', description: 'Jira Query Language expression.' } },
        required: ['jql'],
      },
      handler: (input) => searchJira(client, input),
    }),
    defineTool({
      name: 'get_issue',
      description: 'Retrieve full Jira issue details.',
      schema: getIssueSchema,
      inputSchema: {
        type: 'object',
        properties: { issueKey: { type: 'string', description: 'Issue key, such as ABC-123.' } },
        required: ['issueKey'],
      },
      handler: (input) => getIssue(client, input),
    }),
    defineTool({
      name: 'create_issue',
      description: 'Create a Jira issue.',
      schema: createIssueSchema,
      inputSchema: {
        type: 'object',
        properties: {
          projectKey: { type: 'string', description: 'Project key, such as ABC.' },
          summary: { type: 'string', description: 'Issue summary.' },
          description: { type: 'string', description: 'Issue description.' },
          issueType: { type: 'string', description: 'Issue type name, such as Task.' },
        },
        required: ['projectKey', 'summary', 'description', 'issueType'],
      },
      handler: (input) => createIssue(client, input),
    }),
    defineTool({
      name: 'update_issue',
      description: 'Update the summary and/or description of a Jira issue.',
      schema: updateIssueSchema,
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key, such as ABC-123.' },
          summary: { type: 'string', description: 'New issue summary.' },
          description: { type: 'string', description: 'New issue description.' },
        },
        required: ['issueKey'],
      },
      handler: (input) => updateIssue(client, input),
    }),
    defineTool({
      name: 'assign_issue',
      description: 'Assign a Jira issue to a Jira account.',
      schema: assignIssueSchema,
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key, such as ABC-123.' },
          accountId: { type: 'string', description: 'Jira account ID of the assignee.' },
        },
        required: ['issueKey', 'accountId'],
      },
      handler: (input) => assignIssue(client, input),
    }),
    defineTool({
      name: 'transition_issue',
      description: 'Move a Jira issue through a workflow transition.',
      schema: transitionIssueSchema,
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: { type: 'string', description: 'Issue key, such as ABC-123.' },
          transitionId: { type: 'string', description: 'Numeric ID of an available transition.' },
        },
        required: ['issueKey', 'transitionId'],
      },
      handler: (input) => transitionIssue(client, input),
    }),
  ];
  const toolsByName = new Map(definitions.map((definition) => [definition.name, definition]));

  return {
    tools: definitions.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    async call(name: string, input: unknown): Promise<{ content: [{ type: 'text'; text: string }]; isError?: boolean }> {
      const definition = toolsByName.get(name);
      if (!definition) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }], isError: true };
      }

      const startedAt = Date.now();
      logger.info({ tool: name }, 'Tool invocation started');
      try {
        const parsed = definition.schema.safeParse(input);
        if (!parsed.success) {
          const details = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
            .join('; ');
          logger.warn({ tool: name, durationMs: Date.now() - startedAt, error: details }, 'Tool input validation failed');
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Validation failed: ${details}` }) }],
            isError: true,
          };
        }

        const result = await definition.handler(parsed.data);
        logger.info({ tool: name, durationMs: Date.now() - startedAt }, 'Tool invocation completed');
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected Jira operation failure';
        logger.error({ tool: name, durationMs: Date.now() - startedAt, error: message }, 'Tool invocation failed');
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }) }],
          isError: true,
        };
      }
    },
  };
}
