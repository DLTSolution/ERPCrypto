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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Landmark,
  
  Plus,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Percent,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Collateral, Borrow, InsertCollateral, InsertBorrow } from "@shared/schema";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getHealthFactorColor(hf: number): string {
  if (hf >= 1.5) return "health-safe";
  if (hf >= 1.2) return "health-warning";
  return "health-danger";
}

function getHealthFactorLabel(hf: number): string {
  if (hf >= 2) return "Very Safe";
  if (hf >= 1.5) return "Safe";
  if (hf >= 1.2) return "Caution";
  return "At Risk";
}

export default function BorrowLend() {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { toast } = useToast();
  const [isCollateralModalOpen, setIsCollateralModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [collateralForm, setCollateralForm] = useState<Partial<InsertCollateral>>({
    asset: "",
    amount: 0,
    valueUsd: 0,
    ltv: 0.75,
    healthFactor: 2,
  });
  const [borrowForm, setBorrowForm] = useState<Partial<InsertBorrow>>({
    asset: "",
    borrowedAmount: 0,
    interestRate: 0,
    valueUsd: 0,
  });

  const { data: collaterals, isLoading: collateralsLoading } = useQuery<Collateral[]>({
    queryKey: ["/api/collaterals"],
    enabled: isAuthenticated,
  });

  const { data: borrows, isLoading: borrowsLoading } = useQuery<Borrow[]>({
    queryKey: ["/api/borrows"],
    enabled: isAuthenticated,
  });

  const createCollateralMutation = useMutation({
    mutationFn: (data: InsertCollateral) => apiRequest("POST", "/api/collaterals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaterals"] });
      toast({ title: "Collateral added successfully" });
      setIsCollateralModalOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add collateral", variant: "destructive" });
    },
  });

  const createBorrowMutation = useMutation({
    mutationFn: (data: InsertBorrow) => apiRequest("POST", "/api/borrows", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrows"] });
      toast({ title: "Borrow added successfully" });
      setIsBorrowModalOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add borrow", variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Landmark className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your borrow & lend dashboard.
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

  const totalCollateral = collaterals?.reduce((sum, c) => sum + c.valueUsd, 0) || 0;
  const totalBorrowed = borrows?.reduce((sum, b) => sum + b.valueUsd, 0) || 0;
  const avgHealthFactor = collaterals && collaterals.length > 0
    ? collaterals.reduce((sum, c) => sum + c.healthFactor, 0) / collaterals.length
    : 0;

  const collateralColumns = [
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: Collateral) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center text-sm font-bold">
            {item.asset.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium">{item.asset}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      className: "text-right",
      render: (item: Collateral) => (
        <span className="font-mono">{item.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      className: "text-right",
      render: (item: Collateral) => (
        <span className="font-mono">{formatCurrency(item.valueUsd)}</span>
      ),
    },
    {
      key: "ltv",
      header: "LTV",
      sortable: true,
      className: "text-right",
      render: (item: Collateral) => (
        <span className="text-muted-foreground">{(item.ltv * 100).toFixed(0)}%</span>
      ),
    },
    {
      key: "healthFactor",
      header: "Health Factor",
      sortable: true,
      className: "text-right",
      render: (item: Collateral) => (
        <Badge variant="outline" className={getHealthFactorColor(item.healthFactor)}>
          {item.healthFactor.toFixed(2)}
        </Badge>
      ),
    },
  ];

  const borrowColumns = [
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: Borrow) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500/30 to-orange-500/30 flex items-center justify-center text-sm font-bold">
            {item.asset.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium">{item.asset}</span>
        </div>
      ),
    },
    {
      key: "borrowedAmount",
      header: "Borrowed",
      sortable: true,
      className: "text-right",
      render: (item: Borrow) => (
        <span className="font-mono">{item.borrowedAmount.toLocaleString()}</span>
      ),
    },
    {
      key: "interestRate",
      header: "Interest Rate",
      sortable: true,
      className: "text-right",
      render: (item: Borrow) => (
        <span className="text-amber-400">{item.interestRate.toFixed(2)}%</span>
      ),
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      className: "text-right",
      render: (item: Borrow) => (
        <span className="font-mono text-rose-400">{formatCurrency(item.valueUsd)}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Borrow & Lend Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your DeFi lending positions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Collateral"
          value={formatCurrency(totalCollateral)}
          icon={<ShieldCheck className="w-5 h-5" />}
          variant="neon-green"
          testId="metric-total-collateral"
        />
        <MetricCard
          title="Total Borrowed"
          value={formatCurrency(totalBorrowed)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="gradient"
          testId="metric-total-borrowed"
        />
        <MetricCard
          title="Health Factor"
          value={avgHealthFactor.toFixed(2)}
          subtitle={
            <Badge variant="outline" className={getHealthFactorColor(avgHealthFactor)}>
              {getHealthFactorLabel(avgHealthFactor)}
            </Badge>
          }
          icon={
            avgHealthFactor >= 1.5 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )
          }
          variant={avgHealthFactor >= 1.5 ? "neon-cyan" : "default"}
          testId="metric-health-factor"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg">Collateral</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCollateralModalOpen(true)}
              className="gap-1"
              data-testid="button-add-collateral"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {collateralsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : collaterals && collaterals.length > 0 ? (
              <DataTable
                data={collaterals}
                columns={collateralColumns}
                pageSize={5}
                emptyMessage="No collateral added"
                testId="table-collaterals"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No collateral added yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-lg">Borrowed</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setIsBorrowModalOpen(true)}
              className="gap-1"
              data-testid="button-add-borrow"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {borrowsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : borrows && borrows.length > 0 ? (
              <DataTable
                data={borrows}
                columns={borrowColumns}
                pageSize={5}
                emptyMessage="No borrows added"
                testId="table-borrows"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Landmark className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No borrows added yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCollateralModalOpen} onOpenChange={setIsCollateralModalOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Add Collateral</DialogTitle>
            <DialogDescription>Add a new collateral position</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCollateralMutation.mutate(collateralForm as InsertCollateral);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="collateral-asset">Asset</Label>
              <Input
                id="collateral-asset"
                placeholder="e.g., ETH"
                value={collateralForm.asset}
                onChange={(e) => setCollateralForm({ ...collateralForm, asset: e.target.value })}
                data-testid="input-collateral-asset"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collateral-amount">Amount</Label>
                <Input
                  id="collateral-amount"
                  type="number"
                  step="0.0001"
                  value={collateralForm.amount || ""}
                  onChange={(e) =>
                    setCollateralForm({ ...collateralForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-collateral-amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collateral-value">USD Value</Label>
                <Input
                  id="collateral-value"
                  type="number"
                  step="0.01"
                  value={collateralForm.valueUsd || ""}
                  onChange={(e) =>
                    setCollateralForm({ ...collateralForm, valueUsd: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-collateral-value"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collateral-ltv">LTV (0-1)</Label>
                <Input
                  id="collateral-ltv"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={collateralForm.ltv || ""}
                  onChange={(e) =>
                    setCollateralForm({ ...collateralForm, ltv: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-collateral-ltv"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collateral-hf">Health Factor</Label>
                <Input
                  id="collateral-hf"
                  type="number"
                  step="0.01"
                  value={collateralForm.healthFactor || ""}
                  onChange={(e) =>
                    setCollateralForm({ ...collateralForm, healthFactor: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-collateral-hf"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCollateralModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                disabled={createCollateralMutation.isPending}
                data-testid="button-submit-collateral"
              >
                Add Collateral
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBorrowModalOpen} onOpenChange={setIsBorrowModalOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Add Borrow</DialogTitle>
            <DialogDescription>Add a new borrow position</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBorrowMutation.mutate(borrowForm as InsertBorrow);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="borrow-asset">Asset</Label>
              <Input
                id="borrow-asset"
                placeholder="e.g., USDC"
                value={borrowForm.asset}
                onChange={(e) => setBorrowForm({ ...borrowForm, asset: e.target.value })}
                data-testid="input-borrow-asset"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-amount">Borrowed Amount</Label>
                <Input
                  id="borrow-amount"
                  type="number"
                  step="0.01"
                  value={borrowForm.borrowedAmount || ""}
                  onChange={(e) =>
                    setBorrowForm({ ...borrowForm, borrowedAmount: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-borrow-amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrow-rate">Interest Rate (%)</Label>
                <Input
                  id="borrow-rate"
                  type="number"
                  step="0.01"
                  value={borrowForm.interestRate || ""}
                  onChange={(e) =>
                    setBorrowForm({ ...borrowForm, interestRate: parseFloat(e.target.value) || 0 })
                  }
                  data-testid="input-borrow-rate"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrow-value">USD Value</Label>
              <Input
                id="borrow-value"
                type="number"
                step="0.01"
                value={borrowForm.valueUsd || ""}
                onChange={(e) =>
                  setBorrowForm({ ...borrowForm, valueUsd: parseFloat(e.target.value) || 0 })
                }
                data-testid="input-borrow-value"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBorrowModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                disabled={createBorrowMutation.isPending}
                data-testid="button-submit-borrow"
              >
                Add Borrow
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
