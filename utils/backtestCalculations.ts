// utils/backtestCalculations.ts

export type StopMethod = 'low-of-entry' | 'atr-percent' | 'straight-percent' | 'trailing-ma';
export type MAType = 'EMA' | 'SMA';
export type SimOutcome = 'stopped' | 'hit-trim2' | 'trail-exit' | 'no-exit';

export interface StopConfig {
  method: StopMethod;
  atrPeriod: number;
  atrMultiplier: number;
  straightPercent: number;
  maType: MAType;
  maPeriod: number;
}

export interface TrimConfig {
  trim1Fraction: number;
  trim1RTarget: number;
  trim2Fraction: number;
  trim2RTarget: number;
  trailMAType: MAType;
  trailMAPeriod: number;
}

export interface BacktestConfig {
  stop: StopConfig;
  trim: TrimConfig;
}

export const DEFAULT_CONFIG: BacktestConfig = {
  stop: {
    method: 'low-of-entry',
    atrPeriod: 20,
    atrMultiplier: 1.5,
    straightPercent: 7,
    maType: 'EMA',
    maPeriod: 21,
  },
  trim: {
    trim1Fraction: 1 / 3,
    trim1RTarget: 2,
    trim2Fraction: 1 / 3,
    trim2RTarget: 5,
    trailMAType: 'EMA',
    trailMAPeriod: 21,
  },
};

export interface OHLCBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MABar {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface BacktestTradeInput {
  id: string;
  symbol: string;
  cost: number;
  quantity: number;
  initialStopLoss: number;
  realizedGain: number;
  openDate: Date;
  closedDate: Date;
  actualDays: number;
}

export interface BacktestTradeResult {
  tradeId: string;
  symbol: string;
  entryPrice: number;
  simStopPrice: number;
  simExitPrice: number;
  actualR: number;
  simR: number;
  deltaR: number;
  actualGainDollar: number;
  simGainDollar: number;
  actualGainPercent: number;
  simGainPercent: number;
  actualDays: number;
  simDays: number;
  outcome: SimOutcome;
  hasData: boolean;
}

// Uses SMA of true ranges (not Wilder's smoothed ATR) for simplicity and transparency.
export function calculateATR(bars: OHLCBar[], period: number): number {
  if (period <= 0 || bars.length < 2) return bars.length === 1 ? bars[0].high - bars[0].low : 0;
  const trueRanges = bars.slice(1).map((bar, i) => {
    const prevClose = bars[i].close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose),
    );
  });
  const slice = trueRanges.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function calculateSimStop(
  entryBar: OHLCBar,
  entryPrice: number,
  preEntryBars: OHLCBar[],
  config: StopConfig,
  stopMAValues: MABar[],
): number {
  switch (config.method) {
    case 'low-of-entry':
      return entryBar.low;
    case 'atr-percent': {
      const atr = calculateATR([...preEntryBars, entryBar], config.atrPeriod);
      return entryPrice - config.atrMultiplier * atr;
    }
    case 'straight-percent':
      return entryPrice * (1 - config.straightPercent / 100);
    case 'trailing-ma': {
      const entryMA = stopMAValues.find((m) => m.date === entryBar.date);
      // Fallback to straight-percent stop if MA data missing for entry date
      return entryMA ? entryMA.value : entryPrice * (1 - config.straightPercent / 100);
    }
  }
}

