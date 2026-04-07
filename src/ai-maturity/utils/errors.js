/**
 * Structured error classes for API interactions.
 */

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError() {
    return this.status >= 500;
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network request failed. Please check your connection.') {
    super(message, { code: 'NETWORK_ERROR' });
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(ms) {
    super(`Request timed out after ${ms}ms.`, { code: 'TIMEOUT_ERROR' });
    this.name = 'TimeoutError';
    this.timeoutMs = ms;
  }
}
