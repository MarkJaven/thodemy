import { useCallback, useEffect, useState } from "react";
import { dashboardApi } from "../services/dashboardApi";
import type { TopicsData } from "../types/dashboard";

const emptyData: TopicsData = {
  topics: [],
  topicProgress: [],
  topicCompletionRequests: [],
};

export const useTopicsData = (userId?: string) => {
  const [data, setData] = useState<TopicsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApi.getTopicsData(userId);
      setData(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load topics.";
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
