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
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Import Transaction Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoaded && fileName ? (
          <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">File loaded successfully</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-colors",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
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
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                isDragging ? "bg-primary/20" : "bg-muted"
              )}>
                <Upload className={cn(
                  "h-6 w-6",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? "Drop your file here" : "Drop your JSON file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
