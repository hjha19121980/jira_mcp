import type { JiraApi } from '../clients/jiraClient.js';
import { updateIssueSchema, type UpdateIssueInput } from '../schemas/jiraSchemas.js';
import { toAdf } from '../utils/adf.js';

export async function updateIssue(client: JiraApi, input: UpdateIssueInput): Promise<{ success: true; message: string }> {
  const parsed = updateIssueSchema.parse(input);
  const fields: Record<string, unknown> = {};
  if (parsed.summary !== undefined) fields.summary = parsed.summary;
  if (parsed.description !== undefined) fields.description = toAdf(parsed.description);

  await client.put<void>(`/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}`, { fields });
  return { success: true, message: `Issue ${parsed.issueKey} updated successfully` };
}
