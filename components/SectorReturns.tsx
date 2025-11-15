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
  title: string;
  computeTargetDate: (latestDate: Date) => Date;
}

const performanceConfigs: PerformanceConfig[] = [
  {
    key: "week",
    title: "1 Week Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { days: 7 })
  },
  {
    key: "month",
    title: "1 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 1 })
  },
  {
    key: "quarter",
    title: "3 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 3 })
  },
  {
    key: "halfYear",
    title: "6 Month Performance",
    computeTargetDate: (latest) => adjustUtcDate(latest, { months: 6 })
  }
];

interface PreparedPerformance {
  rows: Array<{ name: string; symbol: string; performance: number }>;
  startDate: string | null;
  endDate: string | null;
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

function preparePerformanceData(
  sectorsBySymbol: Record<string, Sector[]>,
  config: PerformanceConfig,
  globalEndDate: string | null
): PreparedPerformance {
  const rows: Array<{ name: string; symbol: string; performance: number }> = [];
  let startDate: string | null = null;

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

    const targetDate = config.computeTargetDate(latestDate);
    const targetDateIso = toIsoDate(targetDate);
    const comparisonRecord = findClosestDataPoint(sortedRecords, targetDateIso);

    const performance = calculatePerformance(
      Number(latestRecord.close),
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

  return {
    rows: sortedRows,
    startDate,
    endDate: globalEndDate
  };
}

interface SectorReturnsProps {
  sectorsBySymbol: Record<string, Sector[]>;
  latestDate: string | null;
  isLoading: boolean;
  error: Error | null;
}

export default function SectorReturns({ sectorsBySymbol, latestDate, isLoading, error }: SectorReturnsProps) {
  const hasAnyData = Object.values(sectorsBySymbol).some((records) => records.length > 0);

  const performanceCards = useMemo(() => {
    if (!hasAnyData) {
      return [] as Array<{ key: string; title: string; startDate: string | null; endDate: string | null; rows: Array<{ name: string; symbol: string; performance: number }> }>;
    }

    return performanceConfigs.map((config) => {
      const result = preparePerformanceData(sectorsBySymbol, config, latestDate ?? null);
      return {
        key: config.key,
        title: config.title,
        startDate: result.startDate,
        endDate: result.endDate,
        rows: result.rows
      };
    });
  }, [hasAnyData, latestDate, sectorsBySymbol]);

  if (isLoading) {
    return (
      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {performanceConfigs.map((config) => (
          <Card key={config.key} className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-foreground/90">{config.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted/30 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-1">Error Loading Data</h3>
            <p className="text-muted-foreground">{error.message || "Failed to load sector performance data"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyData) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-1">No Data Available</h3>
            <p className="text-muted-foreground">Could not retrieve sector data from the database.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {performanceCards.map((card) => (
        <SectorPerformanceCard
          key={card.key}
          title={card.title}
          startDate={card.startDate}
          endDate={card.endDate}
          data={card.rows}
        />
      ))}
    </div>
  );
} 