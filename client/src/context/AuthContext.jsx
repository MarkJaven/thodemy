import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabaseClient";
import { apiClient } from "../lib/apiClient";
import { sessionService, getDeviceId } from "../services/sessionService";
import { getPusher } from "../lib/pusherClient";

const AuthContext = createContext(null);

const VERIFY_COOLDOWN_MS = 15000;
const SESSION_DEACTIVATE_TIMEOUT_MS = 2500;
const forcedSignOutLock = { value: false };

const clearLocalAuthSession = () => {
  if (typeof window === "undefined") return;
  try {
    const storageKey = supabase?.auth?.storageKey;
    if (storageKey) {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(`${storageKey}-code-verifier`);
      window.localStorage.removeItem(`${storageKey}-user`);
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(`${storageKey}-code-verifier`);
      window.sessionStorage.removeItem(`${storageKey}-user`);
    }
  } catch {
    // ignore storage failures
  }
};

const verifyAccountActive = async (lastCheckedRef, inFlightRef) => {
  if (inFlightRef.current) return true;
  const now = Date.now();
  if (now - lastCheckedRef.current < VERIFY_COOLDOWN_MS) return true;
  lastCheckedRef.current = now;
  inFlightRef.current = true;

  try {
    await apiClient.get("/me");
    return true;
  } catch (error) {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.message?.includes("Account is deactivated")
    ) {
      window.location.href = "/deactivated";
      return false;
    }
    if (error?.response?.status === 429) {
      return true;
    }
    return true;
  } finally {
    inFlightRef.current = false;
  }
};

const fetchUsername = async (userId) => {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.username ?? null;
};

