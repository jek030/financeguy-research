'use client';

import { useSupabaseSectors } from '@/hooks/useSupabaseSectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle } from 'lucide-react';
import { SectorReturnChart } from './SectorReturnChart';

export default function SectorReturns() {
  const { data, isLoading, error } = useSupabaseSectors();
  const sectorData = data?.sectors;
  const dateRanges = data?.dateRanges;

  if (isLoading) {
    return (
      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {['1 WEEK PERFORMANCE', '1 MONTH PERFORMANCE', '3 MONTH PERFORMANCE', '6 MONTH PERFORMANCE'].map((title) => (
          <Card key={title} className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-foreground/90">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted/30 rounded-lg animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
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
      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
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
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">1 Week Performance</CardTitle>
          {dateRanges && (
            <p className="text-sm text-muted-foreground">
              {formatDate(dateRanges.oneWeekDate)} to {formatDate(dateRanges.latestDate)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SectorReturnChart 
            title="" 
            data={weekData} 
          />
        </CardContent>
      </Card>

      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">1 Month Performance</CardTitle>
          {dateRanges && (
            <p className="text-sm text-muted-foreground">
              {formatDate(dateRanges.oneMonthDate)} to {formatDate(dateRanges.latestDate)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SectorReturnChart 
            title="" 
            data={oneMonthData} 
          />
        </CardContent>
      </Card>

      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">3 Month Performance</CardTitle>
          {dateRanges && (
            <p className="text-sm text-muted-foreground">
              {formatDate(dateRanges.threeMonthDate)} to {formatDate(dateRanges.latestDate)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SectorReturnChart 
            title="" 
            data={threeMonthData} 
          />
        </CardContent>
      </Card>

      <Card className="w-full border border-border/40 bg-card/60 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">6 Month Performance</CardTitle>
          {dateRanges && (
            <p className="text-sm text-muted-foreground">
              {formatDate(dateRanges.halfYearDate)} to {formatDate(dateRanges.latestDate)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <SectorReturnChart 
            title="" 
            data={halfYearData} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 