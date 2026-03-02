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
    <div className="min-h-screen w-full bg-background p-4 font-mono">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="rounded-md border border-border bg-background/95 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Market Data Terminal
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
              <p className="text-xs text-muted-foreground">
                High-contrast execution monitor for positions, fills, and symbol-level activity.
              </p>
            </div>
            <JsonUploader onDataLoaded={handleDataLoaded} className="w-full max-w-xl" />
          </div>
        </div>

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
              <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 p-3">
                <span className="text-xs text-primary">
                  Filter:
                  {symbolFilter && (
                    <span className="ml-2 font-semibold">{symbolFilter}</span>
                  )}
                  {actionFilter && (
                    <span className="ml-2 font-semibold">{actionFilter}</span>
                  )}
                </span>
                <button
                  onClick={clearFilters}
                  className="ml-auto text-[11px] text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Charts */}
            <TransactionCharts dailyVolume={dailyVolume} actionSummary={actionSummaries} />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid h-9 w-full max-w-lg grid-cols-3 rounded-md border border-border bg-muted/30 p-1">
                <TabsTrigger value="all" className="h-7 rounded-sm text-[11px] data-[state=active]:bg-background">
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="symbols" className="h-7 rounded-sm text-[11px] data-[state=active]:bg-background">
                  By Symbol
                </TabsTrigger>
                <TabsTrigger value="actions" className="h-7 rounded-sm text-[11px] data-[state=active]:bg-background">
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
          <div className="flex items-center justify-center rounded-md border border-dashed border-border py-24">
            <div className="space-y-3 text-center">
              <p className="text-sm text-foreground">No transaction data loaded</p>
              <p className="text-xs text-muted-foreground">
                Upload a JSON file from your brokerage to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
