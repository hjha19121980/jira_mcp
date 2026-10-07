export interface JiraUser {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
}

export interface JiraStatus {
  name: string;
}

export interface JiraNamedValue {
  name: string;
}

export interface JiraIssueFields {
  summary: string;
  description?: unknown;
  status?: JiraStatus;
  assignee?: JiraUser | null;
  priority?: JiraNamedValue | null;
  created?: string;
  updated?: string;
  [field: string]: unknown;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  startAt?: number;
  maxResults?: number;
  total?: number;
}

export interface JiraCreatedIssue {
  id: string;
  key: string;
  self?: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to?: JiraStatus;
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraErrorPayload {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

export interface JiraIssueSummary {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
}

export interface JiraIssueDetails {
  key: string;
  summary: string;
  description: unknown;
  status: string | null;
  assignee: string | null;
  priority: string | null;
  created: string | null;
  updated: string | null;
}
