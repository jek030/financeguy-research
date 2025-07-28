"use client";

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { TradeRecord, CSVFileData } from '@/lib/types/trading';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { 
  calculateTradeSummary, 
  calculateTickerPerformance, 
  calculateCumulativeGains, 
  calculateTermDistribution 
} from '@/utils/tradeCalculations';

// Components
import CsvUploader from '@/components/ui/(realized-gains)/CsvUploader';
import SummaryCards from '@/components/ui/(realized-gains)/SummaryCards';
import TickerPerformanceChart from '@/components/ui/(realized-gains)/TickerPerformanceChart';
import CumulativeGainsChart from '@/components/ui/(realized-gains)/CumulativeGainsChart';
import TermDistributionChart from '@/components/ui/(realized-gains)/TermDistributionChart';
import TradeTable from '@/components/ui/(realized-gains)/TradeTable';
import TickerDetailModal from '@/components/ui/(realized-gains)/TickerDetailModal';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function RealizedGainsPage() {
  const [csvData, setCsvData] = useState<CSVFileData>({ summary: '', trades: [] });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);

  // Filter trades based on date range
  const filteredTrades = useMemo(() => {
    if (!dateRange) return csvData.trades;
    
    return csvData.trades.filter(trade => {
      try {
        const closeDate = new Date(trade.closedDate);
        return closeDate >= dateRange.from && closeDate <= dateRange.to;
      } catch (error) {
        console.warn('Invalid date format in trade:', trade.closedDate);
        return true; // Include trades with invalid dates
      }
    });
  }, [csvData.trades, dateRange]);

  // Calculate all derived data using filtered trades
  const tradeSummary = useMemo(() => calculateTradeSummary(filteredTrades), [filteredTrades]);
  const tickerPerformance = useMemo(() => calculateTickerPerformance(filteredTrades), [filteredTrades]);
  const cumulativeGains = useMemo(() => calculateCumulativeGains(filteredTrades), [filteredTrades]);
  const termDistribution = useMemo(() => calculateTermDistribution(filteredTrades), [filteredTrades]);

  const handleDataLoaded = (data: CSVFileData) => {
    setCsvData(data);
    // Optional: Save to localStorage for persistence
    localStorage.setItem('realizedTrades', JSON.stringify(data));
    
    // Set initial date range to include all trades
    if (data.trades.length > 0) {
      const dates = data.trades.map(trade => new Date(trade.closedDate)).filter(date => !isNaN(date.getTime()));
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        setDateRange(null); // Start with no filter to show all trades
      }
    }
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTicker(null);
  };

  // Load from localStorage on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('realizedTrades');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved) as CSVFileData;
        // Ensure daysInTrade is calculated for existing data
        const updatedTrades = parsedData.trades.map(trade => {
          if (trade.daysInTrade === undefined) {
            let daysInTrade = 0;
            try {
              const openDate = new Date(trade.openedDate);
              const closeDate = new Date(trade.closedDate);
              if (!isNaN(openDate.getTime()) && !isNaN(closeDate.getTime())) {
                const timeDiff = closeDate.getTime() - openDate.getTime();
                daysInTrade = Math.round(timeDiff / (1000 * 3600 * 24));
              }
            } catch (error) {
              console.warn('Could not calculate days in trade for existing data');
            }
            return { ...trade, daysInTrade };
          }
          return trade;
        });
        setCsvData({ ...parsedData, trades: updatedTrades });
      } catch (error) {
        console.error('Failed to load saved trades:', error);
      }
    }
  }, []);

  const hasData = csvData.trades.length > 0;
  const hasFilteredData = filteredTrades.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-none">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Realized Gains Analysis</h1>
        <p className="text-muted-foreground">
          Upload your trading CSV to analyze your realized gains and trading performance.
        </p>
      </div>

      {/* CSV Upload and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: CSV Upload */}
        <div>
          <CsvUploader onDataLoaded={handleDataLoaded} onSuccess={handleSuccess} hasData={hasData} />
        </div>
        
        {/* Right side: Success Message and File Summary stacked */}
        {(successMessage || (hasData && csvData.summary)) && (
          <div className="space-y-4">
            {/* Success Message */}
            {successMessage && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <div>
                  <h4 className="font-semibold">Upload Successful</h4>
                  <p className="text-sm">{successMessage}</p>
                </div>
              </Alert>
            )}
            
            {/* File Summary */}
            {hasData && csvData.summary && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">File Summary</h3>
                <p className="text-sm text-muted-foreground">{csvData.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Range Filter - only show if we have data */}
      {hasData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Filter by Date Range
              </CardTitle>
              {dateRange && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(null)}
                  className="text-sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filter ({csvData.trades.length - filteredTrades.length} hidden)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatePicker
              fromDate={dateRange?.from}
              toDate={dateRange?.to}
              onRangeChange={setDateRange}
            />
            
            {!hasFilteredData && dateRange && (
              <Alert variant="destructive">
                <div>
                  <h4 className="font-semibold">No trades in selected range</h4>
                  <p className="text-sm">Try adjusting your date range to include more trades.</p>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content - only show if we have filtered data */}
      {hasFilteredData && (
        <>
          {/* Summary Cards */}
          <div className="space-y-4">
            {dateRange && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Date Filter Active:</strong> Showing {filteredTrades.length} of {csvData.trades.length} trades 
                  ({format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')})
                </p>
              </div>
            )}
            <SummaryCards summary={tradeSummary} />
          </div>

          {/* Charts Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold">Performance Analysis</h2>
            
            {/* Cumulative Gains Chart - Full Width */}
            <CumulativeGainsChart data={cumulativeGains} />

            {/* Side by Side Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TickerPerformanceChart 
                data={tickerPerformance} 
                onTickerClick={handleTickerClick}
              />
              <TermDistributionChart data={termDistribution} />
            </div>
          </div>

          {/* Trade Table */}
          <div className="w-full">
            <TradeTable data={filteredTrades} />
          </div>
        </>
      )}

      {/* No Data State */}
      {!hasData && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">No Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file containing your trading data to begin analyzing your realized gains. Log into Charles Schwab, view the Realized Gains tab, and download the Export Details Only file.
            </p>
          </div>
        </div>
      )}

      {/* Ticker Detail Modal */}
      {selectedTicker && (
        <TickerDetailModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          ticker={selectedTicker}
          trades={filteredTrades}
        />
      )}
    </div>
  );
} 