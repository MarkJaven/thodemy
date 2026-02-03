import { useAuth } from "../context/AuthContext";

type UseUserResult = {
  user: any;
  isLoading: boolean;
  verified: boolean;
};

/**
 * Placeholder hook mirroring Supabase-style `useUser`.
 */
export const useUser = (): UseUserResult => {
  const { user, loading, verified } = useAuth();
  return { user, isLoading: loading, verified };
};
