"use client"
import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useNewsHistory } from '@/hooks/FMP/useNewsHistory';

interface NewsProps {
  symbol: string;
}

export const News: React.FC<NewsProps> = ({ symbol }) => {
  const [newsStartDate, setNewsStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [newsEndDate, setNewsEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [newsTrigger, setNewsTrigger] = useState(0);
  
  const { data: newsData, isLoading: newsLoading, error: newsError } = useNewsHistory(symbol, newsStartDate, newsEndDate, newsTrigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle>News</CardTitle>
        <div className="flex justify-start">
          <div className="grid grid-cols-2 sm:grid-cols-[200px,200px,auto] gap-2">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={newsStartDate}
                onChange={(e) => setNewsStartDate(e.target.value)}
                max={newsEndDate}
                className="h-9"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground mb-1.5">
                End Date
              </label>
              <Input
                id="endDate"
                type="date"
                value={newsEndDate}
                onChange={(e) => setNewsEndDate(e.target.value)}
                min={newsStartDate}
                max={new Date().toISOString().split('T')[0]}
                className="h-9"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end">
              <Button 
                onClick={() => setNewsTrigger(prev => prev + 1)}
                disabled={newsLoading}
                className="h-9 px-4"
              >
                {newsLoading ? 'Searching...' : 'Search News'}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {newsLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading news...
          </div>
        ) : newsError ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading news: {newsError.message}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {newsData && newsData.length > 0 ? (
                newsData.map((news) => (
                  <div key={`${news.publishedDate}-${news.title}-${news.site}`} className="flex gap-4 p-4 border rounded-lg">
                    {news.image && (
                      <div className="flex-shrink-0">
                        <Image 
                          src={news.image} 
                          alt={news.title} 
                          width={96}
                          height={96}
                          className="object-cover rounded-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        <a 
                          href={news.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {news.title}
                        </a>
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{news.text}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{news.site}</span>
                        <span>•</span>
                        <span>{new Date(news.publishedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500">
                  No news available
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default News; 