"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, TrendingUp, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  symbol?: string;
  onRetry?: () => void;
  showSuggestions?: boolean;
  className?: string;
}

export function ErrorDisplay({
  title = "Unable to Load Data",
  message = "We're having trouble fetching the latest information. This could be due to network issues or the symbol may not be available.",
  symbol,
  onRetry,
  showSuggestions = true,
  className
}: ErrorDisplayProps) {
  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header Section - matches CompanyOutlookCard styling */}
      <div className="bg-secondary/60">
        <div className="px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
              {symbol && (
                <div className="text-lg text-muted-foreground">
                  Symbol: <span className="font-mono font-medium">{symbol.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-card">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Error Alert */}
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              {message}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleRefresh}
              className="flex items-center gap-2"
              size="lg"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              size="lg"
            >
              Go Back
            </Button>
          </div>

          {/* Suggestions Card */}
          {showSuggestions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Check the Symbol</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Verify the ticker symbol is correct</li>
                      <li>• Try searching for the company name</li>
                      <li>• Check if it's a valid stock or crypto symbol</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Popular Symbols</h4>
                    <div className="flex flex-wrap gap-2">
                      {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'AMZN'].map((popularSymbol) => (
                        <Button
                          key={popularSymbol}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => window.location.href = `/search/${popularSymbol}`}
                        >
                          {popularSymbol}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Information */}
          <Card className="bg-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>Market Data Status</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">Service Temporarily Unavailable</div>
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Specific error component for fetch failures
export function FetchErrorDisplay({ symbol, onRetry }: { symbol?: string; onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Error"
      message="Failed to fetch data from our servers. This could be due to network connectivity issues or temporary server problems. Please check your internet connection and try again."
      symbol={symbol}
      onRetry={onRetry}
      showSuggestions={true}
    />
  );
}

// Specific error component for invalid symbols
export function InvalidSymbolDisplay({ symbol, onRetry }: { symbol?: string; onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Invalid Symbol"
      message="The requested symbol could not be found. Please verify the ticker symbol is correct and represents a valid publicly traded security."
      symbol={symbol}
      onRetry={onRetry}
      showSuggestions={true}
    />
  );
}
