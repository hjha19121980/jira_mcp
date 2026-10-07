import type { JiraApi } from '../clients/jiraClient.js';
import type { JiraIssue, JiraIssueDetails } from '../types/jiraTypes.js';
import { getIssueSchema, type GetIssueInput } from '../schemas/jiraSchemas.js';

export async function getIssue(client: JiraApi, input: GetIssueInput): Promise<JiraIssueDetails> {
  const { issueKey } = getIssueSchema.parse(input);
  const issue = await client.get<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`);
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description ?? null,
    status: issue.fields.status?.name ?? null,
    assignee: issue.fields.assignee?.displayName ?? null,
    priority: issue.fields.priority?.name ?? null,
    created: issue.fields.created ?? null,
    updated: issue.fields.updated ?? null,
  };
}
