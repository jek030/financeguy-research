'use client';

import { useQuote } from "@/hooks/FMP/useQuote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useWatchlist } from "@/hooks/useWatchlist";

function CompactWatchlistItem({ symbol, isEven }: { symbol: string; isEven: boolean }) {
  const { data: quote, isLoading } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-between py-2 px-3",
        isEven && "bg-muted/50"
      )}>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className={cn(
      "flex items-center justify-between py-2 px-3 group transition-colors",
      isEven && "bg-muted/50",
      "hover:bg-muted/100"
    )}>
      <Link 
        href={`/search/${symbol}`}
        className="text-sm hover:underline font-medium"
      >
        {symbol}
      </Link>
      <span className={cn(
        "text-sm tabular-nums font-medium",
        quote.changesPercentage >= 0 ? "text-positive" : "text-destructive"
      )}>
        {quote.changesPercentage >= 0 ? '+' : ''}
        {quote.changesPercentage.toFixed(2)}%
      </span>
    </div>
  );
}

export function CompactWatchlist() {
  const { watchlists, selectedWatchlist, setSelectedWatchlist, isLoading, error } = useWatchlist();
  const currentWatchlist = watchlists.find(w => w.id === selectedWatchlist);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Watchlists</h2>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <CompactWatchlistItem 
              key={i} 
              symbol="" 
              isEven={i % 2 === 0} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Watchlists</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-muted/50 py-2 px-3">
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWatchlist) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Watchlists</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-muted/50 py-2 px-3">
            <p className="text-sm text-muted-foreground text-center">
              Login to view watchlists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Watchlists</h2>
        <Select value={selectedWatchlist || undefined} onValueChange={setSelectedWatchlist}>
          <SelectTrigger>
            <SelectValue placeholder="Select a watchlist" />
          </SelectTrigger>
          <SelectContent>
            {watchlists.map((watchlist) => (
              <SelectItem key={watchlist.id} value={watchlist.id}>
                {watchlist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto">
        {currentWatchlist.tickers.length === 0 ? (
          <div className="bg-muted/50 py-2 px-3">
            <p className="text-sm text-muted-foreground text-center">
              No tickers in watchlist
            </p>
          </div>
        ) : (
          <div>
            {[...currentWatchlist.tickers]
              .sort((a, b) => a.symbol.localeCompare(b.symbol))
              .map((ticker, index) => (
                <CompactWatchlistItem 
                  key={ticker.symbol} 
                  symbol={ticker.symbol}
                  isEven={index % 2 === 0}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 