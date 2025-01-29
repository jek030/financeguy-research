"use client";
import SectorPerformance from '@/components/ui/(fmp)/SectorPerformance';
import MarketMostActive from '@/components/ui/(fmp)/MarketMostActive';
import MarketGainers from '@/components/ui/(fmp)/MarketGainers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export default function SectorsPage() {
    

  return (
    <div className="flex flex-col">

      <div className="flex justify-center px-4">
        <Tabs defaultValue="sectors" className="w-full max-w-4xl">
          <div className="flex justify-center mb-4">
            <TabsList className="grid w-[500px] grid-cols-3">
              <TabsTrigger value="sectors">Sectors</TabsTrigger>
              <TabsTrigger value="active">Most Active</TabsTrigger>
              <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="sectors">
            <SectorPerformance/>
          </TabsContent>
          <TabsContent value="active">
            <MarketMostActive/>
          </TabsContent>
          <TabsContent value="gainers">
            <MarketGainers />
          </TabsContent> 
          
        </Tabs>
      </div>
    </div>
  );
}