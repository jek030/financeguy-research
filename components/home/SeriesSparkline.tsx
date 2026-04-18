'use client';

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

interface SeriesSparklineProps {
  /** Values in ascending chronological order (oldest → newest). */
  values: number[];
  isPositive: boolean;
  height?: number;
  ariaLabel?: string;
}

interface SparklinePoint {
  value: number;
}

export function SeriesSparkline({
  values,
  isPositive,
  height = 40,
  ariaLabel
}: SeriesSparklineProps) {
  const points = useMemo<SparklinePoint[]>(
    () => values.map((value) => ({ value })),
    [values]
  );

  if (points.length < 2) {
    return <div style={{ height }} aria-hidden />;
  }

  const strokeColor = isPositive ? "hsl(var(--positive))" : "hsl(var(--negative))";

  return (
    <div style={{ height }} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
