'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
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
import { TrendingUp, TrendingDown, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/auth-context';
import { supabase } from '@/lib/supabase';
import { formatMarketCap } from '@/lib/utils';
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [cryptoQuotes, setCryptoQuotes] = useState<Record<string, CryptoData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [newCryptoInput, setNewCryptoInput] = useState('');
  const [customCryptos, setCustomCryptos] = useState<string[]>([]);
  const [activeCryptos, setActiveCryptos] = useState<string[]>([]);
  
  // Load user's saved cryptos or defaults based on auth status
  useEffect(() => {
    const loadCryptos = async () => {
      // Start with default list
      let cryptoList = [...SUPPORTED_CRYPTOCURRENCIES.map(c => c.value)];
      
      // If user is logged in, try to get their saved cryptos
      if (user) {
        try {
          const { data, error } = await supabase
            .from('crypto')
            .select('symbol')
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error fetching saved cryptos:', error);
            toast.error('Failed to load your saved cryptocurrencies');
          } else if (data && data.length > 0) {
            // If user has saved cryptos, use those instead of defaults
            const userCryptos = data.map(item => item.symbol);
            
            // Set custom cryptos to those that aren't in the default list
            const customList = userCryptos.filter(
              symbol => !SUPPORTED_CRYPTOCURRENCIES.some(c => c.value === symbol)
            );
            setCustomCryptos(customList);
            
            // Set the active list to all user cryptos
            cryptoList = userCryptos;
          }
        } catch (error) {
          console.error('Error in crypto fetch:', error);
        }
      }
      
      setActiveCryptos(cryptoList);
    };
    
    // Don't load until auth state is determined
    if (!isAuthLoading) {
      loadCryptos();
    }
  }, [user, isAuthLoading]);
  
  // Fetch data for all cryptocurrencies
  useEffect(() => {
    const fetchAllCryptoData = async () => {
      setIsLoading(true);
      try {
        const promises = activeCryptos.map(async (symbol) => {
          const response = await fetch(`/api/fmp/cryptoquote?symbol=${symbol}`);
          if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
          const data = await response.json();
          return { symbol, data: data[0] };
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

    if (activeCryptos.length > 0) {
      fetchAllCryptoData();
    } else {
      setIsLoading(false);
      setCryptoQuotes({});
    }
  }, [activeCryptos]);

  const handleAddCrypto = async () => {
    // If user is not logged in, show login message and return
    if (!user) {
      toast.error("You need to log in to add cryptocurrencies to your watchlist");
      return;
    }

    if (!newCryptoInput.trim()) return;
    
    // Format input to uppercase and add USD suffix if not present
    let symbol = newCryptoInput.trim().toUpperCase();
    if (!symbol.endsWith('USD')) {
      symbol = `${symbol}USD`;
    }
    
    // Check if already in the list
    if (activeCryptos.includes(symbol)) {
      toast.error(`${symbol} is already in your list`);
      return;
    }
    
    // Try to fetch data for this symbol to validate it
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fmp/cryptoquote?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${symbol}`);
      }
      
      const data = await response.json();
      if (!data[0]) {
        toast.error(`Couldn't find cryptocurrency: ${symbol}`);
        return;
      }
      
      // Add to our custom list and active list
      setCustomCryptos(prev => [...prev, symbol]);
      setActiveCryptos(prev => [...prev, symbol]);
      setNewCryptoInput('');
      
      // If user is logged in, save to Supabase
      try {
        // First check if this crypto already exists for this user
        const { data: existingData, error: checkError } = await supabase
          .from('crypto')
          .select('symbol')
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .maybeSingle();
          
        if (checkError) {
          console.error('Error checking for existing crypto:', checkError);
        }
        
        // Only insert if it doesn't already exist
        if (!existingData) {
          const { error } = await supabase
            .from('crypto')
            .insert({
              user_id: user.id,
              symbol: symbol
            });
            
          if (error) {
            console.error('Error saving crypto:', error);
            toast.error('Failed to save cryptocurrency to your account');
          } else {
            toast.success(`Added ${symbol} to your tracked cryptocurrencies`);
          }
        } else {
          // It already exists in the database, no need to add it again
          toast.info(`${symbol} is already in your tracked cryptocurrencies`);
        }
      } catch (error) {
        console.error('Error in Supabase insert:', error);
        toast.error('Failed to save cryptocurrency to your account');
      }
      
      // Update the quotes map immediately with the fetched data
      setCryptoQuotes(prev => ({
        ...prev,
        [symbol]: data[0]
      }));
    } catch (error) {
      console.error(error);
      toast.error(`Couldn't find cryptocurrency: ${symbol}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveCrypto = async (symbol: string) => {
    // If user is not logged in, show login message and return
    if (!user) {
      toast.error("You need to log in to remove cryptocurrencies from your watchlist");
      return;
    }
    
    // If it's a custom crypto, remove it from that list
    if (customCryptos.includes(symbol)) {
      setCustomCryptos(prev => prev.filter(s => s !== symbol));
    }
    
    // Remove from active cryptos list, which will trigger a re-fetch
    setActiveCryptos(prev => prev.filter(s => s !== symbol));
    
    // Also remove from the cryptoQuotes data
    setCryptoQuotes(prev => {
      const newQuotes = { ...prev };
      delete newQuotes[symbol];
      return newQuotes;
    });
    
    // Delete from Supabase
    try {
      const { error } = await supabase
        .from('crypto')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);
        
      if (error) {
        console.error('Error deleting crypto:', error);
        toast.error('Failed to remove cryptocurrency from your account');
      } else {
        toast.success(`Removed ${symbol} from your tracked cryptocurrencies`);
      }
    } catch (error) {
      console.error('Error in Supabase delete:', error);
      toast.error('Failed to remove cryptocurrency from your account');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCrypto();
    }
  };

  const getAllCryptos = () => {
    return activeCryptos.map(symbol => {
      const supportedCrypto = SUPPORTED_CRYPTOCURRENCIES.find(c => c.value === symbol);
      if (supportedCrypto) {
        return { symbol, name: supportedCrypto.label };
      }
      return { symbol, name: cryptoQuotes[symbol]?.name || symbol };
    });
  };

  return (
    <div className="container mx-auto p-2 space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Crypto Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time cryptocurrency market data and analytics. {!user && "Log into your Finance Guy account to save and track your own cryptocurrencies."}
          </p>
        </div>
      </div>

      {(isLoading && Object.keys(cryptoQuotes).length === 0) || isAuthLoading ? (
        <Skeleton className="h-[600px] w-full rounded-md" />
      ) : (
        <Card>
            
          <CardContent className="p-0">
            {/* Add crypto form */}
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <Input
                  placeholder="Add cryptocurrency (e.g. BTCUSD, ETHUSD, SOLUSD)"
                  value={newCryptoInput}
                  onChange={(e) => setNewCryptoInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="font-medium text-xs sm:text-xs h-8"
                />
                <Button 
                  onClick={handleAddCrypto}
                  title="Add cryptocurrency"
                  className="h-8 whitespace-nowrap flex-shrink-0 min-w-0 px-3"
                >
                  <Plus className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Add Crypto</span>
                  <span className="inline md:hidden ml-0.5">Add</span>
                </Button>
                </div>
              </div>
            
            <div className=" border border-border overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky left-0 bg-background z-10 w-[180px]">Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>24h Change (%)</TableHead>
                    <TableHead>24h Change ($)</TableHead>
                    <TableHead>52 Week Low</TableHead>
                    <TableHead>52 Week High</TableHead>
                    <TableHead>Market Cap</TableHead>
                    <TableHead>Volume (24h)</TableHead>
                    <TableHead>Avg Volume</TableHead>
                    <TableHead>50 Day MA</TableHead>
                    <TableHead>200 Day MA</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(cryptoQuotes).length === 0 ? (
                    <TableRow>
                      <TableCell 
                        colSpan={12} 
                        className="h-12 text-center text-xs text-muted-foreground"
                      >
                        No cryptocurrencies to display. Add one using the form above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getAllCryptos().map((crypto) => {
                      const data = cryptoQuotes[crypto.symbol];
                      if (!data) return null;
                      
                      return (
                        <TableRow key={crypto.symbol} className="group">
                          <TableCell className="text-xs sticky left-0 bg-background z-10 w-[180px]">
                            <div className="flex items-center gap-2">
                              {data.name}                         
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">${formatCryptoNumber(data.price)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">                      
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
                          <TableCell className={data.change >= 0 ? "text-xs text-positive" : "text-xs text-destructive"}>
                            ${formatCryptoNumber(data.change)}
                          </TableCell>
                          <TableCell className={data.price >= data.yearLow ? "text-xs text-right text-positive" : "text-xs text-right text-destructive"}>
                              <span className="text-black">${formatCryptoNumber(data.yearLow)}</span>
                              <div className="text-xs">
                                {((data.price - data.yearLow) / data.yearLow * 100).toFixed(2)}%
                              </div>
                          </TableCell>         
                          <TableCell className={data.price >= data.yearHigh ? "text-xs text-right text-positive" : "text-xs text-right text-destructive"}>
                              <span className="text-black">${formatCryptoNumber(data.yearHigh)}</span>
                              <div className="text-xs">
                                {((data.price - data.yearHigh) / data.yearHigh * 100).toFixed(2)}%
                              </div>
                          </TableCell>
                          <TableCell className="text-xs">${formatMarketCap(data.marketCap)}</TableCell>
                          <TableCell className="text-xs">{formatNumber(data.volume)}</TableCell>
                          <TableCell className="text-xs">{formatNumber(data.avgVolume)}</TableCell>
                          <TableCell className={data.price >= data.priceAvg50 ? "text-xs text-right text-positive" : "text-xs text-right text-destructive"}>
                              <span className="text-black">${formatCryptoNumber(data.priceAvg50)}</span>
                              <div className="text-xs">
                                {((data.price - data.priceAvg50) / data.priceAvg50 * 100).toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className={data.price >= data.priceAvg200 ? "text-xs text-right text-positive" : "text-xs text-right text-destructive"}>
                              <span className="text-black">${formatCryptoNumber(data.priceAvg200)}</span>
                              <div className="text-xs">
                                {((data.price - data.priceAvg200) / data.priceAvg200 * 100).toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCrypto(crypto.symbol)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
