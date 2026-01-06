"use client";
import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PercentageChange } from '@/components/ui/PriceIndicator';

interface FormValues {
  value1: string;
  value2: string;
  value3: string;
}

interface CalculationResult {
  value: number;
}

interface RRCalculationCardProps {
  price: number;
  dayLow: number;
}

const RRCard: React.FC<RRCalculationCardProps> = ({ price, dayLow }) => {
  const [values, setValues] = useState<FormValues>({
    value1: '',
    value2: price.toString(),
    value3: dayLow.toString()
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setValues(prev => ({
      ...prev,
      value2: price.toString(),
      value3: dayLow.toString()
    }));
  }, [price, dayLow]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setResult(null);
  };

  const calculateResult = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    const v1: number = parseFloat(values.value1);
    const v2: number = parseFloat(values.value2);
    const v3: number = parseFloat(values.value3);

    if (isNaN(v1) || isNaN(v2) || isNaN(v3)) {
      setError('Please enter valid numbers');
      return;
    }

    if (v1 - v3 === 0) {
      setError('Cannot divide by zero! (Value1 - Value3 cannot be zero)');
      return;
    }

    const calculation: number = (v1 - v2) / (v2 - v3);
    setResult({ value: calculation });
  };

  // Calculate 2R and 5R values based on current Price and Stop Loss
  const calculate2R = (): number | null => {
    const currentPrice = parseFloat(values.value2);
    const stopLoss = parseFloat(values.value3);
    
    if (!isNaN(currentPrice) && !isNaN(stopLoss) && currentPrice > stopLoss) {
      const risk = currentPrice - stopLoss;
      return currentPrice + (2 * risk);
    }
    return null;
  };

  const calculate5R = (): number | null => {
    const currentPrice = parseFloat(values.value2);
    const stopLoss = parseFloat(values.value3);
    
    if (!isNaN(currentPrice) && !isNaN(stopLoss) && currentPrice > stopLoss) {
      const risk = currentPrice - stopLoss;
      return currentPrice + (5 * risk);
    }
    return null;
  };

  return (
    <Card className="w-full h-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Risk Calculator</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <form onSubmit={calculateResult} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="value1">
              Price Target
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="value1"
                type="number"
                name="value1"
                value={values.value1}
                onChange={handleChange}
                placeholder="Enter first value"
                required
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-600"
              />
              {values.value1 && values.value2 && (
                <PercentageChange 
                  value={((parseFloat(values.value1) - parseFloat(values.value2)) / parseFloat(values.value2)) * 100}
                  size="sm"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="value2">
              Price
            </label>
            <Input
              id="value2"
              type="number"
              name="value2"
              value={values.value2}
              onChange={handleChange}
              placeholder="Enter second value"
              required
              className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="value3">
              Stop Loss
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="value3"
                type="number"
                name="value3"
                value={values.value3}
                onChange={handleChange}
                placeholder="Enter third value"
                required
                className="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-600"
              />
              {values.value3 && values.value2 && (
                <PercentageChange 
                  value={((parseFloat(values.value3) - parseFloat(values.value2)) / parseFloat(values.value2)) * 100}
                  size="sm"
                />
              )}
            </div>
          </div>
          <Button type="submit" className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-medium">
            Calculate
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 w-full px-4 pb-4">
        <div className="w-full flex justify-between items-center border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Result:</label>
          <span className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
            {result !== null ? result.value.toFixed(1) + "R" : '—'}
          </span>
        </div>
        
        {/* 2R and 5R Display */}
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">2R Target:</label>
            <div className="border-b border-dashed border-neutral-300 dark:border-neutral-700 flex-grow mx-3"></div>
            <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {calculate2R() !== null ? `$${calculate2R()!.toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">5R Target:</label>
            <div className="border-b border-dashed border-neutral-300 dark:border-neutral-700 flex-grow mx-3"></div>
            <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">
              {calculate5R() !== null ? `$${calculate5R()!.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>
        
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        )}
      </CardFooter>
    </Card>
  );
};

export default RRCard;
