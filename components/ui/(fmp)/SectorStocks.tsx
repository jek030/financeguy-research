"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSectorStocks } from '@/hooks/FMP/useSectorStocks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

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

interface SectorStocksProps {
  sector: string;
}

export default function SectorStocks({ sector }: SectorStocksProps) {
  const router = useRouter();
  const { data, isLoading, error } = useSectorStocks(sector);
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof SectorStock;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedCountry, setSelectedCountry] = React.useState<string>("US");
  
  // Get unique countries from data
  const countries = React.useMemo(() => {
    if (!data) return ["US"];
    
    const countrySet = new Set<string>();
    data.forEach(item => {
      if (item.country) {
        countrySet.add(item.country);
      }
    });
    
    return Array.from(countrySet).sort();
  }, [data]);

  // Set default country to US if available
  React.useEffect(() => {
    if (countries.includes("US")) {
      setSelectedCountry("US");
    } else if (countries.length > 0) {
      setSelectedCountry(countries[0]);
    }
  }, [countries]);

  const handleSymbolClick = (symbol: string) => {
    router.push(`/search/${symbol}`);
  };

  const handleIndustryClick = (industry: string) => {
    sessionStorage.setItem('sectorStocksData', JSON.stringify(data));
    router.push(`/scans/sectors/${encodeURIComponent(sector)}/industry/${encodeURIComponent(industry)}`);
  };

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">Loading sector data...</div>
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

  // Filter data by selected country
  const filteredData = selectedCountry === "All" 
    ? data 
    : data?.filter(item => item.country === selectedCountry) || [];

  const sortedData = [...(filteredData || [])].sort((a, b) => {
    if (!sortConfig) return 0;

    let comparison = 0;
    if (sortConfig.key === 'symbol' || sortConfig.key === 'companyName' || sortConfig.key === 'industry' || sortConfig.key === 'exchangeShortName' || sortConfig.key === 'country') {
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

  return (
    <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
      <CardHeader className="pb-2 space-y-2 sm:px-6 px-3 pt-4 sm:pt-6">
        <CardTitle className="text-xl font-semibold">{sector} Stocks</CardTitle>
        <CardDescription>
          Stocks in the {sector} sector. Click on an industry to see more details
          {/*https://financialmodelingprep.com/api/v3/stock-screener?sector=*/}
        </CardDescription>
        <div className="flex justify-end pt-1">
          <div className="w-[140px]">
            <Select
              value={selectedCountry}
              onValueChange={setSelectedCountry}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Countries</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 sm:px-6 px-2">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <Table className="w-full text-sm sm:text-base">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sm:w-[100px] w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('symbol')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Symbol
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px] sm:min-w-[200px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('companyName')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Name
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[120px] w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('price')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Price
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[120px] w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('marketCap')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Mkt Cap
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[150px] w-[100px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('industry')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Industry
                    <ArrowUpDown className="ml-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[100px] w-[70px] hidden sm:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('exchangeShortName')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold"
                  >
                    Exchange
                    <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[100px] w-[70px] hidden sm:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('country')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold"
                  >
                    Country
                    <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
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
                    className="font-medium cursor-pointer hover:text-primary sm:p-4 py-2 px-1 text-sm sm:text-base"
                    onClick={() => handleSymbolClick(item.symbol)}
                  >
                    {item.symbol}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] md:max-w-none sm:p-4 py-2 px-1 text-xs sm:text-sm">
                    {item.companyName}
                  </TableCell>
                  <TableCell className="font-medium sm:p-4 py-2 px-1 text-sm sm:text-base">
                    ${item.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-medium sm:p-4 py-2 px-1 text-sm sm:text-base">
                    {formatMarketCap(item.marketCap)}
                  </TableCell>
                  <TableCell 
                    className="font-medium cursor-pointer hover:text-primary truncate max-w-[100px] sm:max-w-none sm:p-4 py-2 px-1 text-xs sm:text-sm"
                    onClick={() => handleIndustryClick(item.industry)}
                  >
                    {item.industry}
                  </TableCell>
                  <TableCell className="font-medium hidden sm:table-cell">
                    {item.exchangeShortName}
                  </TableCell>
                  <TableCell className="font-medium hidden sm:table-cell">
                    {item.country}
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