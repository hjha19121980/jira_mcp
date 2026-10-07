import type { JiraApi } from '../clients/jiraClient.js';
import type { JiraCreatedIssue } from '../types/jiraTypes.js';
import { createIssueSchema, type CreateIssueInput } from '../schemas/jiraSchemas.js';
import { toAdf } from '../utils/adf.js';

export async function createIssue(client: JiraApi, input: CreateIssueInput): Promise<{ key: string; id: string }> {
  const parsed = createIssueSchema.parse(input);
  const issue = await client.post<JiraCreatedIssue>('/rest/api/3/issue', {
    fields: {
      project: { key: parsed.projectKey },
      summary: parsed.summary,
      description: toAdf(parsed.description),
      issuetype: { name: parsed.issueType },
    },
  });
  return { key: issue.key, id: issue.id };
}
