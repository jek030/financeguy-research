"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
import { DatePicker } from '@/components/ui/date-picker';
import { addYears, format } from 'date-fns';
import { useDailyPrices } from '@/hooks/FMP/useDailyPrices';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PriceHistoryComponentProps {
  symbol: string;
}

type SortDirection = 'asc' | 'desc';
type SortField = 'date' | 'changePercent';

const PriceHistoryComponent: React.FC<PriceHistoryComponentProps> = ({ symbol }) => {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(addYears(today, -2));
  const [toDate, setToDate] = useState<Date>(today);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: priceHistory, isLoading, error } = useDailyPrices({
    symbol,
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  });

  // Helper function to format dates correctly
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'MM/dd/yyyy');
  };

  // Helper function to handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort the price history data
  const sortedPriceHistory = React.useMemo(() => {
    if (!priceHistory) return [];
    
    return [...priceHistory].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'changePercent') {
        const changePercentA = ((a.close - a.open) / a.open) * 100;
        const changePercentB = ((b.close - b.open) / b.open) * 100;
        return sortDirection === 'asc' ? changePercentA - changePercentB : changePercentB - changePercentA;
      }
      return 0;
    });
  }, [priceHistory, sortField, sortDirection]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price History</CardTitle>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto">
            <DatePicker
              fromDate={fromDate}
              toDate={toDate}
              onRangeChange={({ from, to }) => {
                setFromDate(from);
                setToDate(to);
              }}
              label="Select date range"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading price history...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading price history: {error.message}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('date')}
                      className="h-8 flex items-center gap-1"
                    >
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">High</TableHead>
                  <TableHead className="text-right">Low</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead className="text-right">Adj Close</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Day Change</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('changePercent')} 
                      className="h-8 flex items-center gap-1 ml-auto"
                    >
                      Day Change %
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(sortedPriceHistory) && sortedPriceHistory.length > 0 ? (
                  sortedPriceHistory.map((price) => {
                    const change = price.close - price.open;
                    const changePercent = (change / price.open) * 100;
                    
                    return (
                      <TableRow key={price.date}>
                        <TableCell>{formatDate(price.date)}</TableCell>
                        <TableCell className="text-right">${price.open.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${price.high.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${price.low.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${price.close.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${price.adjClose.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{price.volume.toLocaleString()}</TableCell>
                        <TableCell className={`text-right ${change >= 0 ? 'text-positive' : 'text-negative'}`}>
                          ${Math.abs(change).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right ${changePercent >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {changePercent >= 0 ? '+' : '-'}{Math.abs(changePercent).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No price history available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceHistoryComponent; 