"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { TransactionFile } from '@/lib/types/transactions';
import {
  calculateTransactionSummary,
  calculateSymbolSummaries,
  calculateActionSummaries,
  calculateDailyVolume,
  calculateOpenPositions,
} from '@/utils/transactionCalculations';

// Components
import JsonUploader from '@/components/ui/(transactions)/JsonUploader';
import TransactionSummaryCards from '@/components/ui/(transactions)/TransactionSummaryCards';
import TransactionTable from '@/components/ui/(transactions)/TransactionTable';
import SymbolSummaryTable from '@/components/ui/(transactions)/SymbolSummaryTable';
import ActionSummaryTable from '@/components/ui/(transactions)/ActionSummaryTable';
import TransactionCharts from '@/components/ui/(transactions)/TransactionCharts';
import OpenPositionsTable from '@/components/ui/(transactions)/OpenPositionsTable';

export default function TransactionsPage() {
  const [transactionData, setTransactionData] = useState<TransactionFile | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('transactions-data');
        if (stored) {
          const parsed = JSON.parse(stored) as TransactionFile;
          setTransactionData(parsed);
        }
      } catch (error) {
        console.warn('Could not load from localStorage:', error);
      }
    }
  }, []);

  // Calculate derived data
  const summary = useMemo(() => {
    if (!transactionData) return null;
    return calculateTransactionSummary(transactionData.transactions);
  }, [transactionData]);

  const symbolSummaries = useMemo(() => {
    if (!transactionData) return [];
    return calculateSymbolSummaries(transactionData.transactions);
  }, [transactionData]);

  const actionSummaries = useMemo(() => {
    if (!transactionData) return [];
    return calculateActionSummaries(transactionData.transactions);
  }, [transactionData]);

  const dailyVolume = useMemo(() => {
    if (!transactionData) return [];
    return calculateDailyVolume(transactionData.transactions);
  }, [transactionData]);

  const openPositions = useMemo(() => {
    if (!transactionData) return [];
    return calculateOpenPositions(transactionData.transactions);
  }, [transactionData]);

  // Filter transactions based on symbol or action selection
  const filteredTransactions = useMemo(() => {
    if (!transactionData) return [];
    let filtered = transactionData.transactions;
    
    if (symbolFilter) {
      filtered = filtered.filter((t) => t.symbol === symbolFilter);
    }
    
    if (actionFilter) {
      filtered = filtered.filter((t) => t.action === actionFilter);
    }
    
    return filtered;
  }, [transactionData, symbolFilter, actionFilter]);

  const handleSymbolClick = (symbol: string) => {
    setSymbolFilter(symbol);
    setActionFilter(null);
    setActiveTab('all');
  };

  const handleActionClick = (action: string) => {
    setActionFilter(action);
    setSymbolFilter(null);
    setActiveTab('all');
  };

  const clearFilters = () => {
    setSymbolFilter(null);
    setActionFilter(null);
  };

  const handleDataLoaded = (data: TransactionFile) => {
    setTransactionData(data);
    clearFilters();
  };

  return (
    <div className="w-full p-4 min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your brokerage transactions, view summaries by symbol and action type.
          </p>
        </div>

        {/* Upload Section */}
        <JsonUploader onDataLoaded={handleDataLoaded} className="max-w-xl" />

        {/* Content - Only show when data is loaded */}
        {transactionData && summary && (
          <>
            {/* Summary Cards */}
            <TransactionSummaryCards summary={summary} />

            {/* Open Positions Section */}
            <OpenPositionsTable 
              data={openPositions} 
              onSymbolClick={handleSymbolClick}
            />

            {/* Filter Indicator */}
            {(symbolFilter || actionFilter) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm">
                  Filtering by: 
                  {symbolFilter && (
                    <span className="ml-1 font-semibold text-primary">{symbolFilter}</span>
                  )}
                  {actionFilter && (
                    <span className="ml-1 font-semibold text-primary">{actionFilter}</span>
                  )}
                </span>
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Charts */}
            <TransactionCharts dailyVolume={dailyVolume} actionSummary={actionSummaries} />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all" className="text-xs">
                  All Transactions
                </TabsTrigger>
                <TabsTrigger value="symbols" className="text-xs">
                  By Symbol
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  By Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <TransactionTable data={filteredTransactions} />
              </TabsContent>

              <TabsContent value="symbols" className="space-y-4">
                <SymbolSummaryTable 
                  data={symbolSummaries} 
                  onSymbolClick={handleSymbolClick}
                />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <ActionSummaryTable 
                  data={actionSummaries}
                  onActionClick={handleActionClick}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty State */}
        {!transactionData && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <p className="text-lg text-muted-foreground">No transaction data loaded</p>
              <p className="text-sm text-muted-foreground">
                Upload a JSON file from your brokerage to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
