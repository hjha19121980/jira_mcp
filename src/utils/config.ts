import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  JIRA_BASE_URL: z.string().trim().url().refine(
    (value) => {
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    'JIRA_BASE_URL must use HTTP or HTTPS',
  ),
  JIRA_EMAIL: z.string().trim().email('JIRA_EMAIL must be a valid email address'),
  JIRA_TOKEN: z.string().trim().min(1, 'JIRA_TOKEN must not be empty'),
});

export interface AppConfig {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraToken: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid Jira configuration: ${details}`);
  }

  return {
    jiraBaseUrl: result.data.JIRA_BASE_URL.replace(/\/+$/, ''),
    jiraEmail: result.data.JIRA_EMAIL,
    jiraToken: result.data.JIRA_TOKEN,
  };
}
