import { useMarketMostActive } from "@/hooks/FMP/useMarketMostActive";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { ArrowUpDown} from 'lucide-react';
import Link from 'next/link';

interface MarketMostActive {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

export default function MarketMostActive() {
  const { data, isLoading, error } = useMarketMostActive();
  const [minPrice, setMinPrice] = useState<number>(2);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MarketMostActive;
    direction: 'asc' | 'desc';
  } | null>(null);


  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMinPrice(isNaN(value) ? 0 : value);
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">Loading most active stocks data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-destructive">{error?.message}</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...(data || [])]
    .filter(stock => stock.price >= minPrice)
    .sort((a, b) => {
    if (!sortConfig) return 0;

    let comparison = 0;
    if (sortConfig.key === 'symbol' || sortConfig.key === 'name') {
      comparison = a[sortConfig.key].localeCompare(b[sortConfig.key]);
    } else {
      comparison = a[sortConfig.key] - b[sortConfig.key];
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const requestSort = (key: keyof MarketMostActive) => {
    setSortConfig((currentSort) => {
      if (!currentSort || currentSort.key !== key) {
        return { key, direction: 'asc' };
      }
      if (currentSort.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  return (
    <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
      <CardHeader className="pb-2 space-y-2 sm:px-6 px-3 pt-4 sm:pt-6">
        <CardTitle className="text-xl font-semibold">Most Active Stocks</CardTitle>
        <CardDescription>
          Stocks with the highest relative trading volume, indicating significant market activity and investor interest
        </CardDescription>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Minimum Price ($):</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={handleMinPriceChange}
              className="w-24"
            />
          </div>
            {/*https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=*/}
        </div>
      </CardHeader>
      <CardContent className="pt-0 sm:px-6 px-2">
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('symbol')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Symbol
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('name')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('price')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('change')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Chg ($)
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('changesPercentage')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Chg (%)
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index} className="group">
                  <TableCell>
                    <Link
                      href={`/search/${encodeURIComponent(item.symbol)}`}
                      className="hover:underline text-blue-600 dark:text-blue-400">
                        {item.symbol}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {item.name}
                  </TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell className={cn(
                    item.change >= 0 ? "text-positive" : "text-negative"
                  )}>
                    ${Math.abs(item.change).toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    item.changesPercentage >= 0 ? "text-positive" : "text-negative"
                  )}>
                    {item.changesPercentage.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 