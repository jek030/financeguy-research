import { useMemo } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Sector } from "@/lib/types";
import { sectorSymbols as defaultSectorSymbols } from "@/lib/sectors";

const ROW_LIMIT = 4999;

async function fetchSectorHistory(symbol: string): Promise<Sector[]> {
  const { data, error } = await supabase
    .from("sectors")
    .select("*")
    .eq("symbol", symbol)
    .order("date", { ascending: false })
    .range(0, ROW_LIMIT);

  if (error) {
    throw new Error(`Supabase query error for ${symbol}: ${error.message}`);
  }

  return data ?? [];
}

export interface SupabaseSectorDataResult {
  sectorsBySymbol: Record<string, Sector[]>;
  latestDate: string | null;
  earliestDate: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseSectorData(symbols: string[] = defaultSectorSymbols): SupabaseSectorDataResult {
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["supabase-sector-data", symbol],
      queryFn: () => fetchSectorHistory(symbol),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000
    }))
  }) as UseQueryResult<Sector[], Error>[];

  return useMemo(() => {
    const sectorsBySymbol: Record<string, Sector[]> = {};
    let latestDate: string | null = null;
    let earliestDate: string | null = null;

    queries.forEach((query, index) => {
      const symbol = symbols[index];
      const rows = query.data ?? [];
      sectorsBySymbol[symbol] = rows;

      rows.forEach((row) => {
        if (!latestDate || row.date > latestDate) {
          latestDate = row.date;
        }
        if (!earliestDate || row.date < earliestDate) {
          earliestDate = row.date;
        }
      });
    });

    const isLoading = queries.some((query) => query.isLoading);
    const error = queries.find((query) => query.error)?.error ?? null;

    return { sectorsBySymbol, latestDate, earliestDate, isLoading, error };
  }, [queries, symbols]);
}
