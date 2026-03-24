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
    <Card className="w-full border-slate-300/80 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 border-b border-slate-200 px-3 pb-2 pt-2.5 dark:border-slate-800">
        <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</CardTitle>
        {startDate && endDate && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
