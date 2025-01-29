import { useState, useEffect } from 'react';

interface EarningsConfirmed {
  symbol: string;
  exchange: string;
  time: string;
  when: string;
  date: string;
  publicationDate: string;
  title: string;
  url: string;
}
const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

const useEarningsConfirmed = (date: Date) => {
  const [earnings, setEarnings] = useState<EarningsConfirmed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get first and last day of the month
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0);
        const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;

        const apiUrl = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${firstDay}&to=${lastDayFormatted}&limit=1000&apikey=${apiKey}`;

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch earnings data');
        }

        const data = await response.json();
        setEarnings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching earnings data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
  }, [date]);

  return { earnings, isLoading, error };
};

export default useEarningsConfirmed; 