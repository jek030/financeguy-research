export function calculateRPriceTargets(
  cost: number,
  stopLoss: number,
  type: 'Long' | 'Short'
): { priceTarget2R: number; priceTarget5R: number } {
  // Treat non-positive stops as "no configured stop" (common for options entries).
  if (stopLoss <= 0 || !Number.isFinite(stopLoss) || !Number.isFinite(cost)) {
    return {
      priceTarget2R: 0,
      priceTarget5R: 0,
    };
  }

  const initialRisk = Math.abs(cost - stopLoss);

  if (type === 'Long') {
    return {
      priceTarget2R: cost + 2 * initialRisk,
      priceTarget5R: cost + 5 * initialRisk,
    };
  } else {
    return {
      priceTarget2R: cost - 2 * initialRisk,
      priceTarget5R: cost - 5 * initialRisk,
    };
  }
}
