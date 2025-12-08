import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Waves, Zap, TrendingUp, Droplets } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import type { Pool } from "@shared/schema";

const NETWORKS = ["All", "Ethereum", "Solana", "Base", "Arbitrum", "Polygon", "BSC"];
const DEXES = ["All", "Uniswap", "Raydium", "Orca", "PancakeSwap", "Curve", "Balancer"];

function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function getEfficiencyColor(efficiency: number): string {
  if (efficiency >= 2) return "text-emerald-400 bg-emerald-500/10";
  if (efficiency >= 1) return "text-cyan-400 bg-cyan-500/10";
  if (efficiency >= 0.5) return "text-yellow-400 bg-yellow-500/10";
  return "text-rose-400 bg-rose-500/10";
}

export default function PoolsMonitor() {
  const [network, setNetwork] = useState("All");
  const [dex, setDex] = useState("All");
  const [tokenPair, setTokenPair] = useState("");

  const { data: pools, isLoading } = useQuery<Pool[]>({
    queryKey: ["/api/pools"],
  });

  const filteredPools = pools?.filter((pool) => {
    if (network !== "All" && pool.network !== network) return false;
    if (dex !== "All" && pool.dex !== dex) return false;
    if (tokenPair && !pool.pair.toLowerCase().includes(tokenPair.toLowerCase()))
      return false;
    return true;
  });

  const totalTvl = filteredPools?.reduce((sum, pool) => sum + pool.tvl, 0) || 0;
  const totalVolume =
    filteredPools?.reduce((sum, pool) => sum + pool.volume24h, 0) || 0;
  const avgEfficiency =
    filteredPools && filteredPools.length > 0
      ? filteredPools.reduce((sum, pool) => sum + pool.efficiency, 0) /
        filteredPools.length
      : 0;

  const columns = [
    {
      key: "pair",
      header: "Pair",
      sortable: true,
      render: (pool: Pool) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/50 to-purple-600/50 flex items-center justify-center text-xs font-bold border-2 border-background">
              {pool.token0.slice(0, 2)}
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/50 to-cyan-600/50 flex items-center justify-center text-xs font-bold border-2 border-background">
              {pool.token1.slice(0, 2)}
            </div>
          </div>
          <span className="font-medium">{pool.pair}</span>
        </div>
      ),
    },
    {
      key: "network",
      header: "Network",
      sortable: true,
      render: (pool: Pool) => (
        <Badge variant="outline" className="font-normal">
          {pool.network}
        </Badge>
      ),
    },
    {
      key: "dex",
      header: "DEX",
      sortable: true,
      render: (pool: Pool) => (
        <span className="text-muted-foreground">{pool.dex}</span>
      ),
    },
    {
      key: "tvl",
      header: "TVL",
      sortable: true,
      className: "text-right",
      render: (pool: Pool) => (
        <span className="font-mono">{formatNumber(pool.tvl)}</span>
      ),
    },
    {
      key: "volume24h",
      header: "Volume (24h)",
      sortable: true,
      className: "text-right",
      render: (pool: Pool) => (
        <span className="font-mono">{formatNumber(pool.volume24h)}</span>
      ),
    },
    {
      key: "efficiency",
      header: "Efficiency",
      sortable: true,
      className: "text-right",
      render: (pool: Pool) => (
        <Badge
          variant="outline"
          className={`font-mono ${getEfficiencyColor(pool.efficiency)}`}
        >
          {pool.efficiency.toFixed(2)}x
        </Badge>
      ),
    },
    {
      key: "apr",
      header: "APR",
      sortable: true,
      className: "text-right",
      render: (pool: Pool) =>
        pool.apr ? (
          <span className="text-emerald-400 font-medium">
            {pool.apr.toFixed(1)}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Pools Monitor
        </h1>
        <p className="text-muted-foreground mt-1">
          Track liquidity pools across multiple networks and DEXes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total TVL"
          value={formatNumber(totalTvl)}
          icon={<Droplets className="w-5 h-5" />}
          variant="default"
          testId="metric-total-tvl"
        />
        <MetricCard
          title="24h Volume"
          value={formatNumber(totalVolume)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
          testId="metric-total-volume"
        />
        <MetricCard
          title="Avg Efficiency"
          value={`${avgEfficiency.toFixed(2)}x`}
          subtitle="Volume / TVL ratio"
          icon={<Zap className="w-5 h-5" />}
          variant="default"
          testId="metric-avg-efficiency"
        />
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Liquidity Pools</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="w-36" data-testid="select-network">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dex} onValueChange={setDex}>
              <SelectTrigger className="w-36" data-testid="select-dex">
                <SelectValue placeholder="DEX" />
              </SelectTrigger>
              <SelectContent>
                {DEXES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : filteredPools ? (
            <DataTable
              data={filteredPools}
              columns={columns}
              searchKey="pair"
              searchPlaceholder="Search pairs..."
              pageSize={10}
              emptyMessage="No pools found matching your filters"
              testId="table-pools"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
