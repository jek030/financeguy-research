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
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-foreground/90">{title}</CardTitle>
        {startDate && endDate && (
          <p className="text-sm text-muted-foreground">
            {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <SectorReturnChart title="" data={data} />
      </CardContent>
    </Card>
  );
}
