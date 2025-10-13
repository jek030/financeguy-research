import { useState, useEffect } from 'react';
import { supabase, SupabasePortfolio, SupabasePortfolioPosition } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';

export interface StockPosition {
  id: string;
  symbol: string;
  cost: number;
  quantity: number;
  netCost: number;
  initialStopLoss: number;
  stopLoss: number;
  type: 'Long' | 'Short';
  openDate: Date;
  closedDate?: Date | null;
  priceTarget2R: number;
  priceTarget2RShares: number;
  priceTarget5R: number;
  priceTarget5RShares: number;
  priceTarget21Day: number;
  remainingShares: number;
  currentPrice?: number;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<SupabasePortfolio | null>(null);
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Convert Supabase position to our app's format
  const mapSupabaseToPosition = (data: SupabasePortfolioPosition): StockPosition => {
    // The open_risk column stores the percentage value that should be displayed in "Open Risk %" column
    // We need to convert this percentage back to the actual stop loss value for the stopLoss field
    // Formula: stopLoss = cost + (open_risk / 100) * cost = cost * (1 + open_risk / 100)
    const stopLossValue = data.cost * (1 + data.open_risk / 100);

    return {
      id: `${data.portfolio_key}-${data.trade_key}`,
      symbol: data.symbol,
      cost: data.cost,
      quantity: data.quantity,
      netCost: data.net_cost,
      initialStopLoss: data.initial_stop_loss,
      stopLoss: stopLossValue, // Convert the stored percentage back to stop loss value
      type: data.type as 'Long' | 'Short',
      openDate: new Date(data.open_date),
      closedDate: data.close_date ? new Date(data.close_date) : null,
      priceTarget2R: data.price_target_1,
      priceTarget2RShares: data.price_target_1_quantity,
      priceTarget5R: data.price_target_2,
      priceTarget5RShares: data.price_target_2_quantity,
      priceTarget21Day: data.price_target_3,
      remainingShares: data.remaining_shares,
    };
  };

