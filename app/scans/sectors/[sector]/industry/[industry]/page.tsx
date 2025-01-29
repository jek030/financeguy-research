"use client";
import React from 'react';
import { useEffect, useState, use } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowUpDown } from "lucide-react";
import { useRouter } from 'next/navigation';

interface SectorStock {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  price: number;
  volume: number;
  exchangeShortName: string;
  country: string;
}

export default function IndustryPage({ params }: { params: Promise<{ sector: string; industry: string }> }) {
  const router = useRouter();
  const [data, setData] = useState<SectorStock[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SectorStock;
    direction: 'asc' | 'desc';
  } | null>(null);

  const resolvedParams = use(params);
  const sector = decodeURIComponent(resolvedParams.sector);
  const industry = decodeURIComponent(resolvedParams.industry);

  const handleSymbolClick = (symbol: string) => {
    router.push(`/search/${symbol}`);
  };

  useEffect(() => {
    const storedData = sessionStorage.getItem('sectorStocksData');
    if (storedData) {
      const allStocks: SectorStock[] = JSON.parse(storedData);
      const industryStocks = allStocks.filter(stock => stock.industry === industry);
      setData(industryStocks);
    }
  }, [industry]);

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;

    let comparison = 0;
    if (sortConfig.key === 'symbol' || sortConfig.key === 'companyName' || sortConfig.key === 'industry') {
      comparison = a[sortConfig.key].localeCompare(b[sortConfig.key]);
    } else {
      const aValue = Number(a[sortConfig.key]) || 0;
      const bValue = Number(b[sortConfig.key]) || 0;
      comparison = aValue - bValue;
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const requestSort = (key: keyof SectorStock) => {
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

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  if (data.length === 0) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-6xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">No stocks found for this industry.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="container px-4 py-4 mx-auto">
        <Card className="border border-border/50 shadow-sm max-w-6xl mx-auto bg-card">
          <CardHeader className="pb-3 space-y-2">
            <CardTitle className="text-xl font-semibold">{industry}</CardTitle>
            <CardDescription>
              Stocks in the {industry} industry within the {sector} sector
              <br /><br />
              <span className="text-muted-foreground/75 italic text-sm">Filtered from sector stocks data</span>
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
                      onClick={() => requestSort('companyName')}
                      className="hover:bg-transparent pl-0 font-semibold"
                    >
                      Name
                      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('price')}
                      className="hover:bg-transparent pl-0 font-semibold"
                    >
                      Price
                      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('marketCap')}
                      className="hover:bg-transparent pl-0 font-semibold"
                    >
                      Market Cap
                      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('exchangeShortName')}
                      className="hover:bg-transparent pl-0 font-semibold"
                    >
                      Exchange
                      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      onClick={() => requestSort('country')}
                      className="hover:bg-transparent pl-0 font-semibold"
                    >
                      Country
                      <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell 
                      className="font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSymbolClick(item.symbol)}
                    >
                      {item.symbol}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.companyName}</TableCell>
                    <TableCell className="font-medium">${item.price.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{formatMarketCap(item.marketCap)}</TableCell>
                    <TableCell className="font-medium">{item.exchangeShortName}</TableCell>
                    <TableCell className="font-medium">{item.country}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 