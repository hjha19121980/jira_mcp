import type { JiraApi } from '../clients/jiraClient.js';
import type { JiraIssue } from '../types/jiraTypes.js';
import { assignIssueSchema, type AssignIssueInput } from '../schemas/jiraSchemas.js';

export async function assignIssue(client: JiraApi, input: AssignIssueInput): Promise<{ key: string; assignee: string | null }> {
  const parsed = assignIssueSchema.parse(input);
  await client.put<void>(`/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}/assignee`, {
    accountId: parsed.accountId,
  });
  const issue = await client.get<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}`, {
    params: { fields: 'assignee' },
  });
  return { key: issue.key, assignee: issue.fields.assignee?.displayName ?? null };
}
