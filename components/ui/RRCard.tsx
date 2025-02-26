"use client";
import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
}

const RRCard: React.FC<RRCalculationCardProps> = ({ price }) => {
  const [values, setValues] = useState<FormValues>({
    value1: '',
    value2: price.toString(),
    value3: ''
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setValues(prev => ({
      ...prev,
      value2: price.toString()
    }));
  }, [price]);

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

  const calculatePercentageDiff = (value: string, baseValue: string): string => {
    const val = parseFloat(value);
    const base = parseFloat(baseValue);
    
    if (!isNaN(val) && !isNaN(base) && base !== 0) {
      const percentDiff = ((val - base) / base) * 100;
      return `${percentDiff.toFixed(2)}%`;
    }
    return '';
  };

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Risk Calculator</CardTitle>
        <div className="w-full h-px bg-border" />
      </CardHeader>
      
      <CardContent>
        <form onSubmit={calculateResult} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="value1">
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
                className="bg-background"
              />
              {values.value1 && values.value2 && (
                <span className={`text-sm font-medium ${parseFloat(values.value1) > parseFloat(values.value2) ? 'text-positive' : 'text-negative'}`}>
                  {calculatePercentageDiff(values.value1, values.value2)}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="value2">
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
              className="bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor="value3">
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
                className="bg-background"
              />
              {values.value3 && values.value2 && (
                <span className={`text-sm font-medium ${parseFloat(values.value3) < parseFloat(values.value2) ? 'text-negative' : 'text-positive'}`}>
                  {calculatePercentageDiff(values.value3, values.value2)}
                </span>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Calculate
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 w-full">
        <div className="w-full flex justify-between items-center border-t border-border pt-4">
          <label className="text-sm font-medium text-muted-foreground">Result:</label>
          <span className="text-lg font-semibold text-foreground">
            {result !== null ? result.value.toFixed(1) + "R" : '—'}
          </span>
        </div>
        {error && (
          <p className="text-sm text-negative">{error}</p>
        )}
      </CardFooter>
    </Card>
  );
};

export default RRCard;