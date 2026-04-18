'use client';

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { SectorPerformanceCard } from "./SectorPerformanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Sector } from "@/lib/types";
import { sectorDefinitions } from "@/lib/sectors";

const orderedSymbols = sectorDefinitions.map((sector) => sector.symbol);
const sectorNameMap = sectorDefinitions.reduce<Record<string, string>>((acc, sector) => {
  acc[sector.symbol] = sector.name;
  return acc;
}, {});

interface PerformanceConfig {
  key: string;
  tag: string;
  title: string;
  computeTargetDate: (latestDate: Date) => Date;
}

const performanceConfigs: PerformanceConfig[] = [
  {
    key: "week",
    tag: "1W",
    title: "1 Week Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { days: 7 })
  },
  {
    key: "month",
    tag: "1M",
    title: "1 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 1 })
  },
  {
    key: "quarter",
    tag: "3M",
    title: "3 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 3 })
  },
  {
    key: "halfYear",
    tag: "6M",
    title: "6 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 6 })
  }
];

interface PreparedPerformance {
  rows: Array<{ name: string; symbol: string; performance: number }>;
  startDate: string | null;
  endDate: string | null;
  averagePerformance: number | null;
}

interface PreparedSymbolData {
  sortedRecords: Sector[];
  latestRecord: Sector;
  latestDate: Date;
}

function adjustUtcDate(date: Date, { days = 0, months = 0 }: { days?: number; months?: number }): Date {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (months !== 0) {
    utcDate.setUTCMonth(utcDate.getUTCMonth() - months);
  }
  if (days !== 0) {
    utcDate.setUTCDate(utcDate.getUTCDate() - days);
  }
  return utcDate;
}

function createUtcDateFromString(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split("-");
  if (parts.length !== 3) {
    return null;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day));
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findClosestDataPoint(data: Sector[], targetDate: string): Sector | null {
  if (!data.length) {
    return null;
  }

  const target = createUtcDateFromString(targetDate);
  if (!target) {
    return null;
  }
  const targetTime = target.getTime();

  return data.reduce((closest: Sector | null, current) => {
    const currentDate = createUtcDateFromString(current.date);
    if (!currentDate) {
      return closest;
    }

    if (!closest) {
      return current;
    }

    const closestDate = createUtcDateFromString(closest.date);
    if (!closestDate) {
      return current;
    }

    const currentDiff = Math.abs(currentDate.getTime() - targetTime);
    const closestDiff = Math.abs(closestDate.getTime() - targetTime);

    return currentDiff < closestDiff ? current : closest;
  }, null);
}

function calculatePerformance(current?: number | null, baseline?: number | null): number {
  if (!current || !baseline || baseline === 0) {
    return 0;
  }
  return ((current - baseline) / baseline) * 100;
}

function prepareSymbolDataMap(sectorsBySymbol: Record<string, Sector[]>): Record<string, PreparedSymbolData> {
  const preparedMap: Record<string, PreparedSymbolData> = {};

  orderedSymbols.forEach((symbol) => {
    const records = sectorsBySymbol[symbol];
    if (!records || records.length === 0) {
      return;
    }

    const sortedRecords = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
    const latestRecord = sortedRecords[0];
    const latestDate = createUtcDateFromString(latestRecord?.date);

    if (!latestRecord || !latestDate) {
      return;
    }

    preparedMap[symbol] = {
      sortedRecords,
      latestRecord,
      latestDate
    };
  });

  return preparedMap;
}

