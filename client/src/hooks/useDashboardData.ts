import { useCallback, useEffect, useState } from "react";
import { dashboardApi } from "../services/dashboardApi";
import type { DashboardData } from "../types/dashboard";

const emptyData: DashboardData = {
  courses: [],
  lessons: [],
  enrollments: [],
  progress: [],
  activities: [],
  quizzes: [],
  quizScores: [],
  forms: [],
};

export const useDashboardData = (userId?: string) => {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApi.getDashboardData(userId);
      setData(response);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load dashboard data.";
      setError(message);
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await loadData();
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
};
