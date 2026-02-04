import { supabase } from "../lib/supabaseClient";

const isConfigured = Boolean(supabase);

/**
 * Ensure Supabase client is configured.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

const SESSION_TIMEOUT_MS = 5000;
let cachedSession = null;

const withTimeout = (promise, timeoutMs) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Session lookup timed out."));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};

const getStoredSession = () => {
  if (typeof window === "undefined" || !supabase?.auth?.storageKey) return null;
  const storageKey = supabase.auth.storageKey;
  try {
    const raw =
      window.localStorage.getItem(storageKey) ||
      window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
};

const isSessionFresh = (session) => Boolean(session?.access_token);

/**
 * Fetch the current Supabase session with a timeout.
 * Falls back to stored session to avoid hanging UI states.
 * @returns {Promise<object|null>}
 */
const getSession = async () => {
  const client = requireSupabase();
  const stored = getStoredSession();
  if (isSessionFresh(stored)) {
    cachedSession = stored;
    return stored;
  }
  try {
    const { data, error } = await withTimeout(client.auth.getSession(), SESSION_TIMEOUT_MS);
    if (error) {
      throw new Error(error.message);
    }
    cachedSession = data.session ?? null;
    return cachedSession;
  } catch {
    return cachedSession ?? stored ?? null;
  }
};

/**
 * Resolve the current access token, if available.
 * @returns {Promise<string|null>}
 */
const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token ?? null;
};

/**
 * Listen for auth state changes.
 * @param {(event: string, session: object|null) => void} callback
 * @returns {{unsubscribe: () => void}}
 */
const onAuthStateChange = (callback) => {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange(callback);
  return data.subscription;
};

/**
 * Register a new user with Supabase (disabled in this app).
 * @param {{email: string, password: string, firstName?: string, lastName?: string}} payload
 * @returns {Promise<object>}
 */
const signUp = async ({ email, password, firstName, lastName }) => {
  throw new Error("Self-registration is disabled. Contact your superadmin.");
};

/**
 * Sign in with email and password.
 * @param {{email: string, password: string}} payload
 * @returns {Promise<void>}
 */
const signInWithPassword = async ({ email, password }) => {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Start an OAuth flow with the selected provider.
 * @param {"google"|"azure"} provider
 * @returns {Promise<void>}
 */
const signInWithOAuth = async (provider) => {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Exchange the OAuth redirect code for a session.
 * @param {string} url
 * @returns {Promise<void>}
 */
const exchangeCodeForSession = async (url) => {
  const client = requireSupabase();
  const { error } = await client.auth.exchangeCodeForSession(url);
  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Sign the current user out.
 * @returns {Promise<void>}
 */
const signOut = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  cachedSession = null;
  if (error) {
    throw new Error(error.message);
  }
};

export const authService = {
  isConfigured,
  getSession,
  getAccessToken,
  onAuthStateChange,
  signUp,
  signInWithPassword,
  signInWithOAuth,
  exchangeCodeForSession,
  signOut,
};
