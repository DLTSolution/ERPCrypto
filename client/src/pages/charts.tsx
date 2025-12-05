import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Minus,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import type { Candle, Token } from "@shared/schema";

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

function CandlestickChartComponent({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  if (!candles || candles.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground">
        No chart data available
      </div>
    );
  }

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;
  const chartMin = minPrice - padding;
  const chartMax = maxPrice + padding;

  const scaleY = (price: number) => {
    const height = 500;
    return height - ((price - chartMin) / (chartMax - chartMin)) * height;
  };

  const candleWidth = Math.max(2, Math.min(20, 800 / candles.length - 2));

  return (
    <div ref={containerRef} className="relative h-[500px] w-full overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${candles.length * (candleWidth + 2)} 500`}
        preserveAspectRatio="none"
      >
        {candles.map((candle, i) => {
          const x = i * (candleWidth + 2);
          const isGreen = candle.close >= candle.open;
          const color = isGreen ? "#10b981" : "#ef4444";
          const bodyTop = scaleY(Math.max(candle.open, candle.close));
          const bodyBottom = scaleY(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          return (
            <g key={i}>
              <line
                x1={x + candleWidth / 2}
                y1={scaleY(candle.high)}
                x2={x + candleWidth / 2}
                y2={scaleY(candle.low)}
                stroke={color}
                strokeWidth={1}
              />
              <rect
                x={x}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                rx={1}
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1 text-xs text-muted-foreground font-mono bg-background/80 backdrop-blur-sm p-2 rounded-lg">
        <div>H: {formatPrice(maxPrice)}</div>
        <div>L: {formatPrice(minPrice)}</div>
      </div>
    </div>
  );
}

export default function Charts() {
  const [selectedToken, setSelectedToken] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("1h");

  const { data: tokens } = useQuery<Token[]>({
    queryKey: ["/api/market/tokens"],
  });

  const { data: candles, isLoading: candlesLoading, refetch } = useQuery<Candle[]>({
    queryKey: ["/api/charts", selectedToken, timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${selectedToken}/${timeframe}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch candles");
      return res.json();
    },
  });

  const currentToken = tokens?.find((t) => t.id === selectedToken);
  const lastCandle = candles?.[candles.length - 1];
  const prevCandle = candles?.[candles.length - 2];
  const priceChange = lastCandle && prevCandle
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Charts
          </h1>
          <p className="text-muted-foreground mt-1">
            TradingView-style candle chart viewer
          </p>
        </div>
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CandlestickChart className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Price Chart</CardTitle>
            </div>
            
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="w-48" data-testid="select-token">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {tokens?.map((token) => (
                  <SelectItem key={token.id} value={token.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.symbol.toUpperCase()}</span>
                      <span className="text-muted-foreground text-xs">
                        {token.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {TIMEFRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeframe === tf.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTimeframe(tf.value)}
                  data-testid={`button-timeframe-${tf.value}`}
                >
                  {tf.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh-chart"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {currentToken && (
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center text-lg font-bold">
                  {currentToken.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{currentToken.name}</p>
                  <p className="text-sm text-muted-foreground uppercase">
                    {currentToken.symbol}
                  </p>
                </div>
              </div>
              
              <div className="ml-4">
                <p className="text-2xl font-bold font-mono">
                  {formatPrice(lastCandle?.close ?? currentToken.price)}
                </p>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    priceChange >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {priceChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : priceChange < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  <span>{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-4 text-sm">
                {lastCandle && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Open</p>
                      <p className="font-mono">{formatPrice(lastCandle.open)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">High</p>
                      <p className="font-mono text-emerald-400">{formatPrice(lastCandle.high)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Low</p>
                      <p className="font-mono text-rose-400">{formatPrice(lastCandle.low)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Close</p>
                      <p className="font-mono">{formatPrice(lastCandle.close)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {candlesLoading ? (
            <Skeleton className="h-[500px] rounded-lg" />
          ) : candles ? (
            <div className="rounded-lg border border-border overflow-hidden bg-card/50">
              <CandlestickChartComponent candles={candles} />
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Select a token to view chart
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Timeframe: {timeframe.toUpperCase()}</span>
            <span>{candles?.length ?? 0} candles loaded</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
