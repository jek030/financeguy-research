"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { TransactionFile } from '@/lib/types/transactions';
import {
  calculateTransactionSummary,
  calculateSymbolSummaries,
  calculateActionSummaries,
} from '@/utils/transactionCalculations';

import JsonUploader from '@/components/ui/(transactions)/JsonUploader';
import TransactionSummaryCards from '@/components/ui/(transactions)/TransactionSummaryCards';
import TransactionTable from '@/components/ui/(transactions)/TransactionTable';
import SymbolSummaryTable from '@/components/ui/(transactions)/SymbolSummaryTable';
import ActionSummaryTable from '@/components/ui/(transactions)/ActionSummaryTable';

export default function TransactionsPage() {
  const [transactionData, setTransactionData] = useState<TransactionFile | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('transactions-data');
        if (stored) {
          setTransactionData(JSON.parse(stored) as TransactionFile);
        }
      } catch (error) {
        console.warn('Could not load from localStorage:', error);
      }
    }
  }, []);

  const summary = useMemo(
    () => (transactionData ? calculateTransactionSummary(transactionData.transactions) : null),
    [transactionData]
  );

  const symbolSummaries = useMemo(
    () => (transactionData ? calculateSymbolSummaries(transactionData.transactions) : []),
    [transactionData]
  );

  const actionSummaries = useMemo(
    () => (transactionData ? calculateActionSummaries(transactionData.transactions) : []),
    [transactionData]
  );

  const handleSymbolClick = (symbol: string) => {
    setSymbolFilter(symbol);
    setActiveTab('all');
  };

  const handleDataLoaded = (data: TransactionFile) => {
    setTransactionData(data);
    setSymbolFilter(null);
  };

  const handleDataCleared = () => {
    setTransactionData(null);
    setSymbolFilter(null);
  };

  const tabTriggerClass =
    "h-7 rounded-md text-[11px] text-indigo-200/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white";

  const tabTriggerHoverClass =
    "data-[state=inactive]:hover:bg-[#1b1f3b] data-[state=inactive]:hover:text-slate-100";

  return (
    <div className="dark min-h-screen w-full bg-[#0b0e1f] p-4 font-sans text-slate-100">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-[#1e2248] via-[#1b1f3b] to-[#14172c] px-6 py-6 shadow-xl shadow-violet-950/20">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300/70">
                Brokerage Activity
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-50">Transactions</h1>
              </div>
            </div>
            <JsonUploader
              onDataLoaded={handleDataLoaded}
              onDataCleared={handleDataCleared}
              className="w-full shrink-0 lg:w-auto lg:max-w-sm"
            />
          </div>
        </div>

        {transactionData && summary && (
          <>
            <TransactionSummaryCards summary={summary} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid h-9 w-full max-w-lg grid-cols-3 rounded-lg border border-indigo-500/15 bg-[#14172c] p-1">
                <TabsTrigger value="all" className={tabTriggerClass}>
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="symbols" className={`${tabTriggerClass} ${tabTriggerHoverClass}`}>
                  By Symbol
                </TabsTrigger>
                <TabsTrigger value="actions" className={`${tabTriggerClass} ${tabTriggerHoverClass}`}>
                  By Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <TransactionTable
                  data={transactionData.transactions}
                  symbolFilter={symbolFilter}
                  onSymbolFilterChange={setSymbolFilter}
                />
              </TabsContent>

              <TabsContent value="symbols" className="space-y-4">
                <SymbolSummaryTable data={symbolSummaries} onSymbolClick={handleSymbolClick} />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <ActionSummaryTable data={actionSummaries} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {!transactionData && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-indigo-500/20 py-24">
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-200">No transaction data loaded</p>
              <p className="text-xs text-slate-400">
                Upload a JSON file from your brokerage to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
