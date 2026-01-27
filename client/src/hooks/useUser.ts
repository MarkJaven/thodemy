import { useAuth } from "../context/AuthContext";

type UseUserResult = {
  user: any;
  isLoading: boolean;
};

/**
 * Placeholder hook mirroring Supabase-style `useUser`.
 */
export const useUser = (): UseUserResult => {
  const { user, loading } = useAuth();
  return { user, isLoading: loading };
};
