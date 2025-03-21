'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/Table";
import { formatNumber, formatPercentage, formatCryptoNumber } from '@/lib/utils';
import { SUPPORTED_CRYPTOCURRENCIES } from '@/lib/constants';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
}

export default function CryptoPage() {
  const [cryptoQuotes, setCryptoQuotes] = useState<Record<string, CryptoData>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch data for all cryptocurrencies
  useEffect(() => {
    const fetchAllCryptoData = async () => {
      setIsLoading(true);
      try {
        const promises = SUPPORTED_CRYPTOCURRENCIES.map(async (crypto) => {
          const response = await fetch(`/api/fmp/cryptoquote?symbol=${crypto.value}`);
          if (!response.ok) throw new Error(`Failed to fetch ${crypto.value}`);
          const data = await response.json();
          return { symbol: crypto.value, data: data[0] };
        });

        const results = await Promise.all(promises);
        const quotesMap: Record<string, CryptoData> = {};
        
        results.forEach((result) => {
          if (result.data) {
            quotesMap[result.symbol] = result.data;
          }
        });
        
        setCryptoQuotes(quotesMap);
      } catch (error) {
        console.error("Error fetching crypto data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCryptoData();
  }, []);

  return (
    <div className="container mx-auto p-2 space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Crypto Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time cryptocurrency market data and analytics
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-md" />
      ) : Object.keys(cryptoQuotes).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
          <DollarSign className="h-12 w-12 text-muted-foreground" />
          <p className="text-xl text-muted-foreground">No crypto data available</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>Cryptocurrency Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 bg-background z-10 w-[180px]">Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>24h Change</TableHead>
                    <TableHead>Day Low</TableHead>
                    <TableHead>Day High</TableHead>
                    <TableHead>Year Low</TableHead>
                    <TableHead>Year High</TableHead>
                    <TableHead>Market Cap</TableHead>
                    <TableHead>Volume (24h)</TableHead>
                    <TableHead>Avg Volume</TableHead>
                    <TableHead>50 Day MA</TableHead>
                    <TableHead>200 Day MA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SUPPORTED_CRYPTOCURRENCIES.map((crypto) => {
                    const data = cryptoQuotes[crypto.value];
                    if (!data) return null;
                    
                    return (
                      <TableRow key={crypto.value}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10 w-[180px]">
                          <div className="flex items-center gap-2">
                            <span>{data.name}</span>
                            <Badge 
                              variant={data.change >= 0 ? "positive" : "destructive"}
                              className="flex items-center gap-1 text-xs"
                            >
                              {data.change >= 0 ? 
                                <TrendingUp className="h-3 w-3" /> : 
                                <TrendingDown className="h-3 w-3" />
                              }
                              {formatPercentage(data.changesPercentage)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">${formatCryptoNumber(data.price)}</TableCell>
                        <TableCell className={data.change >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                          ${formatCryptoNumber(data.change)}
                        </TableCell>
                        <TableCell>${formatCryptoNumber(data.dayLow)}</TableCell>
                        <TableCell>${formatCryptoNumber(data.dayHigh)}</TableCell>
                        <TableCell>${formatCryptoNumber(data.yearLow)}</TableCell>
                        <TableCell>${formatCryptoNumber(data.yearHigh)}</TableCell>
                        <TableCell>${formatNumber(data.marketCap)}</TableCell>
                        <TableCell>{formatNumber(data.volume)}</TableCell>
                        <TableCell>{formatNumber(data.avgVolume)}</TableCell>
                        <TableCell>${formatCryptoNumber(data.priceAvg50)}</TableCell>
                        <TableCell>${formatCryptoNumber(data.priceAvg200)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
