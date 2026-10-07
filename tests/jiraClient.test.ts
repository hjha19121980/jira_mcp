import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JiraApiError, JiraClient } from '../src/clients/jiraClient.js';
import type { Logger } from 'pino';

describe('JiraClient', () => {
  let server: Server;
  let baseUrl: string;
  let requests: Array<{ method: string; url: string; authorization: string | undefined }>;
  let failFirstRequest = false;

  beforeEach(async () => {
    requests = [];
    failFirstRequest = false;
    server = createServer((request, response) => {
      requests.push({
        method: request.method ?? '',
        url: request.url ?? '',
        authorization: request.headers.authorization,
      });
      if (failFirstRequest) {
        failFirstRequest = false;
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ errorMessages: ['temporary outage'] }));
        return;
      }
      if (request.url === '/not-found') {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ errorMessages: ['Issue does not exist'] }));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  function makeClient(maxRetries = 0) {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    return { client: new JiraClient(baseUrl, 'user@company.com', 'token', logger, { maxRetries }), logger };
  }

  it('sends authenticated GET, POST, and PUT requests through the shared client', async () => {
    const { client } = makeClient();
    await expect(client.get('/get')).resolves.toEqual({ ok: true });
    await expect(client.post('/post', { value: 1 })).resolves.toEqual({ ok: true });
    await expect(client.put('/put', { value: 2 })).resolves.toEqual({ ok: true });

    expect(requests.map(({ method, url }) => [method, url])).toEqual([
      ['GET', '/get'],
      ['POST', '/post'],
      ['PUT', '/put'],
    ]);
    expect(requests[0]?.authorization).toBe(`Basic ${Buffer.from('user@company.com:token').toString('base64')}`);
  });

  it('retries transient failures on idempotent methods', async () => {
    failFirstRequest = true;
    const { client, logger } = makeClient(1);
    await expect(client.get('/retry')).resolves.toEqual({ ok: true });
    expect(requests).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('surfaces a sanitized Jira error when the request fails', async () => {
    const { client, logger } = makeClient();
    await expect(client.get('/not-found')).rejects.toEqual(expect.objectContaining({
      name: 'JiraApiError',
      message: 'Issue does not exist',
      statusCode: 404,
    } satisfies Partial<JiraApiError>));
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
