"use client";
import React from 'react';
import { useEffect, useState, use } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useSectorStocks } from '@/hooks/FMP/useSectorStocks';

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
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedParams = use(params);
  const sector = decodeURIComponent(resolvedParams.sector);
  const industry = decodeURIComponent(resolvedParams.industry);

  // Get sector stocks data, either from API or sessionStorage
  const { data: apiSectorData, isLoading: apiLoading, error: apiError } = useSectorStocks(sector);

  // Get unique countries from data
  const countries = React.useMemo(() => {
    if (!data || data.length === 0) return ["US"];
    
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to get data from sessionStorage
        const storedData = sessionStorage.getItem('sectorStocksData');
        let industryStocks: SectorStock[] = [];
        
        if (storedData) {
          // Use data from sessionStorage if available
          console.log('Using data from sessionStorage');
          try {
            const allStocks: SectorStock[] = JSON.parse(storedData);
            console.log('Total stocks from sessionStorage:', allStocks.length);
            console.log('Looking for industry:', industry);
            
            // Check case sensitivity and trim whitespace for more reliable matching
            industryStocks = allStocks.filter(stock => 
              stock.industry && 
              stock.industry.trim().toLowerCase() === industry.trim().toLowerCase()
            );
            
            console.log('Filtered industry stocks count:', industryStocks.length);
            
            if (industryStocks.length === 0 && allStocks.length > 0) {
              // If no exact match, show available industries for debugging
              const availableIndustries = [...new Set(allStocks.map(s => s.industry))];
              console.log('Available industries:', availableIndustries);
              
              // Try a more flexible match if exact match fails
              industryStocks = allStocks.filter(stock => 
                stock.industry && 
                stock.industry.trim().toLowerCase().includes(industry.trim().toLowerCase())
              );
              console.log('Flexible match industry stocks count:', industryStocks.length);
            }
          } catch (jsonError) {
            console.error('Error parsing sessionStorage data:', jsonError);
            // Continue to API data if sessionStorage parsing fails
          }
        }
        
        if (industryStocks.length === 0 && apiSectorData) {
          console.log('Using data from API, stocks count:', apiSectorData.length);
          console.log('Looking for industry:', industry);
          
          // Case-insensitive matching for API data too
          industryStocks = apiSectorData.filter(stock => 
            stock.industry && 
            stock.industry.trim().toLowerCase() === industry.trim().toLowerCase()
          );
          
          console.log('Filtered industry stocks from API count:', industryStocks.length);
          
          if (industryStocks.length === 0 && apiSectorData.length > 0) {
            // If no exact match, try a more flexible approach with API data
            const availableIndustries = [...new Set(apiSectorData.map(s => s.industry))];
            console.log('Available industries from API:', availableIndustries);
            
            industryStocks = apiSectorData.filter(stock => 
              stock.industry && 
              stock.industry.trim().toLowerCase().includes(industry.trim().toLowerCase())
            );
            console.log('Flexible match API stocks count:', industryStocks.length);
          }
          
          // Save to sessionStorage for future use (only if we have data)
          if (apiSectorData.length > 0) {
            sessionStorage.setItem('sectorStocksData', JSON.stringify(apiSectorData));
          }
        }
        
        setData(industryStocks);
      } catch (err) {
        console.error('Error loading industry data:', err);
        setError('Failed to load industry data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [industry, apiSectorData]);

  // Filter data by selected country
  const filteredData = selectedCountry === "All" 
    ? data 
    : data.filter(item => item.country === selectedCountry);

  const sortedData = [...filteredData].sort((a, b) => {
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

  if (isLoading || apiLoading) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">Loading industry data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || apiError) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-destructive">{error || apiError?.message || 'An error occurred'}</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">No stocks found for this industry.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
      <CardHeader className="pb-2 space-y-2 sm:px-6 px-3 pt-4 sm:pt-6">
        <CardTitle className="text-xl font-semibold">{industry}</CardTitle>
        <CardDescription>
          Stocks in the {industry} industry within the {sector} sector
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
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px] sm:min-w-[200px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('companyName')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Name
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[120px] w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('price')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Price
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[120px] w-[70px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('marketCap')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Mkt Cap
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[100px] w-[70px] hidden sm:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('exchangeShortName')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold"
                  >
                    Exchange
                  </Button>
                </TableHead>
                <TableHead className="sm:w-[100px] w-[70px] hidden sm:table-cell">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('country')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold"
                  >
                    Country
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
                    className="font-medium cursor-pointer text-blue-600 dark:text-blue-400 hover:underline sm:p-4 py-2 px-1 text-sm sm:text-base"
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
                  <TableCell className="font-medium hidden sm:table-cell sm:p-4 py-2 px-1">
                    {item.exchangeShortName}
                  </TableCell>
                  <TableCell className="font-medium hidden sm:table-cell sm:p-4 py-2 px-1">
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