  // Convert our app's position to Supabase format
  const mapPositionToSupabase = (position: Omit<StockPosition, 'id'>, portfolioKey: number | string, tradeKey?: number | string) => {
    const now = new Date();
    const endDate = position.closedDate || now;
    const diffTime = Math.abs(endDate.getTime() - position.openDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate the Open Risk % percentage: (stopLoss - cost) / cost * 100
    // This is the value that should be stored in the open_risk column
    const openRiskPercentage = ((position.stopLoss - position.cost) / position.cost) * 100;

    // Calculate the % Portfolio percentage: (equity / portfolio_value) * 100
    // This is the value that should be stored in the percent_of_portfolio column
    const portfolioValue = portfolio?.portfolio_value || 0;
    const remainingShares = position.quantity - position.priceTarget2RShares - position.priceTarget5RShares;
    const equity = position.cost * remainingShares; // Calculate equity based on remaining shares
    const portfolioPercent = portfolioValue > 0 ? (equity / portfolioValue) * 100 : 0;

    return {
      portfolio_key: portfolioKey,
      trade_key: tradeKey || 0, // Will be auto-generated if not provided
      symbol: position.symbol,
      type: position.type,
      cost: position.cost,
      quantity: position.quantity,
      net_cost: position.netCost,
      equity: equity, // Will be updated with live price
      unrealized_gain_loss: 0, // Will be calculated with live price
      percent_of_portfolio: portfolioPercent, // Store the % Portfolio percentage value
      initial_stop_loss: position.initialStopLoss,
      open_risk: openRiskPercentage, // Store the Open Risk % percentage value
      open_heat: 0, // Will be calculated
      price_target_1: position.priceTarget2R,
      price_target_1_quantity: position.priceTarget2RShares,
      price_target_2: position.priceTarget5R,
      price_target_2_quantity: position.priceTarget5RShares,
      price_target_3: position.priceTarget21Day,
      remaining_shares: remainingShares, // Store the calculated remaining shares
      open_date: position.openDate.toISOString().split('T')[0], // YYYY-MM-DD format
      close_date: position.closedDate ? position.closedDate.toISOString().split('T')[0] : null,
      days_in_trade: diffDays,
    };
  };

  // Fetch portfolio and positions
  const fetchPortfolio = async () => {
    if (!user) {
      setPortfolio(null);
      setPositions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching portfolio for user:', user.id);
      
      // First, check if user has a portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('tblPortfolio')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Portfolio query result:', { portfolioData, portfolioError });

      if (portfolioError && portfolioError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Portfolio query error:', portfolioError);
        throw portfolioError;
      }

      let currentPortfolio: SupabasePortfolio;

      if (!portfolioData) {
        // Create new portfolio - let Supabase generate the portfolio_key
        const newPortfolio = {
          user_id: user.id,
          user_email: user.email || '',
          portfolio_value: 0,
          portfolio_name: 'My Portfolio',
        };

        console.log('Creating new portfolio:', newPortfolio);

        const { data: createdPortfolio, error: createError } = await supabase
          .from('tblPortfolio')
          .insert(newPortfolio)
          .select()
          .single();

      console.log('Portfolio creation result:', { createdPortfolio, createError });

      if (createError) {
        console.error('Portfolio creation error:', createError);
        throw createError;
      }

      // Ensure portfolio_key is properly typed
      currentPortfolio = {
        ...createdPortfolio,
        portfolio_key: typeof createdPortfolio.portfolio_key === 'string' 
          ? parseInt(createdPortfolio.portfolio_key, 10) 
          : createdPortfolio.portfolio_key
      };
    } else {
      // Ensure portfolio_key is properly typed for existing portfolio
      currentPortfolio = {
        ...portfolioData,
        portfolio_key: typeof portfolioData.portfolio_key === 'string' 
          ? parseInt(portfolioData.portfolio_key, 10) 
          : portfolioData.portfolio_key
      };
    }

      setPortfolio(currentPortfolio);

      // Fetch positions for this portfolio
      console.log('Fetching positions for portfolio_key:', currentPortfolio.portfolio_key);
      
      const { data: positionsData, error: positionsError } = await supabase
        .from('tblPortfolioPositions')
        .select('*')
        .eq('portfolio_key', currentPortfolio.portfolio_key)
        .order('trade_key', { ascending: true });

      console.log('Positions query result:', { positionsData, positionsError });

      if (positionsError) {
        console.error('Positions query error:', positionsError);
        throw positionsError;
      }

      if (positionsData) {
        const mappedPositions = positionsData.map(mapSupabaseToPosition);
        setPositions(mappedPositions);
      } else {
        setPositions([]);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new position
  const addPosition = async (position: Omit<StockPosition, 'id'>) => {
    console.log('addPosition called with:', position);
    
    if (!portfolio) {
      console.error('No portfolio found');
      throw new Error('No portfolio found');
    }

    console.log('Current portfolio:', portfolio);

    try {
      const supabasePosition = mapPositionToSupabase(position, portfolio.portfolio_key);
      console.log('Mapped to Supabase position:', supabasePosition);
      
      const { data, error } = await supabase
        .from('tblPortfolioPositions')
        .insert(supabasePosition)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Insert successful, data returned:', data);
      const newPosition = mapSupabaseToPosition(data);
      console.log('Mapped back to position:', newPosition);
      
      setPositions(prev => [...prev, newPosition]);
      console.log('Position added to state');
    } catch (err) {
      console.error('Error adding position:', err);
      throw err;
    }
  };

  // Update an existing position
  const updatePosition = async (positionId: string, updates: Partial<StockPosition>) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const [portfolioKeyStr, tradeKeyStr] = positionId.split('-');
      const portfolioKey = parseInt(portfolioKeyStr, 10);
      const tradeKey = parseInt(tradeKeyStr, 10);
      
      const supabaseUpdates: Partial<SupabasePortfolioPosition> = {};
      
      if (updates.symbol !== undefined) supabaseUpdates.symbol = updates.symbol;
      if (updates.cost !== undefined) supabaseUpdates.cost = updates.cost;
      if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
      if (updates.netCost !== undefined) supabaseUpdates.net_cost = updates.netCost;
      if (updates.stopLoss !== undefined) {
        // Calculate the Open Risk % percentage: (stopLoss - cost) / cost * 100
        // This is the value that should be stored in the open_risk column
        const cost = updates.cost !== undefined ? updates.cost : positions.find(p => p.id === positionId)?.cost!;
        const openRiskPercentage = ((updates.stopLoss - cost) / cost) * 100;
        supabaseUpdates.open_risk = openRiskPercentage;
      }
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.openDate !== undefined) supabaseUpdates.open_date = updates.openDate.toISOString().split('T')[0];
      if (updates.closedDate !== undefined) supabaseUpdates.close_date = updates.closedDate ? updates.closedDate.toISOString().split('T')[0] : null;
      if (updates.priceTarget2R !== undefined) supabaseUpdates.price_target_1 = updates.priceTarget2R;
      if (updates.priceTarget2RShares !== undefined) supabaseUpdates.price_target_1_quantity = updates.priceTarget2RShares;
      if (updates.priceTarget5R !== undefined) supabaseUpdates.price_target_2 = updates.priceTarget5R;
      if (updates.priceTarget5RShares !== undefined) supabaseUpdates.price_target_2_quantity = updates.priceTarget5RShares;
      if (updates.priceTarget21Day !== undefined) supabaseUpdates.price_target_3 = updates.priceTarget21Day;

      // Recalculate remaining shares if quantity, PT 1 #, or PT 2 # change
      if (updates.quantity !== undefined || updates.priceTarget2RShares !== undefined || updates.priceTarget5RShares !== undefined) {
        const quantity = updates.quantity !== undefined ? updates.quantity : positions.find(p => p.id === positionId)?.quantity!;
        const pt1Shares = updates.priceTarget2RShares !== undefined ? updates.priceTarget2RShares : positions.find(p => p.id === positionId)?.priceTarget2RShares!;
        const pt2Shares = updates.priceTarget5RShares !== undefined ? updates.priceTarget5RShares : positions.find(p => p.id === positionId)?.priceTarget5RShares!;
        const remainingShares = quantity - pt1Shares - pt2Shares;
        supabaseUpdates.remaining_shares = remainingShares;
      }

      // Recalculate % Portfolio if cost, quantity, or portfolio value changes
      if (updates.cost !== undefined || updates.quantity !== undefined) {
        const cost = updates.cost !== undefined ? updates.cost : positions.find(p => p.id === positionId)?.cost!;
        const quantity = updates.quantity !== undefined ? updates.quantity : positions.find(p => p.id === positionId)?.quantity!;
        const pt1Shares = updates.priceTarget2RShares !== undefined ? updates.priceTarget2RShares : positions.find(p => p.id === positionId)?.priceTarget2RShares!;
        const pt2Shares = updates.priceTarget5RShares !== undefined ? updates.priceTarget5RShares : positions.find(p => p.id === positionId)?.priceTarget5RShares!;
        const remainingShares = quantity - pt1Shares - pt2Shares;
        const equity = cost * remainingShares; // Calculate equity based on remaining shares
        const portfolioPercent = portfolio && portfolio.portfolio_value > 0 ? (equity / portfolio.portfolio_value) * 100 : 0;
        supabaseUpdates.percent_of_portfolio = portfolioPercent;
        supabaseUpdates.equity = equity;
      }

      // Recalculate days_in_trade if dates changed
      if (updates.openDate !== undefined || updates.closedDate !== undefined) {
        const openDate = updates.openDate || positions.find(p => p.id === positionId)?.openDate!;
        const endDate = updates.closedDate || new Date();
        const diffTime = Math.abs(endDate.getTime() - openDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        supabaseUpdates.days_in_trade = diffDays;
      }

      const { data, error } = await supabase
        .from('tblPortfolioPositions')
        .update(supabaseUpdates)
        .eq('portfolio_key', portfolioKey)
        .eq('trade_key', tradeKey)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedPosition = mapSupabaseToPosition(data);
      setPositions(prev => prev.map(p => p.id === positionId ? updatedPosition : p));
    } catch (err) {
      console.error('Error updating position:', err);
      throw err;
    }
  };

  // Delete a position
  const deletePosition = async (positionId: string) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const [portfolioKeyStr, tradeKeyStr] = positionId.split('-');
      const portfolioKey = parseInt(portfolioKeyStr, 10);
      const tradeKey = parseInt(tradeKeyStr, 10);
      
      const { error } = await supabase
        .from('tblPortfolioPositions')
        .delete()
        .eq('portfolio_key', portfolioKey)
        .eq('trade_key', tradeKey);

      if (error) {
        throw error;
      }

      setPositions(prev => prev.filter(p => p.id !== positionId));
    } catch (err) {
      console.error('Error deleting position:', err);
      throw err;
    }
  };

