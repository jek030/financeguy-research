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
      <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading market gainers data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto">
        <CardContent className="pt-6">
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
    <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto bg-card">
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-xl font-semibold">Biggest Gainers</CardTitle>
        <CardDescription>
          <div className="space-y-4">
            <span className="block">
              Stocks with the highest daily value gains, indicating strong upward momentum and potential investment opportunities
            </span>
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
            <span className="block text-muted-foreground/75 italic text-sm">
              https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('symbol')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Symbol
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('name')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('price')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Price
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('change')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Change
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('changesPercentage')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Change %
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
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
                <TableCell className="font-medium">{item.symbol}</TableCell>
                <TableCell className="text-muted-foreground">{item.name}</TableCell>
                <TableCell className="font-medium">${item.price.toFixed(2)}</TableCell>
                <TableCell className={cn("font-medium", "text-positive")}>
                  ${item.change.toFixed(2)}
                </TableCell>
                <TableCell className={cn("font-medium", "text-positive")}>
                  {item.changesPercentage.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
