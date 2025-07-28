"use client";

import React, { useState, useMemo } from 'react';
import { TradeRecord, CSVFileData } from '@/lib/types/trading';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle } from 'lucide-react';
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

export default function RealizedGainsPage() {
  const [csvData, setCsvData] = useState<CSVFileData>({ summary: '', trades: [] });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate all derived data
  const tradeSummary = useMemo(() => calculateTradeSummary(csvData.trades), [csvData.trades]);
  const tickerPerformance = useMemo(() => calculateTickerPerformance(csvData.trades), [csvData.trades]);
  const cumulativeGains = useMemo(() => calculateCumulativeGains(csvData.trades), [csvData.trades]);
  const termDistribution = useMemo(() => calculateTermDistribution(csvData.trades), [csvData.trades]);

  const handleDataLoaded = (data: CSVFileData) => {
    setCsvData(data);
    // Optional: Save to localStorage for persistence
    localStorage.setItem('realizedTrades', JSON.stringify(data));
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
        setCsvData(parsedData);
      } catch (error) {
        console.error('Failed to load saved trades:', error);
      }
    }
  }, []);

  const hasData = csvData.trades.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Realized Gains Analysis</h1>
        <p className="text-muted-foreground">
          Upload your trading CSV to analyze your realized gains and trading performance.
        </p>
      </div>

      {/* CSV Upload */}
      <CsvUploader onDataLoaded={handleDataLoaded} onSuccess={handleSuccess} hasData={hasData} />

      {/* Success Message and File Summary */}
      {(successMessage || (hasData && csvData.summary)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Content - only show if we have data */}
      {hasData && (
        <>
          {/* Summary Cards */}
          <SummaryCards summary={tradeSummary} />

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
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Trade Details</h2>
            <TradeTable data={csvData.trades} />
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
          trades={csvData.trades}
        />
      )}
    </div>
  );
} 