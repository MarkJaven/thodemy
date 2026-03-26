/**
 * MFA Service
 * Frontend API wrapper for multi-factor authentication endpoints.
 * @module services/mfaService
 */

import { apiClient } from "../lib/apiClient";

const getApiErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const mfaService = {
  /**
   * Check if MFA is enabled for the current user.
   * @returns {Promise<{mfaEnabled: boolean}>}
   */
  async checkStatus() {
    try {
      const res = await apiClient.get("/api/mfa/status");
      return res?.data?.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  /**
   * Request a new MFA code to be sent via email.
   * @returns {Promise<{sent: boolean, expiresInSeconds: number}>}
   */
  async sendCode() {
    try {
      const res = await apiClient.post("/api/mfa/send-code");
      return res?.data?.data;
    } catch (error) {
      const resp = error?.response;
      if (resp?.data?.code === "MFA_LOCKED") {
        return { sent: false, locked: true, retryAfterSeconds: resp.data.details?.retryAfterSeconds || 120 };
      }
      throw new Error(getApiErrorMessage(error));
    }
  },

  /**
   * Verify an MFA code.
   * @param {string} code - 6-digit code
   * @returns {Promise<{verified: boolean}>}
   */
  async verifyCode(code) {
    try {
      const res = await apiClient.post("/api/mfa/verify-code", { code });
      return res?.data?.data;
    } catch (error) {
      const resp = error?.response;
      if (resp?.data?.code === "MFA_LOCKED") {
        const err = new Error(resp.data.message);
        err.locked = true;
        err.retryAfterSeconds = resp.data.details?.retryAfterSeconds || 120;
        throw err;
      }
      throw new Error(getApiErrorMessage(error));
    }
  },

  /**
   * Toggle MFA on or off.
   * @param {boolean} enabled
   * @returns {Promise<{mfaEnabled: boolean}>}
   */
  async toggle(enabled) {
    try {
      const res = await apiClient.post("/api/mfa/toggle", { enabled });
      return res?.data?.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
