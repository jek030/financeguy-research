"use client";

import React, { useState, useMemo } from 'react';
import { TradeRecord, CSVFileData } from '@/lib/types/trading';
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

export default function RealizedGainsPage() {
  const [csvData, setCsvData] = useState<CSVFileData>({ summary: '', trades: [] });

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
      <CsvUploader onDataLoaded={handleDataLoaded} />

      {/* Content - only show if we have data */}
      {hasData && (
        <>
          {/* File Summary */}
          {csvData.summary && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">File Summary</h3>
              <p className="text-sm text-muted-foreground">{csvData.summary}</p>
            </div>
          )}
          
          {/* Summary Cards */}
          <SummaryCards summary={tradeSummary} />

          {/* Charts Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold">Performance Analysis</h2>
            
            {/* Cumulative Gains Chart - Full Width */}
            <CumulativeGainsChart data={cumulativeGains} />

            {/* Side by Side Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TickerPerformanceChart data={tickerPerformance} />
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
              Upload a CSV file containing your trading data to begin analyzing your realized gains.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Your CSV should have the following format:</p>
              <ul className="list-disc list-inside text-left space-y-1">
                <li>Row 1: Summary text describing the report</li>
                <li>Row 2: Column headers</li>
                <li>Row 3+: Trade data with Symbol, Opened Date, Closed Date, Quantity, Proceeds, Cost Basis, Gain/Loss, Term, etc.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 