"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
import { DatePicker } from '@/components/ui/date-picker';
import { addYears, format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PriceHistoryComponentProps {
  symbol: string;
  priceHistory?: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
  }[];
}

type SortDirection = 'asc' | 'desc';
type SortField = 'date' | 'changePercent';

const PriceHistoryComponent: React.FC<PriceHistoryComponentProps> = ({ priceHistory = [] }) => {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(addYears(today, -2));
  const [toDate, setToDate] = useState<Date>(today);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
        {!priceHistory ? (
          <div className="flex items-center justify-center p-4">
            Loading price history...
          </div>
        ) : priceHistory.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            No price history available
          </div>
        ) : (
          <div className="relative border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[120px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('date')}
                      className="h-8 flex items-center gap-1 text-xs"
                    >
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Open</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">High</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Low</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Close</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Adj Close</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Volume</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Day Change</TableHead>
                  <TableHead className="text-xs text-right w-[120px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('changePercent')} 
                      className="h-8 w-full flex items-center justify-end gap-1 text-xs"
                    >
                      Day Change %
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableBody>
                  {Array.isArray(sortedPriceHistory) && sortedPriceHistory.length > 0 ? (
                    sortedPriceHistory.map((price) => {
                      const change = price.close - price.open;
                      const changePercent = (change / price.open) * 100;
                      
                      return (
                        <TableRow key={price.date}>
                          <TableCell className="text-xs w-[110px]">{formatDate(price.date)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">${price.open.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">${price.high.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">${price.low.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">${price.close.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">${price.adjClose.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right w-[100px]">{price.volume.toLocaleString()}</TableCell>
                          <TableCell className={`text-xs text-right w-[100px] ${change >= 0 ? 'text-positive' : 'text-negative'}`}>
                            ${Math.abs(change).toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-xs text-right w-[120px] ${changePercent >= 0 ? 'text-positive' : 'text-negative'}`}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceHistoryComponent; 