const waitFor = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [verified, setVerified] = useState(false);
  const [forcedSignOutOpen, setForcedSignOutOpen] = useState(false);
  const [deviceApprovalRequest, setDeviceApprovalRequest] = useState(null);
  const [deviceApprovalOpen, setDeviceApprovalOpen] = useState(false);
  const [deviceApprovalError, setDeviceApprovalError] = useState(null);
  const [deviceApprovalLoading, setDeviceApprovalLoading] = useState(false);

  const forcedSignOutRef = useRef(false);
  const lastVerifyRef = useRef(0);
  const verifyInFlightRef = useRef(false);
  const pusherChannelRef = useRef(null);
  const pollingStopRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const approvalPollingIntervalRef = useRef(null);
  const lastDeviceApprovalRef = useRef(null);

  const clearForcedSignOut = () => {
    forcedSignOutRef.current = false;
    forcedSignOutLock.value = false;
    pollingStopRef.current = false;
    setForcedSignOutOpen(false);
  };

  const clearDeviceApproval = () => {
    setDeviceApprovalRequest(null);
    setDeviceApprovalOpen(false);
    setDeviceApprovalError(null);
    setDeviceApprovalLoading(false);
    lastDeviceApprovalRef.current = null;
  };

  const stopSessionPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const stopApprovalPolling = () => {
    if (approvalPollingIntervalRef.current) {
      clearInterval(approvalPollingIntervalRef.current);
      approvalPollingIntervalRef.current = null;
    }
  };

  const handleDeviceApprovalPayload = (payload) => {
    if (!payload?.requestId || !payload?.deviceId) return;
    const deviceToken = getDeviceId();
    if (payload.deviceId === deviceToken) return;
    if (lastDeviceApprovalRef.current === payload.requestId) return;
    lastDeviceApprovalRef.current = payload.requestId;
    setDeviceApprovalRequest({
      requestId: payload.requestId,
      deviceId: payload.deviceId,
      deviceInfo: payload.deviceInfo || "New device",
      requestedAt: payload.requestedAt || null,
    });
    setDeviceApprovalOpen(true);
  };

  const startSessionPolling = (userId) => {
    stopSessionPolling();
    if (!userId || pollingStopRef.current || forcedSignOutLock.value) return;
    const checkSession = async () => {
      if (pollingStopRef.current || forcedSignOutLock.value) {
        stopSessionPolling();
        return;
      }
      try {
        const isActive = await sessionService.isCurrentSessionActive(userId);
        if (!isActive && !forcedSignOutLock.value) {
          forcedSignOutLock.value = true;
          forcedSignOutRef.current = true;
          pollingStopRef.current = true;
          stopSessionPolling();
          setAuthError("Your account was signed in on another device.");
          setForcedSignOutOpen(true);
          signOut({ redirectTo: null, skipServerDeactivation: true });
        }
      } catch {
        // ignore polling errors
      }
    };
    pollingIntervalRef.current = setInterval(checkSession, 10000);
  };

  const startApprovalPolling = (userId) => {
    stopApprovalPolling();
    if (!userId) return;
    const poll = async () => {
      if (!userId) return;
      try {
        const pending = await sessionService.fetchPendingDeviceApproval();
        if (pending && pending.requestId) {
          handleDeviceApprovalPayload(pending);
        }
      } catch {
        // ignore polling errors
      }
    };
    approvalPollingIntervalRef.current = setInterval(poll, 10000);
    poll();
  };

  const subscribeToPusher = (userId) => {
    // Always keep approval polling active as a fallback in case realtime events are missed.
    startApprovalPolling(userId);
    const pusher = getPusher();
    if (!pusher || !userId) {
      startSessionPolling(userId);
      return;
    }
    const deviceToken = getDeviceId();
    if (pusherChannelRef.current) {
      pusherChannelRef.current.unbind_all();
      pusher.unsubscribe(pusherChannelRef.current.name);
    }

    const setupChannel = () => {
      const channel = pusher.subscribe(`user-${userId}`);
      channel.bind("pusher:subscription_succeeded", () => {
        stopSessionPolling();
      });
      channel.bind("pusher:subscription_error", () => {
        startSessionPolling(userId);
      });
      channel.bind("force_logout", (payload) => {
        const token = payload?.deviceId;
        const isActive = payload?.isActive !== false;
        if (token && token !== deviceToken && isActive && !forcedSignOutLock.value) {
          forcedSignOutLock.value = true;
          forcedSignOutRef.current = true;
          pollingStopRef.current = true;
          stopSessionPolling();
          setAuthError("Your account was signed in on another device.");
          setForcedSignOutOpen(true);
          signOut({ redirectTo: null, skipServerDeactivation: true });
        }
      });
      channel.bind("device_login_request", (payload) => {
        handleDeviceApprovalPayload(payload);
      });
      pusherChannelRef.current = channel;
    };

    // If already connected, subscribe immediately
    if (pusher.connection.state === "connected") {
      setupChannel();
    } else {
      // Wait for connection then subscribe
      pusher.connection.bind("connected", () => {
        setupChannel();
      });
      // Start polling as fallback while waiting
      startSessionPolling(userId);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const currentSession = await authService.getSession();
        if (!isMounted) return;
        setSession(currentSession);
        const authUser = currentSession?.user ?? null;
        if (authUser) {
          clearForcedSignOut();
          const username = await fetchUsername(authUser.id);
          if (!isMounted) return;
          setUser({ ...authUser, username });
          // Allow access immediately; verify account status in the background.
          if (isMounted) {
            setVerified(true);
          }
          verifyAccountActive(lastVerifyRef, verifyInFlightRef).catch(() => {});
        subscribeToPusher(authUser.id);
      } else {
        setUser(null);
        setVerified(true);
        clearDeviceApproval();
      }
    } catch (error) {
      if (!isMounted) return;
      setAuthError(error.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const handleAuthChange = async (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      const authUser = nextSession?.user ?? null;
      if (authUser) {
        clearForcedSignOut();
        setUser({ ...authUser, username: null });
        setVerified(true);
        fetchUsername(authUser.id).then((username) => {
          if (isMounted) {
            setUser({ ...authUser, username });
          }
        });
        verifyAccountActive(lastVerifyRef, verifyInFlightRef).catch(() => {});
        subscribeToPusher(authUser.id);
      } else {
        setUser(null);
        setVerified(true);
        clearDeviceApproval();
        if (pusherChannelRef.current) {
          const p = getPusher();
          pusherChannelRef.current.unbind_all();
          p?.unsubscribe(pusherChannelRef.current.name);
        }
      }
    };

    init();

    let subscription;
    try {
      subscription = authService.onAuthStateChange(handleAuthChange);
    } catch (error) {
      setAuthError(error.message);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
      stopSessionPolling();
      stopApprovalPolling();
      if (pusherChannelRef.current) {
        const p = getPusher();
        pusherChannelRef.current.unbind_all();
        p?.unsubscribe(pusherChannelRef.current.name);
      }
    };
  }, []);

  const signOut = async ({ redirectTo = "/", skipServerDeactivation = false } = {}) => {
    setAuthError(null);
    if (!skipServerDeactivation) {
      setForcedSignOutOpen(false);
      forcedSignOutLock.value = false;
      pollingStopRef.current = false;
    }
    const currentUserId = user?.id;

    // unsubscribe from realtime channel first
    if (pusherChannelRef.current) {
      const p = getPusher();
      pusherChannelRef.current.unbind_all();
      p?.unsubscribe(pusherChannelRef.current.name);
      pusherChannelRef.current = null;
    }
    stopApprovalPolling();
    clearDeviceApproval();

    // Deactivate sessions on server
    if (!skipServerDeactivation && currentUserId) {
      await Promise.allSettled([
        waitFor(
          sessionService.deactivateCurrentSession(currentUserId),
          SESSION_DEACTIVATE_TIMEOUT_MS
        ),
        waitFor(
          sessionService.deactivateAllSessions(currentUserId),
          SESSION_DEACTIVATE_TIMEOUT_MS
        ),
      ]);
    }

    // Fire-and-forget remote sign-out so UI doesn't hang if the network is slow.
    authService.signOut().catch(() => {});

    // Clear local auth + React state immediately to avoid requiring a refresh.
    clearLocalAuthSession();
    setSession(null);
    setUser(null);
    setVerified(true);

    if (!skipServerDeactivation && redirectTo) {
      window.location.replace(redirectTo);
      return;
    }
  };

  // Polling removed to avoid repeated forced sign-outs; rely on realtime

  const value = useMemo(
    () => ({
      session,
      user,
      loading: loading || (user && !verified),
      authError,
      signOut,
      verified,
      forcedSignOutOpen,
    }),
    [session, user, loading, authError, verified, forcedSignOutOpen]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {forcedSignOutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Signed in elsewhere</h3>
                <p className="text-sm text-slate-400">
                  Your account was logged in on another device.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              For your security, this session has been signed out.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => window.location.replace("/")}
                className="rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-4 py-2 text-sm font-semibold text-white"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
      {deviceApprovalOpen && deviceApprovalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l7 7-7 7-7-7 7-7z" />
                  <path d="M12 8v8" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">New device sign-in</h3>
                <p className="text-sm text-slate-400">
                  {deviceApprovalRequest.deviceInfo || "A new device"} is requesting access.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              If this was you, approve to continue on the new device. Deny to keep this session active.
            </p>
            {deviceApprovalError && (
              <p className="mt-3 text-xs text-rose-300">{deviceApprovalError}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={deviceApprovalLoading}
                onClick={async () => {
                  setDeviceApprovalLoading(true);
                  setDeviceApprovalError(null);
                  try {
                    await sessionService.resolveDeviceApproval(
                      deviceApprovalRequest.requestId,
                      "deny"
                    );
                    clearDeviceApproval();
                  } catch (error) {
                    if (error?.response?.status === 429) {
                      setDeviceApprovalError("Too many requests. Please wait a few seconds and try again.");
                    } else {
                      setDeviceApprovalError("Unable to deny request. Please try again.");
                    }
                  } finally {
                    setDeviceApprovalLoading(false);
                  }
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
              >
                Deny
              </button>
              <button
                type="button"
                disabled={deviceApprovalLoading}
                onClick={async () => {
                  setDeviceApprovalLoading(true);
                  setDeviceApprovalError(null);
                  try {
                    await sessionService.resolveDeviceApproval(
                      deviceApprovalRequest.requestId,
                      "approve"
                    );
                    clearDeviceApproval();
                  } catch (error) {
                    if (error?.response?.status === 429) {
                      setDeviceApprovalError("Too many requests. Please wait a few seconds and try again.");
                    } else {
                      setDeviceApprovalError("Unable to approve request. Please try again.");
                    }
                  } finally {
                    setDeviceApprovalLoading(false);
                  }
                }}
                className="rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-4 py-2 text-sm font-semibold text-white"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
