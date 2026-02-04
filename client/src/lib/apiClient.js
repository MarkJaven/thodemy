import axios from "axios";
import { authService } from "../services/authService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 1;
const RETRY_DELAY_MS = 300;

/**
 * Pause for a specified duration.
 * @param {number} durationMs
 * @returns {Promise<void>}
 */
const delay = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

/**
 * Resolve a human-readable error message from an API error.
 * @param {any} error
 * @returns {string}
 */
const getApiErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return "Request failed. Please try again.";
};

/**
 * Determine whether a request should be retried.
 * @param {any} error
 * @returns {boolean}
 */
const shouldRetry = (error) =>
  !error?.response && error?.config?.method?.toLowerCase() === "get";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

/**
 * Enforce a timeout even if a request never resolves (e.g., awaiting auth).
 * @param {Promise<any>} promise
 * @param {number} durationMs
 * @param {string} message
 * @returns {Promise<any>}
 */
const withTimeout = (promise, durationMs, message = "Request timed out. Please try again.") => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), durationMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

apiClient.interceptors.request.use(async (config) => {
  const token = await authService.getAccessToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const retryCount = config.__retryCount || 0;

    // Check for deactivated account
    if (error?.response?.status === 403 && 
        error?.response?.data?.message?.includes("Account is deactivated")) {
      window.location.href = '/deactivated';
      return Promise.reject(error);
    }

    if (shouldRetry(error) && retryCount < MAX_RETRY_ATTEMPTS) {
      config.__retryCount = retryCount + 1;
      await delay(RETRY_DELAY_MS);
      return apiClient(config);
    }

    return Promise.reject(error);
  }
);

export { apiClient, getApiErrorMessage, withTimeout };
