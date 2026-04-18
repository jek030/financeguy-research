import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { FearGreedSnapshot } from "@/lib/types";

const HISTORY_LIMIT = 30;

async function fetchFearGreedHistory(): Promise<FearGreedSnapshot[]> {
  const { data, error } = await supabase
    .from("market_sentiment_fear_greed")
    .select("*")
    .order("date", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.error("[sentiment] fear-greed fetch failed", error);
    throw new Error(`Supabase query error for fear & greed: ${error.message}`);
  }

  return (data ?? []) as FearGreedSnapshot[];
}

export interface UseSupabaseFearGreedResult {
  latest: FearGreedSnapshot | null;
  history: FearGreedSnapshot[];
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseFearGreed(): UseSupabaseFearGreedResult {
  const query = useQuery<FearGreedSnapshot[], Error>({
    queryKey: ["supabase-fear-greed"],
    queryFn: fetchFearGreedHistory,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  return useMemo(() => {
    const rows = query.data ?? [];
    const latest = rows.length > 0 ? rows[0] : null;

    return {
      latest,
      history: rows,
      isLoading: query.isLoading,
      error: query.error ?? null
    };
  }, [query.data, query.isLoading, query.error]);
}
