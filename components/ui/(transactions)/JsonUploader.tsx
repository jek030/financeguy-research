"use client";

import React, { useCallback, useState } from 'react';
import { Upload, FileJson, X, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { RawTransactionFile, TransactionFile } from '@/lib/types/transactions';
import { parseTransactionFile } from '@/utils/transactionCalculations';

interface JsonUploaderProps {
  onDataLoaded: (data: TransactionFile) => void;
  className?: string;
}

export default function JsonUploader({ onDataLoaded, className }: JsonUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const processFile = useCallback((file: File) => {
    setError(null);
    setIsLoaded(false);

    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rawData = JSON.parse(content) as RawTransactionFile;
        
        // Validate structure
        if (!rawData.BrokerageTransactions || !Array.isArray(rawData.BrokerageTransactions)) {
          setError('Invalid file format: Missing BrokerageTransactions array');
          return;
        }

        const parsedData = parseTransactionFile(rawData);
        setFileName(file.name);
        setIsLoaded(true);
        onDataLoaded(parsedData);

        // Save to localStorage for persistence
        try {
          localStorage.setItem('transactions-data', JSON.stringify(parsedData));
          localStorage.setItem('transactions-filename', file.name);
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClear = useCallback(() => {
    setFileName(null);
    setIsLoaded(false);
    setError(null);
    localStorage.removeItem('transactions-data');
    localStorage.removeItem('transactions-filename');
  }, []);

  return (
    <Card className={cn("w-full border-border bg-background font-mono", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm tracking-wide">
          <FileJson className="h-4 w-4" />
          Data Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoaded && fileName ? (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs font-medium text-foreground">{fileName}</p>
                <p className="text-[11px] text-emerald-500">Loaded</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative rounded-md border border-dashed p-5 transition-colors",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-foreground/40",
              error && "border-red-500/50 bg-red-500/5"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-sm border border-border",
                isDragging ? "bg-primary/20" : "bg-muted/50"
              )}>
                <Upload className={cn(
                  "h-4 w-4",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  {isDragging ? "Drop JSON file" : "Drag JSON file"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  or click to browse
                </p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2">
            <p className="text-[11px] text-red-500">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
