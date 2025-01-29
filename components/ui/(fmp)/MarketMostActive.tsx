import { useMarketMostActive } from "@/hooks/FMP/useMarketMostActive";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface MarketMostActive {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

export default function MarketMostActive() {
  const router = useRouter();
  const { data, isLoading, error } = useMarketMostActive();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MarketMostActive;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSymbolClick = (symbol: string) => {
    router.push(`/search/${symbol}`);
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading most active stocks data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => {
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
    <Card className="border border-border/50 shadow-sm max-w-4xl mx-auto bg-card">
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-xl font-semibold">Most Active Stocks</CardTitle>
        <CardDescription>
          Stocks with the highest relative trading volume, indicating significant market activity and investor interest
          <br /><br />
          <span className="text-muted-foreground/75 italic text-sm">https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=</span>
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
                <TableCell className={cn(
                  "font-medium",
                  item.change >= 0 ? "text-positive" : "text-negative"
                )}>
                  ${Math.abs(item.change).toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "font-medium",
                  item.changesPercentage >= 0 ? "text-positive" : "text-negative"
                )}>
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