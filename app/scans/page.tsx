"use client";
import SectorPerformance from '@/components/ui/(fmp)/SectorPerformance';
import MarketMostActive from '@/components/ui/(fmp)/MarketMostActive';
import MarketGainers from '@/components/ui/(fmp)/MarketGainers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export default function SectorsPage() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="sectors" className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full max-w-[500px] grid-cols-3">
                <TabsTrigger value="sectors">Sectors</TabsTrigger>
                <TabsTrigger value="active">Most Active</TabsTrigger>
                <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="sectors" className="mt-0">
              <SectorPerformance/>
            </TabsContent>
            <TabsContent value="active" className="mt-0">
              <MarketMostActive/>
            </TabsContent>
            <TabsContent value="gainers" className="mt-0">
              <MarketGainers />
            </TabsContent>         
          </Tabs>
        </div>
      </main>
    </div>
  );
}