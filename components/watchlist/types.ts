import { Ticker } from '@/lib/types';

export interface WatchlistCard {
  id: string;
  name: string;
  tickers: Ticker[];
  isEditing: boolean;
} 