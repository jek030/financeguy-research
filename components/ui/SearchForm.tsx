"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem
} from "@/components/ui/Form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/components/ui/Command";

interface StockData {
  symbol: string;
  name: string;
}

const FormSchema = z.object({
  symbol: z.string().min(1, {
    message: "Symbol must be at least 1 character.",
  }),
});

interface SearchFormProps {
  className?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ className = "" }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      symbol: "",
    },
  });

  // Load stock data from the JSON file
  useEffect(() => {
    const loadStockData = async () => {
      try {
        const response = await fetch('/actively_trading.json');
        const data = await response.json();
        setStockData(data);
      } catch (error) {
        console.error('Failed to load stock data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStockData();
  }, []);

  // Filter stocks based on input value
  const filteredStocks = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];
    
    const query = inputValue.toLowerCase();
    return stockData
      .filter(stock => 
        stock.symbol.toLowerCase().includes(query) || 
        stock.name.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name A-Z
      .slice(0, 10); // Limit to 10 results for performance
  }, [stockData, inputValue]);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    // Only navigate if we have a valid symbol
    if (data.symbol && data.symbol.trim().length > 0) {
      router.push(`/search/${data.symbol.toUpperCase()}`);
      form.reset();
      setInputValue("");
      setOpen(false);
    }
  }

  const handleSelectStock = (stock: StockData) => {
    console.log('Selecting stock:', stock.symbol);
    form.setValue("symbol", stock.symbol);
    setInputValue(stock.symbol);
    setOpen(false);
    // Auto-submit when selecting from dropdown
    const route = `/search/${stock.symbol.toUpperCase()}`;
    console.log('Navigating to:', route);
    router.push(route);
    form.reset();
    setInputValue("");
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    form.setValue("symbol", value);
    setSelectedIndex(0); // Reset to first item when typing
    setOpen(value.length > 0 && filteredStocks.length > 0);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          // Only submit if there's actual input value
          if (inputValue && inputValue.trim().length > 0) {
            form.handleSubmit(onSubmit)(e);
          }
        }}
        className={`w-full ${className}`}
      >
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-1">
                <FormControl>
                  <div className="relative flex-1">
                    <div ref={triggerRef} className="flex-1">
                      <Input 
                        placeholder="Search for a symbol or company" 
                        className="flex-1 h-8 bg-background border-border rounded-l-md rounded-r-none focus-visible:ring-0 focus-visible:border-border text-sm"
                        autoComplete="off"
                        spellCheck="false"
                        autoCorrect="off"
                        autoCapitalize="off"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onFocus={() => setOpen(inputValue.length > 0 && filteredStocks.length > 0)}
                        onKeyDown={(e) => {
                          if (!open || filteredStocks.length === 0) return;
                          
                          switch (e.key) {
                            case 'ArrowDown':
                              e.preventDefault();
                              setSelectedIndex(prev => 
                                prev < filteredStocks.length - 1 ? prev + 1 : 0
                              );
                              break;
                            case 'ArrowUp':
                              e.preventDefault();
                              setSelectedIndex(prev => 
                                prev > 0 ? prev - 1 : filteredStocks.length - 1
                              );
                              break;
                            case 'Enter':
                              if (selectedIndex >= 0 && selectedIndex < filteredStocks.length) {
                                e.preventDefault();
                                handleSelectStock(filteredStocks[selectedIndex]);
                              }
                              break;
                            case 'Escape':
                              e.preventDefault();
                              setOpen(false);
                              break;
                          }
                        }}
                        onBlur={() => {
                          // Simple delay to allow clicking on results, then close
                          setTimeout(() => {
                            setOpen(false);
                          }, 150);
                          field.onBlur();
                        }}
                        name={field.name}
                        ref={field.ref}
                      />
                    </div>
                    {open && (
                      <div 
                        className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                        style={{ width: triggerRef.current?.offsetWidth }}
                      >
                        <Command>
                          <CommandList>
                            {filteredStocks.length === 0 && inputValue.length > 0 && !isLoading && (
                              <CommandEmpty>No stocks found.</CommandEmpty>
                            )}
                            {filteredStocks.length > 0 && (
                              <CommandGroup>
                                {filteredStocks.map((stock, index) => (
                                                                  <div
                                  key={stock.symbol}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectStock(stock);
                                  }}
                                  onMouseEnter={() => setSelectedIndex(index)}
                                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                                  className={`flex flex-col items-start px-3 py-2 cursor-pointer rounded-sm ${
                                    index === selectedIndex 
                                      ? 'bg-accent text-accent-foreground' 
                                      : 'hover:bg-accent hover:text-accent-foreground'
                                  }`}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                      <span className="font-semibold text-sm">{stock.symbol}</span>
                                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        Stock
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground truncate mt-0.5 w-full">
                                      {stock.name}
                                    </span>
                                  </div>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </FormControl>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-l-none rounded-r-md"
                >
                  <SearchIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default SearchForm; 