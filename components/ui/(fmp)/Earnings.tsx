"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useEarnings } from '@/hooks/FMP/useEarnings';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

interface IncomeStatement {
  date: string;
  fillingDate: string;
  revenue: number;
  netIncome: number;
  eps: number;
  period?: string;
}

interface EarningsProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

function calculatePercentageChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const AnnualTable: React.FC<{ data: IncomeStatement[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-20">
        <TableRow>
          <TableHead>Filing Date</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Revenue % Chg</TableHead>
          <TableHead>Net Income</TableHead>
          <TableHead>EPS</TableHead>
          <TableHead>EPS % Chg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.isArray(data) && data.length > 0 ? (
          data.map((statement, index) => {
            const previousRevenue = index < data.length - 1 ? data[index + 1].revenue : null;
            const previousEps = index < data.length - 1 ? data[index + 1].eps : null;
            const revenueChange = previousRevenue ? calculatePercentageChange(statement.revenue, previousRevenue) : 0;
            const epsChange = previousEps ? calculatePercentageChange(statement.eps, previousEps) : 0;
            
            return (
              <TableRow key={statement.date}>
                <TableCell>
                  {format(new Date(statement.fillingDate), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell>
                  {format(new Date(statement.date), 'MM/dd/yyyy')}
                </TableCell>
                <TableCell>
                  {formatLargeNumber(statement.revenue)}
                </TableCell>
                <TableCell className={cn(
                  "",
                  revenueChange > 0 ? "text-positive" : revenueChange < 0 ? "text-negative" : ""
                )}>
                  {revenueChange ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(2)}%` : 'N/A'}
                </TableCell>
                <TableCell>
                  {formatLargeNumber(statement.netIncome)}
                </TableCell>
                <TableCell>
                  ${statement.eps.toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "",
                  epsChange > 0 ? "text-positive" : epsChange < 0 ? "text-negative" : ""
                )}>
                  {epsChange ? `${epsChange > 0 ? '+' : ''}${epsChange.toFixed(2)}%` : 'N/A'}
                </TableCell>
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center">No data available</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    </div>
    </div>
);

const QuarterlyTable: React.FC<{ data: IncomeStatement[] | undefined }> = ({ data = [] }) => {
  // Helper function to find the same quarter from previous year
  const findPreviousYearQuarter = (currentStatement: IncomeStatement, allStatements: IncomeStatement[]) => {
    const currentDate = new Date(currentStatement.date);
    const currentYear = currentDate.getFullYear();
    const currentPeriod = currentStatement.period;

    return allStatements.find(statement => {
      const statementDate = new Date(statement.date);
      return statementDate.getFullYear() === currentYear - 1 && statement.period === currentPeriod;
    });
  };

  return (
    <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-20">
          <TableRow>
            <TableHead>Filing Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Revenue % YoY</TableHead>
            <TableHead>Net Income</TableHead>
            <TableHead>EPS</TableHead>
            <TableHead>EPS % YoY</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(data) && data.length > 0 ? (
            data.map((statement) => {
              const previousYearQuarter = findPreviousYearQuarter(statement, data);
              const revenueChange = previousYearQuarter 
                ? calculatePercentageChange(statement.revenue, previousYearQuarter.revenue) 
                : 0;
              const epsChange = previousYearQuarter 
                ? calculatePercentageChange(statement.eps, previousYearQuarter.eps) 
                : 0;
              
              return (
                <TableRow key={statement.date}>
                  <TableCell>
                    {format(new Date(statement.fillingDate), 'MM/dd/yyyy')}
                  </TableCell>
                  <TableCell>
                    {statement.period}
                  </TableCell>
                  <TableCell>
                    {format(new Date(statement.date), 'MM/dd/yyyy')}
                  </TableCell>
                  <TableCell>
                    {formatLargeNumber(statement.revenue)}
                  </TableCell>
                  <TableCell className={cn(
                    "",
                    revenueChange > 0 ? "text-positive" : revenueChange < 0 ? "text-negative" : ""
                  )}>
                    {previousYearQuarter ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(2)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatLargeNumber(statement.netIncome)}
                  </TableCell>
                  <TableCell>
                    ${statement.eps.toFixed(2)}
                  </TableCell>
                  <TableCell className={cn(
                    "",
                    epsChange > 0 ? "text-positive" : epsChange < 0 ? "text-negative" : ""
                  )}>
                    {previousYearQuarter ? `${epsChange > 0 ? '+' : ''}${epsChange.toFixed(2)}%` : 'N/A'}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">No data available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>  
    </div>
  );
};

export const Earnings: React.FC<EarningsProps> = ({ symbol }) => {
  const { annualData, quarterlyData, isLoading, error } = useEarnings(symbol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statements</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading income statement data...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading income statement data: {error.message}
          </div>
        ) : (
          <Tabs defaultValue="annual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="annual">Annual</TabsTrigger>
              <TabsTrigger value="quarter">Quarterly</TabsTrigger>
            </TabsList>
            <TabsContent value="annual">
              <AnnualTable data={annualData} />
            </TabsContent>
            <TabsContent value="quarter">
              <QuarterlyTable data={quarterlyData} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default Earnings; 