import { useEffect, useState } from "react";
import { superAdminService } from "../services/superAdminService";
import type { Role } from "../types/superAdmin";

export const useUserRole = (userId?: string) => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await superAdminService.getCurrentRole(userId);
        if (isMounted) setRole(result);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load role.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { role, loading, error };
};
