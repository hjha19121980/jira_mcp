# jira-mcp

A TypeScript MCP server for Jira Cloud. It uses Jira Cloud REST API v3 and exposes six tools over MCP stdio: `search_jira`, `get_issue`, `create_issue`, `update_issue`, `assign_issue`, and `transition_issue`.

## Requirements

- Node.js 22 or newer
- A Jira Cloud site and an Atlassian API token with permissions for the desired operations

## Installation

```sh
npm ci
npm run build
```

## Setup

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
| --- | --- | --- |
| `JIRA_BASE_URL` | Yes | Jira site URL, for example `https://company.atlassian.net` |
| `JIRA_EMAIL` | Yes | Email address associated with the API token |
| `JIRA_TOKEN` | Yes | Atlassian API token |
| `LOG_LEVEL` | No | Pino log level (defaults to `info`) |

Create an API token in Atlassian account security settings. The server uses HTTP Basic authentication with the email and token. Keep `.env` private and never commit credentials.

## Running locally

```sh
npm run build
npm run start
```

For development with TypeScript execution:

```sh
npm run dev
```

The server communicates through stdio. Logs are emitted to stderr so they do not interfere with MCP messages.

## Testing

```sh
npm test
npm run test:coverage
```

Tests mock the Jira API client and do not require Jira credentials.

## Running with Docker

Configure `.env`, then build and start the stdio server:

```sh
docker compose build
docker compose run --rm jira-mcp
```

The service needs an MCP client to provide stdin/stdout, so it is intended to be launched by that client, rather than run as a detached container.

## Connecting to Claude Desktop

Build the project and use an absolute path to the repository in Claude Desktop's MCP configuration (typically `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:/absolute/path/to/jira_mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://company.atlassian.net",
        "JIRA_EMAIL": "user@company.com",
        "JIRA_TOKEN": "your-jira-api-token",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

The server also loads `.env` from its working directory. Supplying credentials in the MCP client configuration or process environment is recommended for desktop application launches, where the working directory may differ.

## Connecting to VS Code MCP clients

For VS Code versions with MCP server support, add a workspace `.vscode/mcp.json` (or the equivalent user-level MCP configuration):

```json
{
  "servers": {
    "jira": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://company.atlassian.net",
        "JIRA_EMAIL": "user@company.com",
        "JIRA_TOKEN": "your-jira-api-token"
      }
    }
  }
}
```

Run `npm run build` first. Protect local configuration files containing tokens from source control.

## Tools and example calls

All tool results are returned as JSON text. Invalid inputs receive a concise `{ "success": false, "error": "..." }` response without stack traces.

### Search issues

```json
{ "jql": "project = ABC ORDER BY updated DESC" }
```

Returns a list containing `key`, `summary`, `status`, and `assignee`.

### Get issue details

```json
{ "issueKey": "ABC-123" }
```

Returns `key`, `summary`, `description`, `status`, `assignee`, `priority`, `created`, and `updated`.

### Create issue

```json
{
  "projectKey": "ABC",
  "summary": "Issue summary",
  "description": "Issue description",
  "issueType": "Task"
}
```

### Update issue

```json
{ "issueKey": "ABC-123", "summary": "Updated summary", "description": "Updated description" }
```

At least one of `summary` or `description` must be provided.

### Assign issue

```json
{ "issueKey": "ABC-123", "accountId": "jira-account-id" }
```

### Transition issue

```json
{ "issueKey": "ABC-123", "transitionId": "31" }
```

The transition must be available to the Jira user and issue's current workflow state.
