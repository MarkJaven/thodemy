import { supabase } from "../lib/supabaseClient";
import { apiClient } from "../lib/apiClient";
import { getPusher } from "../lib/pusherClient";

const DEVICE_ID_KEY = "thodemy_device_id";
let memoryDeviceId = null;
const isRateLimited = (error) => error?.response?.status === 429;

export const getDeviceInfo = () => {
  const ua = navigator.userAgent || "";
  let device = "Unknown Device";

  if (ua.includes("Windows")) device = "Windows PC";
  else if (ua.includes("Macintosh")) device = "Mac";
  else if (ua.includes("iPhone")) device = "iPhone";
  else if (ua.includes("iPad")) device = "iPad";
  else if (ua.includes("Android")) device = "Android Device";
  else if (ua.includes("Linux")) device = "Linux PC";

  if (ua.includes("Chrome") && !ua.includes("Edg")) device += " - Chrome";
  else if (ua.includes("Firefox")) device += " - Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) device += " - Safari";
  else if (ua.includes("Edg")) device += " - Edge";

  return device;
};

export const getDeviceId = () => {
  if (typeof window === "undefined") return "unknown-device";
  try {
    let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    memoryDeviceId = deviceId;
    return deviceId;
  } catch (error) {
    if (memoryDeviceId) return memoryDeviceId;
    const fallbackId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    memoryDeviceId = fallbackId;
    return fallbackId;
  }
};

export const sessionService = {
  async requestDeviceApproval() {
    const deviceId = getDeviceId();
    try {
      const response = await apiClient.post("/api/session/approval/request", {
        deviceId,
        deviceInfo: getDeviceInfo(),
      });
      return response?.data?.data || null;
    } catch (error) {
      console.error("Error requesting device approval:", error?.response?.data || error);
      throw error;
    }
  },

  async resolveDeviceApproval(requestId, action) {
    try {
      const response = await apiClient.post("/api/session/approval/resolve", {
        requestId,
        action,
      });
      return response?.data?.data || null;
    } catch (error) {
      console.error("Error resolving device approval:", error?.response?.data || error);
      throw error;
    }
  },

  async fetchPendingDeviceApproval() {
    try {
      const response = await apiClient.get("/api/session/approval/pending");
      return response?.data?.data?.request || null;
    } catch (error) {
      if (isRateLimited(error)) {
        return null;
      }
      console.error("Error fetching pending device approval:", error?.response?.data || error);
      return null;
    }
  },

  async getDeviceApprovalStatus(requestId) {
    try {
      const response = await apiClient.get(`/api/session/approval/status/${requestId}`);
      return response?.data?.data || null;
    } catch (error) {
      if (isRateLimited(error)) {
        return null;
      }
      console.error("Error fetching device approval status:", error?.response?.data || error);
      return null;
    }
  },

  async waitForDeviceApproval({ userId, requestId, timeoutMs = 120000, pollIntervalMs = 5000 }) {
    if (!requestId || !userId) {
      return { status: "approved" };
    }

    return new Promise((resolve) => {
      let settled = false;
      let pollTimer = null;
      let timeoutTimer = null;
      const pusher = getPusher();
      const channel = pusher ? pusher.subscribe(`user-${userId}`) : null;

      const cleanup = () => {
        if (pollTimer) clearInterval(pollTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (channel) {
          channel.unbind("device_login_response", onResponse);
        }
      };

      const finish = (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const onResponse = (payload) => {
        if (!payload || payload.requestId !== requestId) return;
        finish({ status: payload.status || "unknown" });
      };

      if (channel) {
        channel.bind("device_login_response", onResponse);
      }

      const poll = async () => {
        if (settled) return;
        const status = await sessionService.getDeviceApprovalStatus(requestId);
        if (!status) return;
        if (status.status && status.status !== "pending") {
          finish({ status: status.status });
        }
      };

      pollTimer = setInterval(poll, pollIntervalMs);
      timeoutTimer = setTimeout(() => {
        finish({ status: "timeout" });
      }, timeoutMs);

      poll();
    });
  },

  async createSession(userId) {
    if (!supabase || !userId) return;
    const deviceToken = getDeviceId();
    try {
      const { error } = await supabase.rpc("replace_user_session", {
        p_user_id: userId,
        p_session_token: deviceToken,
        p_device_info: getDeviceInfo(),
        p_user_agent: navigator.userAgent,
      });

      if (!error) return;

      const { error: upsertError } = await supabase
        .from("user_sessions")
        .upsert(
          {
            user_id: userId,
            session_token: deviceToken,
            device_info: getDeviceInfo(),
            user_agent: navigator.userAgent,
            logged_in_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "user_id" }
        );
      if (upsertError) throw upsertError;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },

  async announceSession() {
    const deviceId = getDeviceId();
    try {
      await apiClient.post("/api/session/announce", {
        deviceId,
        deviceInfo: getDeviceInfo(),
      });
    } catch (error) {
      console.error("Error announcing session via Pusher:", error?.response?.data || error);
    }
  },

  async deactivateAllSessions(userId) {
    if (!userId) return;
    try {
      await apiClient.post("/api/session/deactivate/all");
    } catch (error) {
      console.error("Error deactivating sessions:", error);
      throw error;
    }
  },

  async deactivateCurrentSession(userId) {
    if (!userId) return;
    const deviceToken = getDeviceId();
    try {
      await apiClient.post("/api/session/deactivate/current", {
        deviceId: deviceToken,
      });
    } catch (error) {
      console.error("Error deactivating current session:", error);
      throw error;
    }
  },

  async isCurrentSessionActive(userId) {
    if (!supabase || !userId) return false;
    const deviceToken = getDeviceId();
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("session_token, is_active")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data) return false;
      return data.is_active !== false && data.session_token === deviceToken;
    } catch (error) {
      console.error("Error checking current session:", error);
      return false;
    }
  },
};

export { DEVICE_ID_KEY };
