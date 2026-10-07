import { z } from 'zod';

const issueKey = z.string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]*-\d+$/, 'issueKey must look like ABC-123');

export const searchJiraSchema = z.object({
  jql: z.string().trim().min(1, 'jql must not be empty'),
});

export const getIssueSchema = z.object({ issueKey });

export const createIssueSchema = z.object({
  projectKey: z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/, 'projectKey must be a valid Jira project key'),
  summary: z.string().trim().min(1, 'summary must not be empty'),
  description: z.string().trim().min(1, 'description must not be empty'),
  issueType: z.string().trim().min(1, 'issueType must not be empty'),
});

export const updateIssueSchema = z.object({
  issueKey,
  summary: z.string().trim().min(1, 'summary must not be empty').optional(),
  description: z.string().trim().min(1, 'description must not be empty').optional(),
}).refine(({ summary, description }) => summary !== undefined || description !== undefined, {
  message: 'At least one of summary or description must be provided',
});

export const assignIssueSchema = z.object({
  issueKey,
  accountId: z.string().trim().min(1, 'accountId must not be empty'),
});

export const transitionIssueSchema = z.object({
  issueKey,
  transitionId: z.string().trim().regex(/^\d+$/, 'transitionId must contain only digits'),
});

export type SearchJiraInput = z.infer<typeof searchJiraSchema>;
export type GetIssueInput = z.infer<typeof getIssueSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueSchema>;
export type TransitionIssueInput = z.infer<typeof transitionIssueSchema>;
