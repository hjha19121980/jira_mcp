import { describe, expect, it, vi } from 'vitest';
import type { JiraApi } from '../src/clients/jiraClient.js';
import { assignIssue } from '../src/tools/assignIssue.js';
import { createIssue } from '../src/tools/createIssue.js';
import { getIssue } from '../src/tools/getIssue.js';
import { searchJira } from '../src/tools/searchJira.js';
import { transitionIssue } from '../src/tools/transitionIssue.js';
import { updateIssue } from '../src/tools/updateIssue.js';
import { createToolRegistry } from '../src/server/toolRegistry.js';
import type { Logger } from 'pino';

function createMockClient(): JiraApi {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  };
}

describe('search_jira', () => {
  it('returns the compact issue summaries from Jira', async () => {
    const client = createMockClient();
    vi.mocked(client.post).mockResolvedValue({
      issues: [{
        key: 'ABC-123',
        id: '42',
        fields: { summary: 'Fix login', status: { name: 'In Progress' }, assignee: { displayName: 'A. User' } },
      }],
    });

    await expect(searchJira(client, { jql: 'project = ABC' })).resolves.toEqual([
      { key: 'ABC-123', summary: 'Fix login', status: 'In Progress', assignee: 'A. User' },
    ]);
    expect(client.post).toHaveBeenCalledWith('/rest/api/3/search', {
      jql: 'project = ABC',
      maxResults: 50,
      fields: ['summary', 'status', 'assignee'],
    });
  });
});

describe('get_issue', () => {
  it('returns the requested issue details', async () => {
    const client = createMockClient();
    vi.mocked(client.get).mockResolvedValue({
      key: 'ABC-123',
      id: '42',
      fields: {
        summary: 'Fix login',
        description: 'Description',
        status: { name: 'Open' },
        assignee: { displayName: 'A. User' },
        priority: { name: 'High' },
        created: '2025-01-01',
        updated: '2025-01-02',
      },
    });

    await expect(getIssue(client, { issueKey: 'ABC-123' })).resolves.toEqual({
      key: 'ABC-123',
      summary: 'Fix login',
      description: 'Description',
      status: 'Open',
      assignee: 'A. User',
      priority: 'High',
      created: '2025-01-01',
      updated: '2025-01-02',
    });
    expect(client.get).toHaveBeenCalledWith('/rest/api/3/issue/ABC-123');
  });
});

describe('create_issue', () => {
  it('creates the issue and converts its description to Jira document format', async () => {
    const client = createMockClient();
    vi.mocked(client.post).mockResolvedValue({ id: '42', key: 'ABC-123' });

    await expect(createIssue(client, {
      projectKey: 'ABC',
      summary: 'Fix login',
      description: 'First line\nSecond line',
      issueType: 'Task',
    })).resolves.toEqual({ id: '42', key: 'ABC-123' });
    expect(client.post).toHaveBeenCalledWith('/rest/api/3/issue', {
      fields: {
        project: { key: 'ABC' },
        summary: 'Fix login',
        description: {
          type: 'doc',
          version: 1,
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'First line' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
          ],
        },
        issuetype: { name: 'Task' },
      },
    });
  });
});

describe('assign_issue', () => {
  it('assigns an issue then retrieves the updated display name', async () => {
    const client = createMockClient();
    vi.mocked(client.put).mockResolvedValue(undefined);
    vi.mocked(client.get).mockResolvedValue({
      key: 'ABC-123',
      id: '42',
      fields: { summary: 'Fix login', assignee: { displayName: 'A. User' } },
    });

    await expect(assignIssue(client, { issueKey: 'ABC-123', accountId: 'account-1' })).resolves.toEqual({
      key: 'ABC-123',
      assignee: 'A. User',
    });
    expect(client.put).toHaveBeenCalledWith('/rest/api/3/issue/ABC-123/assignee', { accountId: 'account-1' });
    expect(client.get).toHaveBeenCalledWith('/rest/api/3/issue/ABC-123', { params: { fields: 'assignee' } });
  });
});

describe('update_issue', () => {
  it('updates only supplied fields', async () => {
    const client = createMockClient();
    vi.mocked(client.put).mockResolvedValue(undefined);

    await expect(updateIssue(client, { issueKey: 'ABC-123', summary: 'New summary' })).resolves.toEqual({
      success: true,
      message: 'Issue ABC-123 updated successfully',
    });
    expect(client.put).toHaveBeenCalledWith('/rest/api/3/issue/ABC-123', { fields: { summary: 'New summary' } });
  });
});

describe('transition_issue', () => {
  it('checks that the transition is available, applies it, and returns the new status', async () => {
    const client = createMockClient();
    vi.mocked(client.get)
      .mockResolvedValueOnce({ transitions: [{ id: '31', name: 'Start Progress' }] })
      .mockResolvedValueOnce({ key: 'ABC-123', id: '42', fields: { summary: 'Task', status: { name: 'In Progress' } } });
    vi.mocked(client.post).mockResolvedValue(undefined);

    await expect(transitionIssue(client, { issueKey: 'ABC-123', transitionId: '31' })).resolves.toEqual({
      key: 'ABC-123',
      status: 'In Progress',
      transition: 'Start Progress',
    });
    expect(client.post).toHaveBeenCalledWith('/rest/api/3/issue/ABC-123/transitions', { transition: { id: '31' } });
  });

  it('rejects transitions that are not available', async () => {
    const client = createMockClient();
    vi.mocked(client.get).mockResolvedValue({ transitions: [] });
    await expect(transitionIssue(client, { issueKey: 'ABC-123', transitionId: '31' }))
      .rejects.toThrow('Transition 31 is not available for ABC-123');
  });
});

describe('tool registry', () => {
  it('lists all tools and formats validation, unknown tool, and invocation failures', async () => {
    const client = createMockClient();
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;
    const registry = createToolRegistry(client, logger);
    expect(registry.tools.map(({ name }) => name)).toEqual([
      'search_jira',
      'get_issue',
      'create_issue',
      'update_issue',
      'assign_issue',
      'transition_issue',
    ]);

    const invalid = await registry.call('get_issue', { issueKey: 'invalid' });
    expect(invalid.isError).toBe(true);
    expect(invalid.content[0]?.text).toContain('issueKey must look like ABC-123');

    const unknown = await registry.call('not_a_tool', {});
    expect(unknown.isError).toBe(true);

    vi.mocked(client.post).mockRejectedValue(new Error('Jira unavailable'));
    const failed = await registry.call('search_jira', { jql: 'project = ABC' });
    expect(failed.isError).toBe(true);
    expect(failed.content[0]?.text).toContain('Jira unavailable');
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
