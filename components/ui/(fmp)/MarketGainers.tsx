import { useMarketGainers } from '@/hooks/FMP/useMarketGainers';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";

interface MarketGainer {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

export default function MarketGainers() {
  const router = useRouter();
  const { data = [], isLoading, error } = useMarketGainers();
  const [minPrice, setMinPrice] = useState<number>(2);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MarketGainer;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSymbolClick = (symbol: string) => {
    router.push(`/search/${symbol}`);
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMinPrice(isNaN(value) ? 0 : value);
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">Loading market gainers data...</div>
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

  const sortedData = [...data]
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

  const requestSort = (key: keyof MarketGainer) => {
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
        <CardTitle className="text-xl font-semibold">Biggest Gainers</CardTitle>
        <CardDescription>
          Stocks with the highest daily value gains, indicating strong upward momentum and potential investment opportunities
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
            {/*https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=*/}
          
        </div>
      </CardHeader>
      <CardContent className="pt-0 sm:px-6 px-2">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <Table className="w-full text-sm sm:text-base">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('symbol')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Symbol
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[180px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('name')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Name
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('price')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Price
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('change')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Chg
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('changesPercentage')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Chg %
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow 
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSymbolClick(item.symbol)}
                >
                  <TableCell className="font-medium sm:p-4 py-2 px-1 text-sm sm:text-base">{item.symbol}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[150px] md:max-w-none sm:p-4 py-2 px-1 text-xs sm:text-sm">
                    {item.name}
                  </TableCell>
                  <TableCell className="font-medium sm:p-4 py-2 px-1 text-sm sm:text-base">${item.price.toFixed(2)}</TableCell>
                  <TableCell className={cn("font-medium text-positive sm:p-4 py-2 px-1 text-sm sm:text-base")}>
                    ${item.change.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn("font-medium text-positive sm:p-4 py-2 px-1 text-sm sm:text-base")}>
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
