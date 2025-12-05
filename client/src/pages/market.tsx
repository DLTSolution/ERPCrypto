import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Bitcoin,
  Gauge,
  TrendingUp,
  TrendingDown,
  Plus,
  Star,
  StarOff,
} from "lucide-react";
import type { Token, MarketOverview } from "@shared/schema";
import { useState } from "react";

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function getFearGreedColor(value: number): string {
  if (value <= 25) return "text-rose-400";
  if (value <= 45) return "text-orange-400";
  if (value <= 55) return "text-yellow-400";
  if (value <= 75) return "text-lime-400";
  return "text-emerald-400";
}

export default function Market() {
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["bitcoin", "ethereum"]));

  const { data: overview, isLoading: overviewLoading } = useQuery<MarketOverview>({
    queryKey: ["/api/market/overview"],
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ["/api/market/tokens"],
  });

  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const columns = [
    {
      key: "rank",
      header: "#",
      sortable: true,
      className: "w-12",
      render: (token: Token) => (
        <span className="text-muted-foreground font-mono">{token.rank}</span>
      ),
    },
    {
      key: "name",
      header: "Token",
      sortable: true,
      render: (token: Token) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleWatchlist(token.id)}
            className="text-muted-foreground"
            data-testid={`button-watchlist-${token.id}`}
          >
            {watchlist.has(token.id) ? (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center text-sm font-bold">
            {token.symbol.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{token.name}</p>
            <p className="text-xs text-muted-foreground uppercase">{token.symbol}</p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      className: "text-right",
      render: (token: Token) => (
        <span className="font-mono">{formatPrice(token.price)}</span>
      ),
    },
    {
      key: "change24h",
      header: "24h %",
      sortable: true,
      className: "text-right",
      render: (token: Token) => (
        <div
          className={`flex items-center justify-end gap-1 font-medium ${
            token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {token.change24h >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{Math.abs(token.change24h).toFixed(2)}%</span>
        </div>
      ),
    },
    {
      key: "marketCap",
      header: "Market Cap",
      sortable: true,
      className: "text-right",
      render: (token: Token) => (
        <span className="font-mono">{formatNumber(token.marketCap)}</span>
      ),
    },
    {
      key: "volume24h",
      header: "Volume (24h)",
      sortable: true,
      className: "text-right",
      render: (token: Token) => (
        <span className="font-mono text-muted-foreground">
          {formatNumber(token.volume24h)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Market Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time cryptocurrency market data
          </p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-add-token">
          <Plus className="w-4 h-4" />
          Add Token
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overviewLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : overview ? (
          <>
            <MetricCard
              title="Total Market Cap"
              value={formatNumber(overview.totalMarketCap)}
              icon={<BarChart3 className="w-5 h-5" />}
              variant="gradient"
              testId="metric-market-cap"
            />
            <MetricCard
              title="Bitcoin Dominance"
              value={`${overview.btcDominance.toFixed(1)}%`}
              subtitle="Market share"
              icon={<Bitcoin className="w-5 h-5" />}
              variant="neon-purple"
              testId="metric-btc-dominance"
            />
            <MetricCard
              title="Fear & Greed Index"
              value={overview.fearGreedIndex}
              subtitle={
                <Badge
                  variant="outline"
                  className={getFearGreedColor(overview.fearGreedIndex)}
                >
                  {overview.fearGreedLabel}
                </Badge>
              }
              icon={<Gauge className="w-5 h-5" />}
              variant="neon-cyan"
              testId="metric-fear-greed"
            />
          </>
        ) : null}
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">Token List</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {watchlist.size} watching
          </Badge>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : tokens ? (
            <DataTable
              data={tokens}
              columns={columns}
              searchKey="name"
              searchPlaceholder="Search tokens..."
              pageSize={10}
              emptyMessage="No tokens found"
              testId="table-tokens"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
