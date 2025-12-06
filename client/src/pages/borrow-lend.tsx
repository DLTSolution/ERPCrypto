import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RefreshCw,
  Import,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Collateral, Borrow, InsertCollateral, InsertBorrow } from "@shared/schema";

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeDecimal(value: string): string {
  return value.replace(",", ".");
}

function parseDecimalValue(value: string | number): number {
  if (typeof value === "number") return value;
  const parsed = parseFloat(normalizeDecimal(value));
  return isNaN(parsed) ? 0 : parsed;
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
  });
  const [collateralAmountInput, setCollateralAmountInput] = useState("");
  const [collateralValueUsdInput, setCollateralValueUsdInput] = useState("");
  const [collateralExtra, setCollateralExtra] = useState({
    date: new Date().toISOString().split("T")[0],
    chain: "",
    hash: "",
    feeToken: "",
    feeAmount: "",
    feeValueUsd: "",
    ptax: "",
    totalValueBrl: "",
  });
  const [ptaxLoading, setPtaxLoading] = useState(false);
  const [ptaxError, setPtaxError] = useState<string | null>(null);
  const [borrowForm, setBorrowForm] = useState<Partial<InsertBorrow>>({
    protocol: "",
    asset: "",
    borrowedAmount: 0,
    interestRate: 0,
    valueUsd: 0,
    type: "borrow",
  });
  const [borrowAmountInput, setBorrowAmountInput] = useState("");
  const [borrowValueUsdInput, setBorrowValueUsdInput] = useState("");
  const [borrowExtra, setBorrowExtra] = useState({
    date: new Date().toISOString().split("T")[0],
    chain: "",
    hash: "",
    feeToken: "",
    feeAmount: "",
    feeValueUsd: "",
    ptax: "",
    totalValueBrl: "",
  });
  const [borrowPtaxLoading, setBorrowPtaxLoading] = useState(false);
  const [borrowPtaxError, setBorrowPtaxError] = useState<string | null>(null);
  const [borrowMode, setBorrowMode] = useState<"borrow" | "repay">("borrow");
  const [selectedBorrowIdForRepay, setSelectedBorrowIdForRepay] = useState("");

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
      toast({ title: borrowMode === "repay" ? "Repay added successfully" : "Borrow added successfully" });
      setIsBorrowModalOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to add borrow", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isCollateralModalOpen || !collateralExtra.date) return;
    fetchPtaxForDate(collateralExtra.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollateralModalOpen, collateralExtra.date]);

  const fetchPtaxForDate = async (date: string) => {
    setPtaxLoading(true);
    setPtaxError(null);
    try {
      const response = await fetch(`/api/ptax/${date}`);
      const data = await response.json();
      if (data.source === "error" || data.rate === null) {
        setPtaxError(data.errorMessage || "PTAX not available for this date. Please enter manually.");
        setCollateralExtra((prev) => ({ ...prev, date, ptax: "", totalValueBrl: "" }));
        return;
      }
      const ptaxValue = data.rate.toFixed(4);
      const feeNum = parseDecimalValue(collateralExtra.feeValueUsd);
      const totalBrl = ((collateralForm.valueUsd || 0) + feeNum) * data.rate;
      setCollateralExtra((prev) => ({
        ...prev,
        date,
        ptax: ptaxValue,
        totalValueBrl: totalBrl.toFixed(2),
      }));
    } catch (error) {
      setPtaxError("Failed to fetch PTAX. Please enter manually.");
      setCollateralExtra((prev) => ({ ...prev, date, ptax: "", totalValueBrl: "" }));
    } finally {
      setPtaxLoading(false);
    }
  };

  useEffect(() => {
    if (!isBorrowModalOpen || !borrowExtra.date) return;
    fetchBorrowPtax(borrowExtra.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBorrowModalOpen, borrowExtra.date]);

  useEffect(() => {
    if (borrowMode === "repay" && !selectedBorrowIdForRepay && borrows && borrows.length > 0) {
      const firstBorrow = borrows.find((b) => (b.type || "borrow") !== "repay");
      if (firstBorrow) {
        setSelectedBorrowIdForRepay(firstBorrow.id.toString());
      }
    }
  }, [borrowMode, borrows, selectedBorrowIdForRepay]);

  const fetchBorrowPtax = async (date: string) => {
    setBorrowPtaxLoading(true);
    setBorrowPtaxError(null);
    try {
      const response = await fetch(`/api/ptax/${date}`);
      const data = await response.json();
      if (data.source === "error" || data.rate === null) {
        setBorrowPtaxError(data.errorMessage || "PTAX not available for this date. Please enter manually.");
        setBorrowExtra((prev) => ({ ...prev, date, ptax: "", totalValueBrl: "" }));
        return;
      }
      const ptaxValue = data.rate.toFixed(4);
      const feeNum = parseDecimalValue(borrowExtra.feeValueUsd);
      const totalBrl = ((borrowForm.valueUsd || 0) + feeNum) * data.rate;
      setBorrowExtra((prev) => ({
        ...prev,
        date,
        ptax: ptaxValue,
        totalValueBrl: totalBrl.toFixed(2),
      }));
    } catch (error) {
      setBorrowPtaxError("Failed to fetch PTAX. Please enter manually.");
      setBorrowExtra((prev) => ({ ...prev, date, ptax: "", totalValueBrl: "" }));
    } finally {
      setBorrowPtaxLoading(false);
    }
  };

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

  const totalCollateral = collaterals?.reduce((sum, c) => sum + Number(c.valueUsd || 0), 0) || 0;
  const totalBorrowed = borrows?.reduce((sum, b) => sum + Number(b.valueUsd || 0), 0) || 0;

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
      render: (item: Collateral) => (
        <span className="font-mono">{Number(item.amount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: Collateral) => (
        <span className="font-mono">{formatCurrency(Number(item.valueUsd || 0))}</span>
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
      render: (item: Borrow) => (
        <span className="font-mono">{Number(item.borrowedAmount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: "interestRate",
      header: "Interest Rate",
      sortable: true,
      render: (item: Borrow) => (
        <span className="text-amber-400">{Number(item.interestRate || 0).toFixed(2)}%</span>
      ),
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: Borrow) => (
        <span className="font-mono text-rose-400">{formatCurrency(Number(item.valueUsd || 0))}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1 bg-gradient-to-r from-purple-500 to-cyan-500"
                type="button"
                data-testid="button-repay-borrow"
                onClick={() => {
                  if (!borrows || borrows.length === 0) {
                    toast({ title: "Add a borrow before creating a repay", variant: "destructive" });
                    return;
                  }
                  setBorrowMode("repay");
                  setBorrowForm({
                    protocol: "",
                    asset: "",
                    borrowedAmount: 0,
                    interestRate: 0,
                    valueUsd: 0,
                    type: "repay",
                  });
                  setBorrowExtra({
                    date: new Date().toISOString().split("T")[0],
                    chain: "",
                    hash: "",
                    feeToken: "",
                    feeAmount: "",
                    feeValueUsd: "",
                    ptax: "",
                    totalValueBrl: "",
                  });
                  setBorrowAmountInput("");
                  setBorrowValueUsdInput("");
                  setSelectedBorrowIdForRepay("");
                  setIsBorrowModalOpen(true);
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Repay
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setBorrowMode("borrow");
                  setBorrowForm({
                    protocol: "",
                    asset: "",
                    borrowedAmount: 0,
                    interestRate: 0,
                    valueUsd: 0,
                    type: "borrow",
                  });
                  setBorrowExtra({
                    date: new Date().toISOString().split("T")[0],
                    chain: "",
                    hash: "",
                    feeToken: "",
                    feeAmount: "",
                    feeValueUsd: "",
                    ptax: "",
                    totalValueBrl: "",
                  });
                  setBorrowAmountInput("");
                  setBorrowValueUsdInput("");
                  setSelectedBorrowIdForRepay("");
                  setIsBorrowModalOpen(true);
                }}
                className="gap-1"
                data-testid="button-add-borrow"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
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
        <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collateral</DialogTitle>
            <DialogDescription>Add a new collateral position</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload: InsertCollateral = {
                protocol: collateralForm.protocol || null,
                asset: collateralForm.asset || "",
                amount: collateralForm.amount ?? 0,
                valueUsd: collateralForm.valueUsd ?? 0,
                chain: collateralExtra.chain || null,
                hash: collateralExtra.hash || null,
                txDate: collateralExtra.date || null,
                feeToken: collateralExtra.feeToken || null,
                feeAmount: collateralExtra.feeAmount ? parseDecimalValue(collateralExtra.feeAmount) : null,
                feeValueUsd: collateralExtra.feeValueUsd ? parseDecimalValue(collateralExtra.feeValueUsd) : null,
                ptax: collateralExtra.ptax ? parseDecimalValue(collateralExtra.ptax) : null,
                totalValueBrl: collateralExtra.totalValueBrl ? parseDecimalValue(collateralExtra.totalValueBrl) : null,
              };
              createCollateralMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="collateral-date">Date</Label>
              <Input
                id="collateral-date"
                type="date"
                value={collateralExtra.date}
                onChange={(e) => setCollateralExtra({ ...collateralExtra, date: e.target.value })}
              />
            </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collateral-chain">Chain</Label>
                  <Select
                    value={collateralExtra.chain || ""}
                    onValueChange={(v) => setCollateralExtra({ ...collateralExtra, chain: v })}
                  >
                    <SelectTrigger id="collateral-chain">
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="bnb">BNB</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="lightning">Lightning</SelectItem>
                      <SelectItem value="liquid">Liquid</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="solana">Solana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collateral-hash">Hash</Label>
                  <div className="flex gap-2">
                    <Input
                      id="collateral-hash"
                      placeholder="0x..."
                      value={collateralExtra.hash}
                      onChange={(e) => setCollateralExtra({ ...collateralExtra, hash: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      title="Import data from hash (coming soon)"
                    >
                      <Import className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            <div className="space-y-2">
              <Label htmlFor="collateral-protocol">Protocol</Label>
              <Input
                id="collateral-protocol"
                placeholder="e.g., Aave"
                value={collateralForm.protocol || ""}
                onChange={(e) => setCollateralForm({ ...collateralForm, protocol: e.target.value.toUpperCase() })}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collateral-asset">Asset</Label>
              <Input
                id="collateral-asset"
                placeholder="e.g., ETH"
                value={collateralForm.asset}
                onChange={(e) => setCollateralForm({ ...collateralForm, asset: e.target.value.toUpperCase() })}
                className="uppercase"
                data-testid="input-collateral-asset"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collateral-amount">Amount</Label>
                <Input
                  id="collateral-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00000000"
                  value={collateralAmountInput}
                  onChange={(e) => {
                    const amt = normalizeDecimal(e.target.value);
                    const amtNum = parseDecimalValue(amt);
                    setCollateralForm({ ...collateralForm, amount: amtNum });
                    setCollateralAmountInput(amt);
                  }}
                  data-testid="input-collateral-amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collateral-value">USD Value</Label>
                <Input
                  id="collateral-value"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={collateralValueUsdInput}
                  onChange={(e) => {
                    const valueText = normalizeDecimal(e.target.value);
                    const val = parseDecimalValue(valueText);
                    const feeUsd = parseDecimalValue(collateralExtra.feeValueUsd);
                    const ptax = parseDecimalValue(collateralExtra.ptax);
                    const totalBrl = ptax ? ((val + feeUsd) * ptax).toFixed(2) : "";
                    setCollateralForm({ ...collateralForm, valueUsd: val });
                    setCollateralValueUsdInput(valueText);
                    setCollateralExtra({ ...collateralExtra, totalValueBrl: totalBrl });
                  }}
                  data-testid="input-collateral-value"
                  required
                />
              </div>
            </div>
            <div className="border-t border-border/50 pt-4 mt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collateral-fee-token">Fee Token</Label>
                  <Input
                    id="collateral-fee-token"
                    placeholder="e.g., ETH"
                    value={collateralExtra.feeToken}
                    onChange={(e) => setCollateralExtra({ ...collateralExtra, feeToken: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collateral-fee-amount">Amount Fee</Label>
                  <Input
                    id="collateral-fee-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={collateralExtra.feeAmount}
                    onChange={(e) => setCollateralExtra({ ...collateralExtra, feeAmount: normalizeDecimal(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collateral-fee-value">Fee Value (USD)</Label>
                  <Input
                    id="collateral-fee-value"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={collateralExtra.feeValueUsd}
                    onChange={(e) => {
                      const feeUsd = normalizeDecimal(e.target.value);
                      const feeNum = parseDecimalValue(feeUsd);
                      const valUsd = collateralForm.valueUsd || 0;
                      const ptax = parseDecimalValue(collateralExtra.ptax);
                      const totalBrl = ptax ? ((valUsd + feeNum) * ptax).toFixed(2) : "";
                      setCollateralExtra({ ...collateralExtra, feeValueUsd: feeUsd, totalValueBrl: totalBrl });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="collateral-ptax" className="flex items-center gap-2">
                  PTAX
                  {ptaxLoading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input
                  id="collateral-ptax"
                  type="text"
                  inputMode="decimal"
                  placeholder={ptaxLoading ? "Loading..." : "0.0000"}
                  value={collateralExtra.ptax}
                  onChange={(e) => {
                    const ptax = normalizeDecimal(e.target.value);
                    const ptaxNum = parseDecimalValue(ptax);
                    const valUsd = collateralForm.valueUsd || 0;
                    const feeNum = parseDecimalValue(collateralExtra.feeValueUsd);
                    const totalBrl = ptaxNum ? ((valUsd + feeNum) * ptaxNum).toFixed(2) : "";
                    setCollateralExtra({ ...collateralExtra, ptax, totalValueBrl: totalBrl });
                    setPtaxError(null);
                  }}
                  className={ptaxError ? "border-amber-500" : ""}
                />
                {ptaxError && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {ptaxError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="collateral-total-brl">Total Value (BRL)</Label>
                <Input
                  id="collateral-total-brl"
                  type="text"
                  placeholder="0.00"
                  value={collateralExtra.totalValueBrl}
                  disabled
                  className="bg-muted/50"
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
        <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{borrowMode === "repay" ? "Add Repay" : "Add Borrow"}</DialogTitle>
            <DialogDescription>
              {borrowMode === "repay" ? "Log a repayment for an existing borrow" : "Add a new borrow position"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const payload: InsertBorrow = {
                protocol: borrowForm.protocol || null,
                asset: borrowForm.asset || "",
                borrowedAmount: borrowForm.borrowedAmount ?? 0,
                interestRate: borrowForm.interestRate ?? 0,
                valueUsd: borrowForm.valueUsd ?? 0,
                chain: borrowExtra.chain || null,
                hash: borrowExtra.hash || null,
                txDate: borrowExtra.date || null,
                feeToken: borrowExtra.feeToken || null,
                feeAmount: borrowExtra.feeAmount ? parseDecimalValue(borrowExtra.feeAmount) : null,
                feeValueUsd: borrowExtra.feeValueUsd ? parseDecimalValue(borrowExtra.feeValueUsd) : null,
                ptax: borrowExtra.ptax ? parseDecimalValue(borrowExtra.ptax) : null,
                totalValueBrl: borrowExtra.totalValueBrl ? parseDecimalValue(borrowExtra.totalValueBrl) : null,
                type: borrowMode,
                parentBorrowId:
                  borrowMode === "repay" && selectedBorrowIdForRepay
                    ? parseInt(selectedBorrowIdForRepay, 10)
                    : null,
              };
              createBorrowMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            {borrowMode === "repay" && (
              <div className="space-y-2">
                <Label htmlFor="borrow-parent">Repaying Borrow</Label>
                <Select
                  value={selectedBorrowIdForRepay}
                  onValueChange={setSelectedBorrowIdForRepay}
                  disabled={!borrows || borrows.length === 0}
                >
                  <SelectTrigger id="borrow-parent">
                    <SelectValue placeholder="Select borrow to repay" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrows
                      ?.filter((b) => (b.type || "borrow") !== "repay")
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          #{b.id} · {b.asset} · {b.txDate || "no date"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="borrow-date">Date</Label>
              <Input
                id="borrow-date"
                type="date"
                value={borrowExtra.date}
                onChange={(e) => setBorrowExtra({ ...borrowExtra, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-chain">Chain</Label>
                <Select
                  value={borrowExtra.chain || ""}
                  onValueChange={(v) => setBorrowExtra({ ...borrowExtra, chain: v })}
                >
                  <SelectTrigger id="borrow-chain">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                    <SelectItem value="bnb">BNB</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="lightning">Lightning</SelectItem>
                    <SelectItem value="liquid">Liquid</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrow-hash">Hash</Label>
                <div className="flex gap-2">
                  <Input
                    id="borrow-hash"
                    placeholder="0x..."
                    value={borrowExtra.hash}
                    onChange={(e) => setBorrowExtra({ ...borrowExtra, hash: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    title="Import data from hash (coming soon)"
                  >
                    <Import className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrow-protocol">Protocol</Label>
              <Input
                id="borrow-protocol"
                placeholder="e.g., AAVE"
                value={borrowForm.protocol}
                onChange={(e) => setBorrowForm({ ...borrowForm, protocol: e.target.value.toUpperCase() })}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="borrow-asset">Asset</Label>
              <Input
                id="borrow-asset"
                placeholder="e.g., USDC"
                value={borrowForm.asset}
                onChange={(e) => setBorrowForm({ ...borrowForm, asset: e.target.value.toUpperCase() })}
                className="uppercase"
                data-testid="input-borrow-asset"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-amount">Borrowed Amount</Label>
                <Input
                  id="borrow-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00000000"
                  value={borrowAmountInput}
                  onChange={(e) =>
                    {
                      const amt = normalizeDecimal(e.target.value);
                      const amtNum = parseDecimalValue(amt);
                      setBorrowForm({ ...borrowForm, borrowedAmount: amtNum });
                      setBorrowAmountInput(amt);
                    }
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
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={borrowValueUsdInput}
                  onChange={(e) =>
                    {
                      const val = normalizeDecimal(e.target.value);
                      const valNum = parseDecimalValue(val);
                      const feeNum = parseDecimalValue(borrowExtra.feeValueUsd);
                      const ptaxNum = parseDecimalValue(borrowExtra.ptax);
                      const totalBrl = ptaxNum ? ((valNum + feeNum) * ptaxNum).toFixed(2) : "";
                      setBorrowForm({ ...borrowForm, valueUsd: valNum });
                      setBorrowValueUsdInput(val);
                      setBorrowExtra({ ...borrowExtra, totalValueBrl: totalBrl });
                    }
                  }
                  data-testid="input-borrow-value"
                  required
                />
              </div>
            <div className="border-t border-border/50 pt-4 mt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borrow-fee-token">Fee Token</Label>
                  <Input
                    id="borrow-fee-token"
                    placeholder="e.g., ETH"
                    value={borrowExtra.feeToken}
                    onChange={(e) => setBorrowExtra({ ...borrowExtra, feeToken: e.target.value.toUpperCase() })}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borrow-fee-amount">Amount Fee</Label>
                  <Input
                    id="borrow-fee-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={borrowExtra.feeAmount}
                    onChange={(e) => setBorrowExtra({ ...borrowExtra, feeAmount: normalizeDecimal(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borrow-fee-value">Fee Value (USD)</Label>
                  <Input
                    id="borrow-fee-value"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={borrowExtra.feeValueUsd}
                    onChange={(e) => {
                      const feeUsd = normalizeDecimal(e.target.value);
                      const feeNum = parseDecimalValue(feeUsd);
                      const valUsd = borrowForm.valueUsd || 0;
                      const ptax = parseDecimalValue(borrowExtra.ptax);
                      const totalBrl = ptax ? ((valUsd + feeNum) * ptax).toFixed(2) : "";
                      setBorrowExtra({ ...borrowExtra, feeValueUsd: feeUsd, totalValueBrl: totalBrl });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-ptax" className="flex items-center gap-2">
                  PTAX
                  {borrowPtaxLoading && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                </Label>
                <Input
                  id="borrow-ptax"
                  type="text"
                  inputMode="decimal"
                  placeholder={borrowPtaxLoading ? "Loading..." : "0.0000"}
                  value={borrowExtra.ptax}
                  onChange={(e) => {
                    const ptax = normalizeDecimal(e.target.value);
                    const ptaxNum = parseDecimalValue(ptax);
                    const valUsd = borrowForm.valueUsd || 0;
                    const feeNum = parseDecimalValue(borrowExtra.feeValueUsd);
                    const totalBrl = ptaxNum ? ((valUsd + feeNum) * ptaxNum).toFixed(2) : "";
                    setBorrowExtra({ ...borrowExtra, ptax, totalValueBrl: totalBrl });
                    setBorrowPtaxError(null);
                  }}
                  className={borrowPtaxError ? "border-amber-500" : ""}
                />
                {borrowPtaxError && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {borrowPtaxError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrow-total-brl">Total Value (BRL)</Label>
                <Input
                  id="borrow-total-brl"
                  type="text"
                  placeholder="0.00"
                  value={borrowExtra.totalValueBrl}
                  disabled
                  className="bg-muted/50"
                />
              </div>
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
