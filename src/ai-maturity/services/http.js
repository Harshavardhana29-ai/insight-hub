/**
 * Production-grade HTTP client built on the Fetch API.
 */

import env from '../config/env';
import { ApiError, NetworkError, TimeoutError } from '../utils/errors';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);

class HttpClient {
  constructor({
    baseURL = '',
    timeout = 120_000,
    maxRetries = 2,
    headers = {},
  } = {}) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };
    this._requestInterceptors = [];
    this._responseInterceptors = [];
  }

  addRequestInterceptor(fn) {
    this._requestInterceptors.push(fn);
    return this;
  }

  addResponseInterceptor(fn) {
    this._responseInterceptors.push(fn);
    return this;
  }

  async request(path, {
    method = 'GET',
    body,
    headers = {},
    params,
    timeout,
    retries,
    signal,
  } = {}) {
    let config = {
      url: this._buildURL(path, params),
      method: method.toUpperCase(),
      headers: { ...this.defaultHeaders, ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      timeout: timeout ?? this.timeout,
      retries: retries ?? this.maxRetries,
      signal,
    };

    for (const interceptor of this._requestInterceptors) {
      config = await interceptor(config);
    }

    return this._executeWithRetry(config, 0);
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  put(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PUT', body });
  }

  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }

  _buildURL(path, params) {
    const base = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    if (!params || Object.keys(params).length === 0) return base;
    const query = new URLSearchParams(params).toString();
    return `${base}${base.includes('?') ? '&' : '?'}${query}`;
  }

  async _executeWithRetry(config, attempt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('TIMEOUT'), config.timeout);

    if (config.signal) {
      config.signal.addEventListener('abort', () => controller.abort(config.signal.reason));
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const canRetry =
          attempt < config.retries &&
          RETRYABLE_STATUS_CODES.has(response.status) &&
          config.method === 'GET';

        if (canRetry) {
          await sleep(this._backoffDelay(attempt));
          return this._executeWithRetry(config, attempt + 1);
        }

        throw new ApiError(
          this._extractErrorMessage(data) || `Request failed with status ${response.status}`,
          {
            status: response.status,
            code: `HTTP_${response.status}`,
            payload: data,
          },
        );
      }

      let result = data;
      for (const interceptor of this._responseInterceptors) {
        result = await interceptor(response, result);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) throw error;

      if (error.name === 'AbortError') {
        if (controller.signal.reason === 'TIMEOUT') {
          throw new TimeoutError(config.timeout);
        }
        throw new ApiError('Request was cancelled.', { code: 'ABORT_ERROR' });
      }

      if (attempt < config.retries) {
        await sleep(this._backoffDelay(attempt));
        return this._executeWithRetry(config, attempt + 1);
      }

      throw new NetworkError(error.message || 'Network request failed.');
    }
  }

  _backoffDelay(attempt) {
    return Math.min(500 * 2 ** attempt, 10_000);
  }

  _extractErrorMessage(data) {
    if (typeof data === 'string') return data;
    if (data?.error) return typeof data.error === 'string' ? data.error : data.error.message;
    if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    if (data?.message) return data.message;
    return null;
  }
}

const httpClient = new HttpClient({
  baseURL: env.API_BASE_URL,
  timeout: env.API_TIMEOUT,
  maxRetries: env.API_MAX_RETRIES,
});

if (!env.IS_PRODUCTION) {
  httpClient.addRequestInterceptor((config) => {
    console.debug(`[ai-maturity-http] ${config.method} ${config.url}`);
    return config;
  });
}

export default httpClient;
export { HttpClient };
