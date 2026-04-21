// components/ui/BacktestTab.tsx
'use client';

import { useState } from 'react';
import type { StockPosition } from '@/hooks/usePortfolio';
import {
  BacktestConfig,
  DEFAULT_CONFIG,
  MAType,
  StopMethod,
  SimOutcome,
} from '@/utils/backtestCalculations';
import { useBacktest, BacktestEntry } from '@/hooks/useBacktest';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface BacktestTabProps {
  closedPositions: StockPosition[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmtCurrency = (v: number) => currencyFormatter.format(v);

const fmtR = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

function rColor(v: number) {
  return v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-muted-foreground';
}

const OUTCOME_LABELS: Record<SimOutcome, string> = {
  stopped: 'STOPPED',
  'hit-trim2': 'HIT 5R',
  'trail-exit': 'TRAIL EXIT',
  'no-exit': 'NO EXIT',
};

const OUTCOME_CLASSES: Record<SimOutcome, string> = {
  stopped: 'bg-red-950 text-red-400',
  'hit-trim2': 'bg-emerald-950 text-emerald-400',
  'trail-exit': 'bg-blue-950 text-blue-400',
  'no-exit': 'bg-muted text-muted-foreground',
};

function ConfigSidebar({
  config,
  onChange,
  onRun,
  isRunning,
}: {
  config: BacktestConfig;
  onChange: (c: BacktestConfig) => void;
  onRun: () => void;
  isRunning: boolean;
}) {
  const setStop = (patch: Partial<BacktestConfig['stop']>) =>
    onChange({ ...config, stop: { ...config.stop, ...patch } });
  const setTrim = (patch: Partial<BacktestConfig['trim']>) =>
    onChange({ ...config, trim: { ...config.trim, ...patch } });

  return (
    <div className="w-52 shrink-0 rounded-lg border border-border/60 bg-card p-4 space-y-5">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Method</Label>
        {(['low-of-entry', 'atr-percent', 'straight-percent', 'trailing-ma'] as StopMethod[]).map(
          (method) => (
            <button
              key={method}
              type="button"
              aria-pressed={config.stop.method === method}
              onClick={() => setStop({ method })}
              className={cn(
                'w-full text-left rounded px-2 py-1.5 text-xs transition-colors',
                config.stop.method === method
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              {method === 'low-of-entry' && 'Low of Entry Day'}
              {method === 'atr-percent' && 'ATR %'}
              {method === 'straight-percent' && 'Straight %'}
              {method === 'trailing-ma' && 'Trailing MA'}
            </button>
          ),
        )}

        {config.stop.method === 'atr-percent' && (
          <div className="border-l-2 border-primary pl-2 space-y-2 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground">ATR Period</Label>
              <Input
                type="number"
                value={config.stop.atrPeriod}
                onChange={(e) => setStop({ atrPeriod: Number(e.target.value) })}
                className="h-7 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={config.stop.atrMultiplier}
                onChange={(e) => setStop({ atrMultiplier: Number(e.target.value) })}
                className="h-7 text-xs mt-1"
              />
            </div>
          </div>
        )}

        {config.stop.method === 'straight-percent' && (
          <div className="border-l-2 border-primary pl-2 pt-1">
            <Label className="text-xs text-muted-foreground">% Below Entry</Label>
            <Input
              type="number"
              step="0.5"
              value={config.stop.straightPercent}
              onChange={(e) => setStop({ straightPercent: Number(e.target.value) })}
              className="h-7 text-xs mt-1"
            />
          </div>
        )}

        {config.stop.method === 'trailing-ma' && (
          <div className="border-l-2 border-primary pl-2 space-y-2 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground">MA Type</Label>
              <Select
                value={config.stop.maType}
                onValueChange={(v) => setStop({ maType: v as MAType })}
              >
                <SelectTrigger className="h-7 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMA">EMA</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Input
                type="number"
                value={config.stop.maPeriod}
                onChange={(e) => setStop({ maPeriod: Number(e.target.value) })}
                className="h-7 text-xs mt-1"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trim 1</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Fraction</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.trim.trim1Fraction}
              onChange={(e) => setTrim({ trim1Fraction: Number(e.target.value) })}
              className="h-7 text-xs mt-1"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">R Target</Label>
            <Input
              type="number"
              step="0.5"
              value={config.trim.trim1RTarget}
              onChange={(e) => setTrim({ trim1RTarget: Number(e.target.value) })}
              className="h-7 text-xs mt-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trim 2</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Fraction</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.trim.trim2Fraction}
              onChange={(e) => setTrim({ trim2Fraction: Number(e.target.value) })}
              className="h-7 text-xs mt-1"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">R Target</Label>
            <Input
              type="number"
              step="0.5"
              value={config.trim.trim2RTarget}
              onChange={(e) => setTrim({ trim2RTarget: Number(e.target.value) })}
              className="h-7 text-xs mt-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trail Exit</Label>
        <div className="flex gap-2">
          <Select
            value={config.trim.trailMAType}
            onValueChange={(v) => setTrim({ trailMAType: v as MAType })}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMA">EMA</SelectItem>
              <SelectItem value="SMA">SMA</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={config.trim.trailMAPeriod}
            onChange={(e) => setTrim({ trailMAPeriod: Number(e.target.value) })}
            className="h-7 text-xs w-16"
          />
        </div>
      </div>

      <Button onClick={onRun} size="sm" className="w-full" disabled={isRunning}>
        {isRunning ? 'Running…' : '▶ Run Backtest'}
      </Button>
    </div>
  );
}

function SummaryBar({ entries }: { entries: BacktestEntry[] }) {
  const completed = entries.filter((e) => e.result?.hasData);
  if (completed.length === 0) return null;

  const simTotalR = completed.reduce((s, e) => s + (e.result?.simR ?? 0), 0);
  const actualTotalR = completed.reduce((s, e) => s + (e.result?.actualR ?? 0), 0);
  const deltaR = simTotalR - actualTotalR;
  const simGain = completed.reduce((s, e) => s + (e.result?.simGainDollar ?? 0), 0);
  const actualGain = completed.reduce((s, e) => s + (e.result?.actualGainDollar ?? 0), 0);
  const winners = completed.filter((e) => (e.result?.simR ?? 0) > 0).length;
  const winRate = (winners / completed.length) * 100;

  const cells = [
    { label: 'SIM TOTAL R', value: fmtR(simTotalR), color: rColor(simTotalR) },
    { label: 'ACTUAL TOTAL R', value: fmtR(actualTotalR), color: rColor(actualTotalR) },
    { label: 'R DELTA', value: fmtR(deltaR), color: rColor(deltaR) },
    { label: 'SIM GAIN', value: fmtCurrency(simGain), color: rColor(simGain) },
    { label: 'ACTUAL GAIN', value: fmtCurrency(actualGain), color: rColor(actualGain) },
    { label: 'WIN RATE', value: `${winRate.toFixed(0)}%`, color: rColor(winRate - 50) },
  ];

  return (
    <div className="grid grid-cols-6 rounded-lg border border-border/60 bg-card divide-x divide-border/60">
      {cells.map(({ label, value, color }) => (
        <div key={label} className="p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
          <div className={cn('text-base font-bold', color)}>{value}</div>
        </div>
      ))}
    </div>
  );
}

const COL_HEADERS = [
  'SYMBOL', 'ENTRY $', 'STOP $', 'SIM EXIT $',
  'ACTUAL R', 'SIM R', 'DELTA R',
  'ACT GAIN $', 'SIM GAIN $', 'ACT GAIN %', 'SIM GAIN %',
  'ACTUAL DAYS', 'SIM DAYS', 'OUTCOME',
];

function ResultRow({ entry }: { entry: BacktestEntry }) {
  if (entry.loading) {
    return (
      <tr>
        {COL_HEADERS.map((h) => (
          <td key={h} className="px-3 py-2">
            <Skeleton className="h-4 w-full" />
          </td>
        ))}
      </tr>
    );
  }

  if (!entry.result) return null;
  const r = entry.result;

  if (!r.hasData) {
    return (
      <tr className="border-t border-border/40">
        <td className="px-3 py-2 font-semibold text-foreground">{r.symbol}</td>
        <td className="px-3 py-2 text-muted-foreground">${r.entryPrice.toFixed(2)}</td>
        <td colSpan={COL_HEADERS.length - 2} className="px-3 py-2 text-muted-foreground text-xs italic">
          No price data available
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border/40 hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2 font-semibold text-foreground">{r.symbol}</td>
      <td className="px-3 py-2 text-muted-foreground">${r.entryPrice.toFixed(2)}</td>
      <td className="px-3 py-2 text-muted-foreground">${r.simStopPrice.toFixed(2)}</td>
      <td className="px-3 py-2 text-muted-foreground">${r.simExitPrice.toFixed(2)}</td>
      <td className={cn('px-3 py-2', rColor(r.actualR))}>{fmtR(r.actualR)}</td>
      <td className={cn('px-3 py-2 font-semibold', rColor(r.simR))}>{fmtR(r.simR)}</td>
      <td className={cn('px-3 py-2', rColor(r.deltaR))}>{fmtR(r.deltaR)}</td>
      <td className={cn('px-3 py-2', rColor(r.actualGainDollar))}>{fmtCurrency(r.actualGainDollar)}</td>
      <td className={cn('px-3 py-2', rColor(r.simGainDollar))}>{fmtCurrency(r.simGainDollar)}</td>
      <td className={cn('px-3 py-2', rColor(r.actualGainPercent))}>{fmtPct(r.actualGainPercent)}</td>
      <td className={cn('px-3 py-2', rColor(r.simGainPercent))}>{fmtPct(r.simGainPercent)}</td>
      <td className="px-3 py-2 text-muted-foreground">{r.actualDays}d</td>
      <td className={cn('px-3 py-2', rColor(r.simDays - r.actualDays))}>{r.simDays}d</td>
      <td className="px-3 py-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', OUTCOME_CLASSES[r.outcome])}>
          {OUTCOME_LABELS[r.outcome]}
        </span>
      </td>
    </tr>
  );
}

export function BacktestTab({ closedPositions }: BacktestTabProps) {
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_CONFIG);
  const [runKey, setRunKey] = useState(0);
  const [submittedConfig, setSubmittedConfig] = useState<BacktestConfig>(DEFAULT_CONFIG);

  const { entries } = useBacktest(closedPositions, submittedConfig, runKey);
  const isRunning = entries.some((e) => e.loading);

  const handleRun = () => {
    setSubmittedConfig({ ...config });
    setRunKey((k) => k + 1);
  };

  if (closedPositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No closed positions to backtest.
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-start">
      <ConfigSidebar
        config={config}
        onChange={setConfig}
        onRun={handleRun}
        isRunning={isRunning}
      />

      <div className="flex-1 min-w-0 space-y-3">
        <SummaryBar entries={entries} />

        {entries.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-card overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {COL_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ResultRow key={entry.tradeId} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {runKey === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Configure a stop method and click Run Backtest to begin.
          </div>
        )}
      </div>
    </div>
  );
}
