
interface SectorReturnChartProps {
  title: string;
  subtitle?: string;
  data: Array<{
    name: string;
    symbol: string;
    performance: number;
  }>;
}

export function SectorReturnChart({ title, subtitle, data }: SectorReturnChartProps) {
  // Find maximum absolute value for scaling
  const maxAbsValue = Math.max(...data.map(item => Math.abs(item.performance)));
  
  // Format number with percentage
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate opacity based on relative performance
  const getOpacity = (value: number) => {
    const relativeValue = Math.abs(value) / maxAbsValue;
    // Scale opacity between 0.5 and 1
    return 0.5 + (relativeValue * 0.5);
  };
  
  return (
    <div className="space-y-2 w-full">
      <div className="text-center">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center text-xs">
            <div className="w-28 md:w-40 text-right pr-2 text-muted-foreground truncate">
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">{item.symbol}</span>
              <span className="hidden md:inline"> ({item.symbol})</span>
            </div>
            <div className="flex-1 flex items-center min-w-0">
              {item.performance < 0 ? (
                // Negative performance bar (red)
                <div className="flex-1 flex items-center">
                  <div 
                    className="h-5 rounded min-w-[4px]"
                    style={{ 
                      width: `${(Math.abs(item.performance) / maxAbsValue) * 100}%`,
                      maxWidth: '100%',
                      backgroundColor: `rgba(239, 68, 68, ${getOpacity(item.performance)})`
                    }}
                  ></div>
                  <span className="text-muted-foreground ml-2 flex-shrink-0 tabular-nums">
                    {formatPercent(item.performance)}
                  </span>
                </div>
              ) : (
                // Positive performance bar (green)
                <div className="flex-1 flex items-center">
                  <div 
                    className="h-5 rounded min-w-[4px]"
                    style={{ 
                      width: `${(Math.abs(item.performance) / maxAbsValue) * 100}%`,
                      maxWidth: '100%',
                      backgroundColor: `rgba(34, 197, 94, ${getOpacity(item.performance)})`
                    }}
                  ></div>
                  <span className="text-muted-foreground ml-2 flex-shrink-0 tabular-nums">
                    {formatPercent(item.performance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 