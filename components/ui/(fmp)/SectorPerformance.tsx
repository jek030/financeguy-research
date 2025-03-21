import { useSectorPerformance } from '@/hooks/FMP/useSectorPerformance';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface SectorPerformance {
  sector: string;
  changesPercentage: string;
}


export default function SectorPerformance() {
  const { data = [], isLoading, error } = useSectorPerformance();
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SectorPerformance;
    direction: 'asc' | 'desc';
  } | null>(null);

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-center text-muted-foreground">Loading sector data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
        <CardContent className="pt-6 sm:px-6 px-3">
          <div className="text-destructive">{error?.message}</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;

    let comparison = 0;
    if (sortConfig.key === 'sector') {
      comparison = a.sector.localeCompare(b.sector);
    } else {
      comparison = parseFloat(a.changesPercentage) - parseFloat(b.changesPercentage);
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const requestSort = (key: keyof SectorPerformance) => {
    setSortConfig((currentSort) => {
      if (!currentSort || currentSort.key !== key) {
        return { key, direction: 'asc' };
      }
      if (currentSort.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };
  

  const handleSectorClick = (sector: string) => {
    router.push(`/scans/sectors/${encodeURIComponent(sector)}`);
  };

  return (
    <Card className="border border-border/50 shadow-sm w-full max-w-6xl mx-auto bg-card sm:rounded-lg rounded-none sm:mx-auto mx-0 sm:border border-x-0">
      <CardHeader className="pb-2 space-y-2 sm:px-6 px-3 pt-4 sm:pt-6">
        <CardTitle className="text-xl font-semibold">Market Sectors</CardTitle>
        <CardDescription>
          Daily performance of major market sectors. Click on a sector to view stocks in that sector.
          <br /><br />
          {/*https://financialmodelingprep.com/api/v3/sector-performance*/}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 sm:px-6 px-2">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <Table className="w-full text-sm sm:text-base">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[160px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('sector')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Sector
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] sm:p-4 py-2 px-1">
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('changesPercentage')}
                    className="hover:bg-transparent pl-0 pr-1 font-semibold sm:text-base text-sm"
                  >
                    Performance
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow 
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSectorClick(item.sector)}
                >
                  <TableCell className="font-medium sm:p-4 py-2 px-1 text-sm sm:text-base text-blue-500 hover:underline">{item.sector}</TableCell>
                  <TableCell className={cn(
                    "font-medium sm:p-4 py-2 px-1 text-sm sm:text-base",
                    parseFloat(item.changesPercentage) >= 0 ? "text-positive" : "text-negative"
                  )}>
                    {parseFloat(item.changesPercentage).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 