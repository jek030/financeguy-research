"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
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
          <div className="relative border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Filing Date</TableHead>
                  <TableHead className="w-[100px]">Trans. Date</TableHead>
                  <TableHead className="w-[180px]">Insider Name</TableHead>
                  <TableHead className="w-[120px]">Trans. Type</TableHead>
                  <TableHead className="w-[80px] text-right">Price</TableHead>
                  <TableHead className="w-[100px] text-right">Shares</TableHead>
                  <TableHead className="w-[100px] text-right">Value</TableHead>
                  <TableHead className="w-[120px] text-right">Shares Total</TableHead>
                  <TableHead className="w-[80px]">Form</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableBody>
                  {Array.isArray(insiderTrades) && insiderTrades.length > 0 ? (
                    insiderTrades.map((trade) => (
                      <TableRow key={`${trade.filingDate}-${trade.reportingName}-${trade.transactionDate}-${trade.transactionType}-${trade.securitiesTransacted}-${trade.price}-${trade.securitiesOwned}`}>
                        <TableCell className="w-[100px]">{new Date(trade.filingDate).toLocaleDateString()}</TableCell>
                        <TableCell className="w-[100px]">{new Date(trade.transactionDate).toLocaleDateString()}</TableCell>
                        <TableCell className="w-[180px]">
                          <div>
                            <p className="font-medium">{trade.reportingName}</p>
                            <p className="text-sm text-gray-500">{trade.typeOfOwner}</p>
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            trade.acquistionOrDisposition === 'A' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.transactionType} ({trade.acquistionOrDisposition === 'A' ? 'Buy' : 'Sell'})
                          </span>
                        </TableCell>
                        <TableCell className="w-[80px] text-right">{trade.price ? `$${trade.price.toFixed(2)}` : 'N/A'}</TableCell>
                        <TableCell className="w-[100px] text-right">{formatLargeNumber(trade.securitiesTransacted)}</TableCell>
                        <TableCell className="w-[100px] text-right">${formatLargeNumber(trade.securitiesTransacted * (trade.price || 0))}</TableCell>
                        <TableCell className="w-[120px] text-right">{formatLargeNumber(trade.securitiesOwned)}</TableCell>
                        <TableCell className="w-[80px]">{trade.formType || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">No insider transactions found</TableCell>
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

export default InsiderActivity; 