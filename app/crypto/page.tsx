'use client';

import { useState } from 'react';
import { useCryptoQuote } from '@/hooks/FMP/useCryptoQuote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { formatNumber, formatPercentage } from '@/lib/utils';
import { SUPPORTED_CRYPTOCURRENCIES } from '@/lib/constants';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, LineChart } from 'lucide-react';

export default function CryptoPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const { data: cryptoData, isLoading } = useCryptoQuote(selectedSymbol);
  const crypto = cryptoData?.[0];

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Crypto Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time cryptocurrency market data and analytics
          </p>
        </div>
        <Select
          value={selectedSymbol}
          onValueChange={setSelectedSymbol}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a cryptocurrency" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CRYPTOCURRENCIES.map((crypto) => (
              <SelectItem key={crypto.value} value={crypto.value}>
                {crypto.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      ) : !crypto ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
          <DollarSign className="h-12 w-12 text-muted-foreground" />
          <p className="text-xl text-muted-foreground">No crypto data available</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{crypto.name}</span>
                </div>
                <Badge 
                  variant={crypto.change >= 0 ? "positive" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {crypto.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercentage(crypto.changesPercentage)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold tracking-tight">${formatNumber(crypto.price)}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <span>24h Change:</span>
                <span className={crypto.change >= 0 ? "text-green-500" : "text-red-500"}>
                  ${formatNumber(crypto.change)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Trading Range
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Day Low</p>
                    <p className="text-xl font-semibold">${formatNumber(crypto.dayLow)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Day High</p>
                    <p className="text-xl font-semibold">${formatNumber(crypto.dayHigh)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Year Low</p>
                    <p className="text-xl font-semibold">${formatNumber(crypto.yearLow)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Year High</p>
                    <p className="text-xl font-semibold">${formatNumber(crypto.yearHigh)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Market Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                  <p className="text-xl font-semibold">${formatNumber(crypto.marketCap)}</p>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Volume (24h)</p>
                  <p className="text-xl font-semibold">{formatNumber(crypto.volume)}</p>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Avg Volume</p>
                  <p className="text-xl font-semibold">{formatNumber(crypto.avgVolume)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Moving Averages
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">50 Day MA</p>
                  <p className="text-xl font-semibold">${formatNumber(crypto.priceAvg50)}</p>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">200 Day MA</p>
                  <p className="text-xl font-semibold">${formatNumber(crypto.priceAvg200)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
