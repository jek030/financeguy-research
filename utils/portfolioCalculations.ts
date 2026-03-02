export function calculateRPriceTargets(
  cost: number,
  stopLoss: number,
  type: 'Long' | 'Short'
): { priceTarget2R: number; priceTarget5R: number } {
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
