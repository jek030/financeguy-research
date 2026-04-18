const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: "percent",
  signDisplay: "always"
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercentage(value: number): string {
  return percentFormatter.format(value / 100);
}

export function formatDollarChange(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${formatNumber(Math.abs(value))}`;
}

export function formatPointChange(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatNumber(Math.abs(value))}`;
}

export function calculatePercentDiff(current: number, target: number): number {
  if (!current || !target) return 0;
  return ((current - target) / target) * 100;
}
