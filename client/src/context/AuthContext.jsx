import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

/**
 * Fetch the username from the profiles table.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
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

/**
 * Provide auth state to child components.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    /**
     * Initialize the current auth session.
     * @returns {Promise<void>}
     */
    const init = async () => {
      try {
        const currentSession = await authService.getSession();
        if (!isMounted) return;
        setSession(currentSession);
        const authUser = currentSession?.user ?? null;
        if (authUser) {
          const username = await fetchUsername(authUser.id);
          if (!isMounted) return;
          setUser({ ...authUser, username });
        } else {
          setUser(null);
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

    /**
     * Handle Supabase auth state changes.
     * @param {string} _event
     * @param {object|null} nextSession
     * @returns {void}
     */
    const handleAuthChange = (_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      const authUser = nextSession?.user ?? null;
      if (authUser) {
        // Fetch username asynchronously but don't block state update
        setUser({ ...authUser, username: null });
        fetchUsername(authUser.id).then((username) => {
          if (isMounted) {
            setUser({ ...authUser, username });
          }
        });
      } else {
        setUser(null);
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
    };
  }, []);

  /**
   * Sign the current user out.
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    setAuthError(null);
    try {
      await authService.signOut();
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const value = useMemo(
    () => ({ session, user, loading, authError, signOut }),
    [session, user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Access the auth context.
 * @returns {{
 *  session: object|null,
 *  user: object|null,
 *  loading: boolean,
 *  authError: string|null,
 *  signOut: () => Promise<void>
 * }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
