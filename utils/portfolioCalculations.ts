export function calculateRPriceTargets(
  cost: number,
  stopLoss: number,
  type: 'Long' | 'Short'
): { priceTarget2R: number; priceTarget5R: number } {
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

export interface PositionExitForCalc {
  price: number;
  shares: number;
  exitDate: Date | null;
}

export interface PositionForCalc {
  cost: number;
  quantity: number;
  initialStopLoss: number;
  type: 'Long' | 'Short';
  exits: PositionExitForCalc[];
}

function sumFilledShares(exits: PositionExitForCalc[]): number {
  return exits
    .filter((e) => e.exitDate !== null)
    .reduce((sum, e) => sum + e.shares, 0);
}

export function getRemainingShares(position: PositionForCalc): number {
  return position.quantity - sumFilledShares(position.exits);
}

export function getRealizedGain(position: PositionForCalc): number {
  return position.exits
    .filter((e) => e.exitDate !== null)
    .reduce((sum, e) => {
      const gainPerShare =
        position.type === 'Long' ? e.price - position.cost : position.cost - e.price;
      return sum + gainPerShare * e.shares;
    }, 0);
}

export function getRMultiple(position: PositionForCalc): number | null {
  const initialRisk = Math.abs(position.cost - position.initialStopLoss);
  if (initialRisk === 0 || position.quantity === 0) return null;

  const filledExits = position.exits.filter((e) => e.exitDate !== null);
  const filledShares = filledExits.reduce((sum, e) => sum + e.shares, 0);
  if (filledShares === 0) return null;

  const totalR = filledExits.reduce((sum, e) => {
    const perShareR =
      position.type === 'Long'
        ? (e.price - position.cost) / initialRisk
        : (position.cost - e.price) / initialRisk;
    return sum + perShareR * e.shares;
  }, 0);

  return totalR / filledShares;
}

export function isFullyClosed(position: PositionForCalc): boolean {
  if (position.quantity <= 0) return false;
  return sumFilledShares(position.exits) >= position.quantity;
}

export function getPerExitR(
  position: Pick<PositionForCalc, 'cost' | 'initialStopLoss' | 'type'>,
  exit: Pick<PositionExitForCalc, 'price'>
): number | null {
  const initialRisk = Math.abs(position.cost - position.initialStopLoss);
  if (initialRisk === 0) return null;
  return position.type === 'Long'
    ? (exit.price - position.cost) / initialRisk
    : (position.cost - exit.price) / initialRisk;
}

export function formatRMultiple(value: number | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}R`;
}
