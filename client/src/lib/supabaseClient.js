import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const hasEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Remove any stale Supabase auth tokens left in localStorage from before the sessionStorage migration
if (typeof window !== "undefined") {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
}

if (!hasEnv) {
  console.warn("Supabase env vars missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = hasEnv
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      },
    })
  : null;

// Admin client for user management (requires service role key)
// WARNING: Only use in development. For production, use Supabase Edge Functions.
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: "sb-admin-auth-token",
        },
      })
    : null;
