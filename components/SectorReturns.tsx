'use client';

import { useSupabaseSectors } from '@/hooks/useSupabaseSectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle } from 'lucide-react';

interface SectorReturnChartProps {
  title: string;
  subtitle?: string;
  data: Array<{
    name: string;
    symbol: string;
    performance: number;
  }>;
}

export default function SectorReturns() {
  const { data, isLoading, error } = useSupabaseSectors();
  const sectorData = data?.sectors;
  const dateRanges = data?.dateRanges;

  if (isLoading) {
    return (
      <Card className="border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {['1 WEEK PERFORMANCE', '1 MONTH PERFORMANCE', '3 MONTH PERFORMANCE', '6 MONTH PERFORMANCE'].map((title) => (
              <div key={title} className="space-y-2">
                <h3 className="text-sm font-medium text-center text-muted-foreground">{title}</h3>
                <div className="h-40 bg-muted/30 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-1">Error Loading Data</h3>
            <p className="text-muted-foreground">{error.message || 'Failed to load sector performance data'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if data is empty or not available
  if (!sectorData || sectorData.length === 0) {
    return (
      <Card className="border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium mb-1">No Data Available</h3>
            <p className="text-muted-foreground">Could not retrieve sector data from the database.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format date string for better display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // Parse the date, keeping the original date (don't adjust for timezone)
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC' // Use UTC to avoid timezone adjustments
    });
  };

  // Prepare data for each time period
  const weekData = sectorData
    .map(sector => ({
      name: sector.name,
      symbol: sector.symbol,
      performance: sector.weekPerformance
    }))
    .sort((a, b) => b.performance - a.performance);

  const oneMonthData = sectorData
    .map(sector => ({
      name: sector.name,
      symbol: sector.symbol,
      performance: sector.oneMonthPerformance
    }))
    .sort((a, b) => b.performance - a.performance);

  const threeMonthData = sectorData
    .map(sector => ({
      name: sector.name,
      symbol: sector.symbol,
      performance: sector.threeMonthPerformance
    }))
    .sort((a, b) => b.performance - a.performance);

  const halfYearData = sectorData
    .map(sector => ({
      name: sector.name,
      symbol: sector.symbol,
      performance: sector.halfYearPerformance
    }))
    .sort((a, b) => b.performance - a.performance);

  return (
    <Card className="border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium text-foreground/90">Sector Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <SectorReturnChart 
            title="1 WEEK PERFORMANCE" 
            subtitle={dateRanges ? `${formatDate(dateRanges.oneWeekDate)} to ${formatDate(dateRanges.latestDate)}` : undefined}
            data={weekData} 
          />
          <SectorReturnChart 
            title="1 MONTH PERFORMANCE" 
            subtitle={dateRanges ? `${formatDate(dateRanges.oneMonthDate)} to ${formatDate(dateRanges.latestDate)}` : undefined}
            data={oneMonthData} 
          />
          <SectorReturnChart 
            title="3 MONTH PERFORMANCE" 
            subtitle={dateRanges ? `${formatDate(dateRanges.threeMonthDate)} to ${formatDate(dateRanges.latestDate)}` : undefined}
            data={threeMonthData} 
          />
          <SectorReturnChart 
            title="HALF YEAR PERFORMANCE" 
            subtitle={dateRanges ? `${formatDate(dateRanges.halfYearDate)} to ${formatDate(dateRanges.latestDate)}` : undefined}
            data={halfYearData} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SectorReturnChart({ title, subtitle, data }: SectorReturnChartProps) {
  // Find maximum absolute value for scaling
  const maxAbsValue = Math.max(...data.map(item => Math.abs(item.performance)), 1);
  
  // Format number with percentage
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };
  
  return (
    <div className="space-y-2">
      <div className="text-center">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center text-xs">
            <div className="w-40 text-right pr-2 text-muted-foreground">
              {item.name} ({item.symbol})
            </div>
            <div className="flex-1 flex items-center">
              {item.performance < 0 ? (
                // Negative performance bar (red)
                <div className="flex-1 flex items-center">
                  <div 
                    className="h-5 bg-red-500/90 rounded min-w-[8px]"
                    style={{ 
                      width: `${Math.min(Math.abs(item.performance) / maxAbsValue * 100, 100)}%`,
                      maxWidth: '50%'
                    }}
                  ></div>
                  <span className="text-muted-foreground ml-2 flex-shrink-0">{formatPercent(item.performance)}</span>
                </div>
              ) : (
                // Positive performance bar (green)
                <div className="flex-1 flex items-center">
                  <div 
                    className="h-5 bg-green-500/90 rounded min-w-[8px]"
                    style={{ 
                      width: `${Math.min(Math.abs(item.performance) / maxAbsValue * 100, 100)}%`,
                      maxWidth: '50%'
                    }}
                  ></div>
                  <span className="text-muted-foreground ml-2 flex-shrink-0">{formatPercent(item.performance)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 