export function runBacktest(
  trade: BacktestTradeInput,
  allOHLC: OHLCBar[],
  stopMAValues: MABar[],
  trailMAValues: MABar[],
  config: BacktestConfig,
): BacktestTradeResult {
  const sorted = [...allOHLC].sort((a, b) => a.date.localeCompare(b.date));
  const openDateStr = trade.openDate.toISOString().split('T')[0];
  const entryIdx = sorted.findIndex((b) => b.date >= openDateStr);

  if (entryIdx === -1) return noDataResult(trade);

  const entryBar = sorted[entryIdx];
  const preEntryBars = sorted.slice(0, entryIdx);
  const simBars = sorted.slice(entryIdx);

  const simStopPrice = calculateSimStop(entryBar, trade.cost, preEntryBars, config.stop, stopMAValues);
  const oneR = trade.cost - simStopPrice;

  if (oneR <= 0) return noDataResult(trade); // stop above entry — invalid

  const trim1Price = trade.cost + config.trim.trim1RTarget * oneR;
  const trim2Price = trade.cost + config.trim.trim2RTarget * oneR;
  const trim1Shares = Math.floor(trade.quantity * config.trim.trim1Fraction);
  const trim2Shares = Math.floor(trade.quantity * config.trim.trim2Fraction);

  const stopMAMap = new Map(stopMAValues.map((m) => [m.date, m.value]));
  const trailMAMap = new Map(trailMAValues.map((m) => [m.date, m.value]));

  let trim1Taken = false;
  let trim2Taken = false;
  let simGainDollar = 0;
  let exitPrice = simBars[simBars.length - 1]?.close ?? trade.cost;
  let simDays = 0;
  let outcome: SimOutcome = 'no-exit';

  for (let i = 0; i < simBars.length; i++) {
    const bar = simBars[i];

    let currentStop = simStopPrice;
    if (config.stop.method === 'trailing-ma') {
      const maVal = stopMAMap.get(bar.date);
      if (maVal !== undefined) currentStop = maVal;
    }

    // 1. Stop check first — conservative, no same-day trim credit
    if (bar.low <= currentStop) {
      const sharesLeft =
        trade.quantity - (trim1Taken ? trim1Shares : 0) - (trim2Taken ? trim2Shares : 0);
      simGainDollar += sharesLeft * (currentStop - trade.cost);
      exitPrice = currentStop;
      simDays = Math.round((new Date(bar.date).getTime() - trade.openDate.getTime()) / (1000 * 60 * 60 * 24));
      outcome = 'stopped';
      break;
    }

    // 2. Trim 1
    if (!trim1Taken && bar.high >= trim1Price) {
      simGainDollar += trim1Shares * (trim1Price - trade.cost);
      trim1Taken = true;
    }

    // 3. Trim 2 (can fire same day as Trim 1 if stock gapped up)
    if (!trim2Taken && trim1Taken && bar.high >= trim2Price) {
      simGainDollar += trim2Shares * (trim2Price - trade.cost);
      trim2Taken = true;
      outcome = 'hit-trim2';
    }

    // 4. Trail exit — only after both trims
    if (trim1Taken && trim2Taken) {
      const trailVal = trailMAMap.get(bar.date);
      if (trailVal !== undefined && bar.close < trailVal) {
        const remainingShares = trade.quantity - trim1Shares - trim2Shares;
        simGainDollar += remainingShares * (bar.close - trade.cost);
        exitPrice = bar.close;
        simDays = Math.round((new Date(bar.date).getTime() - trade.openDate.getTime()) / (1000 * 60 * 60 * 24));
        outcome = 'trail-exit';
        break;
      }
    }

    // Last bar — close remaining shares at final close
    if (i === simBars.length - 1) {
      const sharesLeft =
        trade.quantity - (trim1Taken ? trim1Shares : 0) - (trim2Taken ? trim2Shares : 0);
      simGainDollar += sharesLeft * (bar.close - trade.cost);
      exitPrice = bar.close;
      simDays = Math.round((new Date(bar.date).getTime() - trade.openDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Weighted avg sim exit for simR (accounts for partial exits at trim prices)
  let weightedTotal = trim1Taken ? trim1Shares * trim1Price : 0;
  weightedTotal += trim2Taken ? trim2Shares * trim2Price : 0;
  const remainingAfterTrims =
    trade.quantity - (trim1Taken ? trim1Shares : 0) - (trim2Taken ? trim2Shares : 0);
  weightedTotal += remainingAfterTrims * exitPrice;
  const weightedAvgExit = weightedTotal / trade.quantity;

  const costBasis = trade.cost * trade.quantity;
  const rawOneR = trade.cost - trade.initialStopLoss;
  const actualR = rawOneR !== 0 ? trade.realizedGain / (trade.quantity * rawOneR) : 0;
  const simR = (weightedAvgExit - trade.cost) / (trade.cost - simStopPrice);

  return {
    tradeId: trade.id,
    symbol: trade.symbol,
    entryPrice: trade.cost,
    simStopPrice,
    simExitPrice: weightedAvgExit,
    actualR,
    simR,
    deltaR: simR - actualR,
    actualGainDollar: trade.realizedGain,
    simGainDollar,
    actualGainPercent: (trade.realizedGain / costBasis) * 100,
    simGainPercent: (simGainDollar / costBasis) * 100,
    actualDays: trade.actualDays,
    simDays,
    outcome,
    hasData: true,
  };
}

export function noDataResult(trade: BacktestTradeInput): BacktestTradeResult {
  const costBasis = trade.cost * trade.quantity;
  const oneR = trade.cost - trade.initialStopLoss;
  const actualR = oneR !== 0 ? trade.realizedGain / (trade.quantity * oneR) : 0;
  return {
    tradeId: trade.id,
    symbol: trade.symbol,
    entryPrice: trade.cost,
    simStopPrice: 0,
    simExitPrice: 0,
    actualR,
    simR: 0,
    deltaR: 0,
    actualGainDollar: trade.realizedGain,
    simGainDollar: 0,
    actualGainPercent: (trade.realizedGain / costBasis) * 100,
    simGainPercent: 0,
    actualDays: trade.actualDays,
    simDays: 0,
    outcome: 'no-exit',
    hasData: false,
  };
}
