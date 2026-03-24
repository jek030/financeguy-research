import { useMovingAverageData } from "@/hooks/FMP/useMovingAverage";
import { calculatePercentDiff } from "@/components/home/marketFormatters";

interface MovingAverageDataPoint {
  ma: number;
}

interface MovingAverageSnapshot {
  value: number;
  percentDiff: number;
  dollarDiff: number;
}

interface MovingAverageResult {
  isLoading: boolean;
  snapshot: MovingAverageSnapshot;
}

interface MovingAveragesSnapshot {
  ema21: MovingAverageResult;
  ema50: MovingAverageResult;
  sma200: MovingAverageResult;
}

function getMovingAverageValue(data: MovingAverageDataPoint[] | undefined): number {
  return data && data.length > 0 && data[0]?.ma ? data[0].ma : 0;
}

function buildSnapshot(currentPrice: number, movingAverageValue: number): MovingAverageSnapshot {
  return {
    value: movingAverageValue,
    percentDiff: calculatePercentDiff(currentPrice, movingAverageValue),
    dollarDiff: currentPrice - movingAverageValue
  };
}

export function useMovingAveragesSnapshot(symbol: string, currentPrice: number): MovingAveragesSnapshot {
  const twentyOneEmaData = useMovingAverageData(symbol, "ema", "21", "1day");
  const fiftyEmaData = useMovingAverageData(symbol, "ema", "50", "1day");
  const twoHundredSmaData = useMovingAverageData(symbol, "sma", "200", "1day");

  return {
    ema21: {
      isLoading: twentyOneEmaData.isLoading,
      snapshot: buildSnapshot(currentPrice, getMovingAverageValue(twentyOneEmaData.data))
    },
    ema50: {
      isLoading: fiftyEmaData.isLoading,
      snapshot: buildSnapshot(currentPrice, getMovingAverageValue(fiftyEmaData.data))
    },
    sma200: {
      isLoading: twoHundredSmaData.isLoading,
      snapshot: buildSnapshot(currentPrice, getMovingAverageValue(twoHundredSmaData.data))
    }
  };
}