  // Update portfolio value
  const updatePortfolioValue = async (value: number) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const { error } = await supabase
        .from('tblPortfolio')
        .update({ portfolio_value: value })
        .eq('portfolio_key', portfolio.portfolio_key);

      if (error) {
        throw error;
      }

      setPortfolio(prev => prev ? { ...prev, portfolio_value: value } : null);

      // Recalculate percent_of_portfolio for all positions
      if (value > 0) {
        for (const position of positions) {
          const remainingShares = position.quantity - position.priceTarget2RShares - position.priceTarget5RShares;
          const equity = position.cost * remainingShares; // Calculate equity based on remaining shares
          const portfolioPercent = (equity / value) * 100;
          
          const [portfolioKeyStr, tradeKeyStr] = position.id.split('-');
          const portfolioKey = parseInt(portfolioKeyStr, 10);
          const tradeKey = parseInt(tradeKeyStr, 10);

          await supabase
            .from('tblPortfolioPositions')
            .update({ percent_of_portfolio: portfolioPercent, equity: equity })
            .eq('portfolio_key', portfolioKey)
            .eq('trade_key', tradeKey);
        }
      }
    } catch (err) {
      console.error('Error updating portfolio value:', err);
      throw err;
    }
  };

  // Update portfolio name and value
  const updatePortfolio = async (name: string, value: number) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      console.log('Updating portfolio:', {
        portfolio_key: portfolio.portfolio_key,
        portfolio_name: name,
        portfolio_value: value
      });

      const { error } = await supabase
        .from('tblPortfolio')
        .update({ 
          portfolio_name: name,
          portfolio_value: value 
        })
        .eq('portfolio_key', portfolio.portfolio_key);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Portfolio updated successfully');

      setPortfolio(prev => prev ? { 
        ...prev, 
        portfolio_name: name,
        portfolio_value: value 
      } : null);
    } catch (err) {
      console.error('Error updating portfolio:', err);
      throw err;
    }
  };

  // Fetch portfolio on mount
  useEffect(() => {
    fetchPortfolio();
  }, [user]);

  return {
    portfolio,
    positions,
    isLoading,
    error,
    addPosition,
    updatePosition,
    deletePosition,
    updatePortfolioValue,
    updatePortfolio,
    refetch: fetchPortfolio,
  };
}
