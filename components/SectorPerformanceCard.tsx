'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { DeltaCell } from "@/components/home/DeltaCell";

import { SectorReturnChart } from "./SectorReturnChart";

interface SectorPerformanceCardProps {
  tag: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  averagePerformance: number | null;
  data: Array<{ name: string; symbol: string; performance: number }>;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) {
    return "";
  }

  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return dateString;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(year, month, day));

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function SectorPerformanceCard({
  tag,
  title,
  startDate,
  endDate,
  averagePerformance,
  data
}: SectorPerformanceCardProps) {
  return (
    <Card className="w-full rounded border border-neutral-300/80 bg-white/95 shadow-sm dark:border-neutral-700 dark:bg-neutral-950/70">
      <CardHeader className="space-y-1.5 border-b border-neutral-200 p-2.5 pb-2 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {tag}
          </span>
          {startDate && endDate && (
            <span className="truncate font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
              {formatDate(startDate)} → {formatDate(endDate)}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <h3 className="font-mono text-sm font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
            {title}
          </h3>
          {averagePerformance !== null && (
            <DeltaCell value={averagePerformance} isDollar={false} className="font-mono text-[11px]" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-2">
        <SectorReturnChart data={data} />
      </CardContent>
    </Card>
  );
}
