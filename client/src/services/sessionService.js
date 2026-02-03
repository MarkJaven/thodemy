import { supabase } from "../lib/supabaseClient";
import { apiClient } from "../lib/apiClient";

const DEVICE_ID_KEY = "thodemy_device_id";
let memoryDeviceId = null;

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
    if (!supabase || !userId) return;
    try {
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", userId);
    } catch (error) {
      console.error("Error deactivating sessions:", error);
    }
  },

  async deactivateCurrentSession(userId) {
    if (!supabase || !userId) return;
    const deviceToken = getDeviceId();
    try {
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("session_token", deviceToken);
    } catch (error) {
      console.error("Error deactivating current session:", error);
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
