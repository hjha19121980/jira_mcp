import pino from 'pino';

export const logger = pino({
  name: 'jira-mcp',
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: ['req.headers.authorization', 'headers.Authorization', 'config.auth.password'],
    censor: '[REDACTED]',
  },
});
