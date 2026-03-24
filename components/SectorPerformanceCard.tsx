'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

import { SectorReturnChart } from "./SectorReturnChart";

interface SectorPerformanceCardProps {
  title: string;
  startDate?: string | null;
  endDate?: string | null;
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

export function SectorPerformanceCard({ title, startDate, endDate, data }: SectorPerformanceCardProps) {
  return (
    <Card className="w-full border-neutral-300/80 bg-white/95 shadow-sm dark:border-neutral-700 dark:bg-neutral-950/70">
      <CardHeader className="space-y-1.5 border-b border-neutral-200 px-3 pb-2 pt-2.5 dark:border-neutral-800">
        <CardTitle className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{title}</CardTitle>
        {startDate && endDate && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-2.5 pb-2.5 pt-2">
        <SectorReturnChart title="" data={data} />
      </CardContent>
    </Card>
  );
}
