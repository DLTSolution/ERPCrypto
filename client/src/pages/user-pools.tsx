import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Plus, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserPool, InsertUserPool } from "@shared/schema";

const NETWORKS = ["Ethereum", "Solana", "Base", "Arbitrum", "Polygon", "BSC"];
const DEXES = ["Uniswap V3", "Raydium", "Orca", "PancakeSwap V3", "Curve", "Balancer"];

function formatCurrency(value: number, currency: "USD" | "BRL" = "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculateDuration(entryDate: string, exitDate: string | null): string {
  const start = new Date(entryDate);
  const end = exitDate ? new Date(exitDate) : new Date();
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function calculateROI(entry: number, exit: number | null, fees: number): number {
  const currentValue = exit ?? entry;
  return ((currentValue + fees - entry) / entry) * 100;
}

export default function UserPools() {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertUserPool>>({
    dex: "",
    network: "",
    pair: "",
    entryDate: new Date().toISOString().split("T")[0],
    entryValueUsd: 0,
    entryValueBrl: 0,
    priceRangeMin: 0,
    priceRangeMax: 0,
    exitDate: null,
    exitValueUsd: null,
    exitValueBrl: null,
    feesEarned: 0,
    status: "open",
  });

  const { data: pools, isLoading } = useQuery<UserPool[]>({
    queryKey: ["/api/user-pools"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertUserPool) => apiRequest("POST", "/api/user-pools", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-pools"] });
      toast({ title: "Pool position created successfully" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create pool position", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      dex: "",
      network: "",
      pair: "",
      entryDate: new Date().toISOString().split("T")[0],
      entryValueUsd: 0,
      entryValueBrl: 0,
      priceRangeMin: 0,
      priceRangeMax: 0,
      exitDate: null,
      exitValueUsd: null,
      exitValueBrl: null,
      feesEarned: 0,
      status: "open",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertUserPool);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to track your liquidity pool positions.
            </p>
            <Button
              onClick={() => setShowLoginModal(true)}
              className="bg-gradient-to-r from-purple-500 to-cyan-500"
              data-testid="button-login-prompt"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openPools = pools?.filter((p) => p.status === "open") || [];
  const closedPools = pools?.filter((p) => p.status === "closed") || [];
  const totalFees = pools?.reduce((sum, p) => sum + p.feesEarned, 0) || 0;
  const totalValue = openPools.reduce((sum, p) => sum + p.entryValueUsd, 0);

  const columns = [
    {
      key: "pair",
      header: "Pool",
      sortable: true,
      render: (pool: UserPool) => (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/50 to-purple-600/50 flex items-center justify-center text-xs font-bold border-2 border-background">
              {pool.pair.split("/")[0]?.slice(0, 2) || "?"}
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/50 to-cyan-600/50 flex items-center justify-center text-xs font-bold border-2 border-background">
              {pool.pair.split("/")[1]?.slice(0, 2) || "?"}
            </div>
          </div>
          <div>
            <p className="font-medium">{pool.pair}</p>
            <p className="text-xs text-muted-foreground">{pool.dex}</p>
          </div>
        </div>
      ),
    },
    {
      key: "network",
      header: "Network",
      sortable: true,
      render: (pool: UserPool) => (
        <Badge variant="outline" className="font-normal">
          {pool.network}
        </Badge>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (pool: UserPool) => (
        <span className="text-muted-foreground">
          {calculateDuration(pool.entryDate, pool.exitDate)}
        </span>
      ),
    },
    {
      key: "entryValueUsd",
      header: "Entry Value",
      sortable: true,
      className: "text-right",
      render: (pool: UserPool) => (
        <div className="text-right">
          <p className="font-mono">{formatCurrency(pool.entryValueUsd)}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {formatCurrency(pool.entryValueBrl, "BRL")}
          </p>
        </div>
      ),
    },
    {
      key: "feesEarned",
      header: "Fees Earned",
      sortable: true,
      className: "text-right",
      render: (pool: UserPool) => (
        <span className="font-mono text-emerald-400">
          +{formatCurrency(pool.feesEarned)}
        </span>
      ),
    },
    {
      key: "roi",
      header: "ROI",
      className: "text-right",
      render: (pool: UserPool) => {
        const roi = calculateROI(
          pool.entryValueUsd,
          pool.exitValueUsd,
          pool.feesEarned
        );
        return (
          <Badge
            variant="outline"
            className={roi >= 0 ? "text-emerald-400" : "text-rose-400"}
          >
            {roi >= 0 ? "+" : ""}
            {roi.toFixed(2)}%
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (pool: UserPool) => (
        <Badge
          variant="outline"
          className={
            pool.status === "open"
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-muted-foreground"
          }
        >
          {pool.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            User Liquidity Pools
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your liquidity pool positions
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-gradient-to-r from-purple-500 to-cyan-500"
          data-testid="button-add-pool"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Value Locked"
          value={formatCurrency(totalValue)}
          subtitle={`${openPools.length} active positions`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          testId="metric-total-value"
        />
        <MetricCard
          title="Total Fees Earned"
          value={formatCurrency(totalFees)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
          testId="metric-total-fees"
        />
        <MetricCard
          title="Closed Positions"
          value={closedPools.length.toString()}
          subtitle="Historical"
          icon={<Clock className="w-5 h-5" />}
          variant="default"
          testId="metric-closed-positions"
        />
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Layers className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Pool Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : pools && pools.length > 0 ? (
            <DataTable
              data={pools}
              columns={columns}
              searchKey="pair"
              searchPlaceholder="Search pools..."
              emptyMessage="No pool positions found"
              testId="table-user-pools"
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pool positions yet</p>
              <p className="text-sm">Click "Add Position" to start tracking</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-strong max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Pool Position</DialogTitle>
            <DialogDescription>
              Record a new liquidity pool position
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DEX</Label>
                <Select
                  value={formData.dex}
                  onValueChange={(v) => setFormData({ ...formData, dex: v })}
                >
                  <SelectTrigger data-testid="select-dex">
                    <SelectValue placeholder="Select DEX" />
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
              <div className="space-y-2">
                <Label>Network</Label>
                <Select
                  value={formData.network}
                  onValueChange={(v) => setFormData({ ...formData, network: v })}
                >
                  <SelectTrigger data-testid="select-network">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pair">Token Pair</Label>
              <Input
                id="pair"
                placeholder="e.g., ETH/USDC"
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                data-testid="input-pair"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryDate">Entry Date</Label>
              <Input
                id="entryDate"
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                data-testid="input-entry-date"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryValueUsd">Entry Value (USD)</Label>
                <Input
                  id="entryValueUsd"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.entryValueUsd || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, entryValueUsd: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-entry-usd"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entryValueBrl">Entry Value (BRL)</Label>
                <Input
                  id="entryValueBrl"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.entryValueBrl || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, entryValueBrl: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-entry-brl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceRangeMin">Price Range Min</Label>
                <Input
                  id="priceRangeMin"
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={formData.priceRangeMin || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, priceRangeMin: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-price-min"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceRangeMax">Price Range Max</Label>
                <Input
                  id="priceRangeMax"
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={formData.priceRangeMax || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, priceRangeMax: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-price-max"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                disabled={createMutation.isPending}
                data-testid="button-submit-pool"
              >
                Create Position
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
