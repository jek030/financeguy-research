import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCryptoNumber(num: number): string {
  if (num < 0.01) {
    // Show up to 5 decimal places for very small values
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(num);
  } else if (num < 1) {
    // Show up to 4 decimal places for small values
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  } else {
    // Show up to 2 decimal places for larger values
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

export function formatPercentage(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100);
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) {
    return `${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `${(marketCap / 1e6).toFixed(2)}M`;
  }
  return formatNumber(marketCap);
}