function preparePerformanceData(
  preparedBySymbol: Record<string, PreparedSymbolData>,
  config: PerformanceConfig,
  globalEndDate: string | null
): PreparedPerformance {
  const rows: Array<{ name: string; symbol: string; performance: number }> = [];
  let startDate: string | null = null;

  orderedSymbols.forEach((symbol) => {
    const preparedSymbol = preparedBySymbol[symbol];
    if (!preparedSymbol) {
      return;
    }

    const targetDate = config.computeTargetDate(preparedSymbol.latestDate);
    const targetDateIso = toIsoDate(targetDate);
    const comparisonRecord = findClosestDataPoint(preparedSymbol.sortedRecords, targetDateIso);

    const performance = calculatePerformance(
      Number(preparedSymbol.latestRecord.close),
      comparisonRecord ? Number(comparisonRecord.close) : null
    );

    if (!startDate && comparisonRecord) {
      startDate = comparisonRecord.date;
    }

    rows.push({
      name: sectorNameMap[symbol] ?? symbol,
      symbol,
      performance
    });
  });

  const sortedRows = rows.sort((a, b) => b.performance - a.performance);

  const averagePerformance = sortedRows.length > 0
    ? sortedRows.reduce((sum, row) => sum + row.performance, 0) / sortedRows.length
    : null;

  return {
    rows: sortedRows,
    startDate,
    endDate: globalEndDate,
    averagePerformance
  };
}

interface SectorReturnsProps {
  sectorsBySymbol: Record<string, Sector[]>;
  latestDate: string | null;
  isLoading: boolean;
  error: Error | null;
}

function StateCard({
  title,
  heading,
  message,
  showIcon = true
}: {
  title: string;
  heading: string;
  message: string;
  showIcon?: boolean;
}) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium text-foreground/90">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {showIcon && <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />}
          <h3 className="mb-1 text-lg font-medium">{heading}</h3>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SectorReturns({ sectorsBySymbol, latestDate, isLoading, error }: SectorReturnsProps) {
  const hasAnyData = Object.values(sectorsBySymbol).some((records) => records.length > 0);
  const preparedBySymbol = useMemo(() => prepareSymbolDataMap(sectorsBySymbol), [sectorsBySymbol]);

  const performanceCards = useMemo(() => {
    if (!hasAnyData) {
      return [] as Array<{
        key: string;
        tag: string;
        title: string;
        startDate: string | null;
        endDate: string | null;
        averagePerformance: number | null;
        rows: Array<{ name: string; symbol: string; performance: number }>;
      }>;
    }

    return performanceConfigs.map((config) => {
      const result = preparePerformanceData(preparedBySymbol, config, latestDate ?? null);
      return {
        key: config.key,
        tag: config.tag,
        title: config.title,
        startDate: result.startDate,
        endDate: result.endDate,
        averagePerformance: result.averagePerformance,
        rows: result.rows
      };
    });
  }, [hasAnyData, latestDate, preparedBySymbol]);

  if (isLoading) {
    return (
      <div className="w-full grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
        {performanceConfigs.map((config) => (
          <Card
            key={config.key}
            className="w-full rounded border border-neutral-300/80 bg-white/95 shadow-sm dark:border-neutral-700 dark:bg-neutral-950/70"
          >
            <CardHeader className="space-y-1.5 border-b border-neutral-200 p-2.5 pb-2 dark:border-neutral-800">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {config.tag}
                </span>
                <span className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <CardTitle className="font-mono text-sm font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
                {config.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-2">
              <div className="h-[260px] animate-pulse rounded bg-neutral-100 dark:bg-neutral-900/60" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <StateCard
        title="Sector Performance"
        heading="Error Loading Data"
        message={error.message || "Failed to load sector performance data"}
      />
    );
  }

  if (!hasAnyData) {
    return (
      <StateCard
        title="Sector Performance"
        heading="No Data Available"
        message="Could not retrieve sector data from the database."
      />
    );
  }

  return (
    <div className="w-full grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
      {performanceCards.map((card) => (
        <SectorPerformanceCard
          key={card.key}
          tag={card.tag}
          title={card.title}
          startDate={card.startDate}
          endDate={card.endDate}
          averagePerformance={card.averagePerformance}
          data={card.rows}
        />
      ))}
    </div>
  );
} 