"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useInsiderTrading } from '@/hooks/FMP/useInsiderTrading';

interface InsiderActivityProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

export const InsiderActivity: React.FC<InsiderActivityProps> = ({ symbol }) => {
  const { data: insiderTrades, isLoading: insiderLoading, error: insiderError } = useInsiderTrading(symbol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Insider Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {insiderLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading insider trading data...
          </div>
        ) : insiderError ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading insider trading data: {insiderError.message}
          </div>
        ) : (
      <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-20">
                <TableRow>
                <TableHead >Trans. Type</TableHead>
                  <TableHead >Filing Date</TableHead>
                  <TableHead >Trans. Date</TableHead>
                  <TableHead >Insider Name</TableHead>           
                  <TableHead >Price</TableHead>
                  <TableHead >Shares</TableHead>
                  <TableHead >Value</TableHead>
                  <TableHead >Shares Total</TableHead>
                  <TableHead >Form</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {Array.isArray(insiderTrades) && insiderTrades.length > 0 ? (
                    insiderTrades.map((trade) => (
                      <TableRow key={`${trade.filingDate}-${trade.reportingName}-${trade.transactionDate}-${trade.transactionType}-${trade.securitiesTransacted}-${trade.price}-${trade.securitiesOwned}`}>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            trade.acquistionOrDisposition === 'A' 
                              ? 'bg-positive/10 text-positive' 
                              : 'bg-negative/10 text-negative'
                          }`}>
                            {trade.transactionType} ({trade.acquistionOrDisposition === 'A' ? 'Buy' : 'Sell'})
                          </span>
                        </TableCell>
                        <TableCell>{new Date(trade.filingDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(trade.transactionDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <p >{trade.reportingName}</p>
                            <p className="text-sm text-gray-500">{trade.typeOfOwner}</p>
                          </div>
                        </TableCell>                        
                        <TableCell>{trade.price ? `$${trade.price.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell>{formatLargeNumber(trade.securitiesTransacted)}</TableCell>
                        <TableCell>${formatLargeNumber(trade.securitiesTransacted * (trade.price || 0))}</TableCell>
                        <TableCell>{formatLargeNumber(trade.securitiesOwned)}</TableCell>
                        <TableCell>{trade.formType || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">No insider transactions found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
            </Table>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsiderActivity; 