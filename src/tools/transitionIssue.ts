import type { JiraApi } from '../clients/jiraClient.js';
import type { JiraIssue, JiraTransition } from '../types/jiraTypes.js';
import { transitionIssueSchema, type TransitionIssueInput } from '../schemas/jiraSchemas.js';

export async function transitionIssue(
  client: JiraApi,
  input: TransitionIssueInput,
): Promise<{ key: string; status: string | null; transition: string }> {
  const parsed = transitionIssueSchema.parse(input);
  const transitions = await client.get<{ transitions: JiraTransition[] }>(
    `/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}/transitions`,
  );
  const transition = transitions.transitions.find(({ id }) => id === parsed.transitionId);
  if (!transition) throw new Error(`Transition ${parsed.transitionId} is not available for ${parsed.issueKey}`);

  await client.post<void>(`/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}/transitions`, {
    transition: { id: parsed.transitionId },
  });
  const issue = await client.get<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(parsed.issueKey)}`, {
    params: { fields: 'status' },
  });
  return { key: issue.key, status: issue.fields.status?.name ?? null, transition: transition.name };
}
