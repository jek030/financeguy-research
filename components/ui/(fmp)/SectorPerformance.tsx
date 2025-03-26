import { useSectorPerformance } from '@/hooks/FMP/useSectorPerformance';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { Button } from "@/components/ui/Button";
import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';
interface SectorPerformance {
  sector: string;
  changesPercentage: string;
}


export default function SectorPerformance() {
  const { data = [], isLoading, error } = useSectorPerformance();
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
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('sector')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Sector
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => requestSort('changesPercentage')}
                    className="hover:bg-transparent pl-0 pr-1"
                  >
                    Performance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index} className="group">
                  <TableCell>
                    <Link
                      href={`/scans/sectors/${encodeURIComponent(item.sector)}`}
                      className="hover:underline text-blue-600 dark:text-blue-400">
                        {item.sector}
                    </Link>
                  </TableCell>
                  <TableCell className={parseFloat(item.changesPercentage) >= 0 ? "text-positive" : "text-negative"}>
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