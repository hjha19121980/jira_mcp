import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/utils/config.js';

describe('loadConfig', () => {
  it('normalizes Jira base URL and loads credentials', () => {
    expect(loadConfig({
      JIRA_BASE_URL: 'https://company.atlassian.net///',
      JIRA_EMAIL: 'user@company.com',
      JIRA_TOKEN: 'token',
    })).toEqual({
      jiraBaseUrl: 'https://company.atlassian.net',
      jiraEmail: 'user@company.com',
      jiraToken: 'token',
    });
  });

  it('reports invalid and missing environment values clearly', () => {
    expect(() => loadConfig({
      JIRA_BASE_URL: 'not a url',
      JIRA_EMAIL: 'invalid',
      JIRA_TOKEN: '',
    })).toThrow('Invalid Jira configuration:');
  });
});
