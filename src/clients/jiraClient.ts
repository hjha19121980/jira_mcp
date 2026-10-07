import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { Logger } from 'pino';
import type { JiraErrorPayload } from '../types/jiraTypes.js';

interface TimedRequestConfig extends InternalAxiosRequestConfig {
  startedAt?: number;
  retryCount?: number;
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export interface JiraApi {
  get<T>(path: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
}

export class JiraClient implements JiraApi {
  private readonly axios: AxiosInstance;
  private readonly maxRetries: number;

  constructor(
    baseUrl: string,
    email: string,
    token: string,
    private readonly logger: Logger,
    options: { timeoutMs?: number; maxRetries?: number } = {},
  ) {
    this.maxRetries = options.maxRetries ?? 2;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: options.timeoutMs ?? 15_000,
      auth: { username: email, password: token },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });

    this.axios.interceptors.request.use((config) => {
      const timedConfig = config as TimedRequestConfig;
      timedConfig.startedAt = Date.now();
      this.logger.info({ method: config.method?.toUpperCase(), path: config.url }, 'Jira API request');
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => {
        const config = response.config as TimedRequestConfig;
        this.logger.info({
          method: config.method?.toUpperCase(),
          path: config.url,
          statusCode: response.status,
          durationMs: Date.now() - (config.startedAt ?? Date.now()),
        }, 'Jira API response');
        return response;
      },
      async (error: unknown) => {
        if (!axios.isAxiosError(error) || !error.config) {
          throw new JiraApiError('Jira request failed');
        }

        const config = error.config as TimedRequestConfig;
        const retryCount = config.retryCount ?? 0;
        const method = config.method?.toUpperCase();
        const statusCode = error.response?.status;
        const isRetryable = method === 'GET' || method === 'PUT';

        if (isRetryable && retryCount < this.maxRetries && this.isTransient(statusCode)) {
          config.retryCount = retryCount + 1;
          const retryAfter = Number(error.response?.headers['retry-after']);
          const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 10_000)
            : 250 * 2 ** retryCount;
          this.logger.warn({
            method,
            path: config.url,
            statusCode,
            retry: config.retryCount,
            delayMs,
          }, 'Retrying Jira API request');
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return this.axios.request(config);
        }

        this.logger.error({
          method,
          path: config.url,
          statusCode,
          durationMs: Date.now() - (config.startedAt ?? Date.now()),
          error: error.message,
        }, 'Jira API request failed');
        throw new JiraApiError(this.getErrorMessage(error.response?.data as JiraErrorPayload | undefined, statusCode), statusCode);
      },
    );
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(path, config);
    return response.data;
  }

  async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.post<T>(path, data, config);
    return response.data;
  }

  async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.put<T>(path, data, config);
    return response.data;
  }

  private isTransient(statusCode: number | undefined): boolean {
    return statusCode === undefined || statusCode === 429 || statusCode >= 500;
  }

  private getErrorMessage(payload: JiraErrorPayload | undefined, statusCode?: number): string {
    const jiraMessage = payload?.errorMessages?.join('; ')
      ?? Object.values(payload?.errors ?? {}).join('; ');

    if (jiraMessage) return jiraMessage;
    if (statusCode === 401 || statusCode === 403) return 'Jira authentication or permissions failed';
    if (statusCode === 404) return 'Jira issue or resource not found';
    if (statusCode === 429) return 'Jira rate limit exceeded; try again later';
    if (statusCode !== undefined) return `Jira request failed with status ${statusCode}`;
    return 'Unable to connect to Jira';
  }
}
