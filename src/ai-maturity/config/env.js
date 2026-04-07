/**
 * Centralised environment configuration for the AI Maturity sub-app.
 */
const env = Object.freeze({
  /** Base URL of the AI Maturity backend API (no trailing slash). */
  API_BASE_URL: import.meta.env.VITE_AI_MATURITY_API_BASE_URL || '/ai-maturity',

  /** Default request timeout in milliseconds. */
  API_TIMEOUT: Number(import.meta.env.VITE_AI_MATURITY_API_TIMEOUT) || 300_000,

  /** Maximum automatic retry attempts for transient failures. */
  API_MAX_RETRIES: Number(import.meta.env.VITE_AI_MATURITY_API_MAX_RETRIES) || 2,

  /** Whether the app is running in production mode. */
  IS_PRODUCTION: import.meta.env.PROD,

  /** Current mode string (development | production | test). */
  MODE: import.meta.env.MODE,
});

export default env;
