import type { JiraApi } from '../clients/jiraClient.js';
import type { JiraSearchResponse, JiraIssueSummary } from '../types/jiraTypes.js';
import { searchJiraSchema, type SearchJiraInput } from '../schemas/jiraSchemas.js';

export async function searchJira(client: JiraApi, input: SearchJiraInput): Promise<JiraIssueSummary[]> {
  const { jql } = searchJiraSchema.parse(input);
  const result = await client.post<JiraSearchResponse>('/rest/api/3/search', {
    jql,
    maxResults: 50,
    fields: ['summary', 'status', 'assignee'],
  });

  return result.issues.map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name ?? 'Unknown',
    assignee: issue.fields.assignee?.displayName ?? null,
  }));
}
