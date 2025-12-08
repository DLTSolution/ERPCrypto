import { useEffect, useMemo, useState, useCallback } from "react";
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
  Download,
  Table,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Collateral, Borrow, InsertCollateral, InsertBorrow, Token } from "@shared/schema";

type BorrowAggregate = {
  asset: string;
  borrowedAmount: number;
  valueUsd: number;
};

type CollateralAggregate = {
  asset: string;
  amount: number;
  valueUsd: number;
};

function aggregateBorrows(borrows: Borrow[]): BorrowAggregate[] {
  const map = new Map<string, { borrowedAmount: number; valueUsd: number }>();

  for (const b of borrows) {
    const asset = (b.asset || "").toUpperCase();
    if (!asset) continue;

    const sign = (b.type || "borrow") === "repay" ? -1 : 1;
    const borrowedAmount = Number(b.borrowedAmount || 0) * sign;
    const valueUsd = Number(b.valueUsd || 0) * sign;

    if (!map.has(asset)) {
      map.set(asset, { borrowedAmount: 0, valueUsd: 0 });
    }
    const agg = map.get(asset)!;
    agg.borrowedAmount += borrowedAmount;
    agg.valueUsd += valueUsd;
  }

  return Array.from(map.entries()).map(([asset, agg]) => ({
    asset,
    borrowedAmount: agg.borrowedAmount,
    valueUsd: agg.valueUsd,
  }));
}

function aggregateCollaterals(collaterals: Collateral[]): CollateralAggregate[] {
  const map = new Map<string, { amount: number; valueUsd: number }>();

  for (const c of collaterals) {
    const asset = (c.asset || "").toUpperCase();
    if (!asset) continue;
    const sign = (c.type || "collateral") === "withdraw" ? -1 : 1;
    const amount = sign * Number(c.amount || 0);
    const valueUsd = sign * Number(c.valueUsd || 0);

    if (!map.has(asset)) {
      map.set(asset, { amount: 0, valueUsd: 0 });
    }
    const agg = map.get(asset)!;
    agg.amount += amount;
    agg.valueUsd += valueUsd;
  }

  return Array.from(map.entries()).map(([asset, agg]) => ({
    asset,
    amount: agg.amount,
    valueUsd: agg.valueUsd,
  }));
}

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
  const [collateralMode, setCollateralMode] = useState<"collateral" | "withdraw">("collateral");
  const [selectedCollateralIdForWithdraw, setSelectedCollateralIdForWithdraw] = useState("");
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [isCollateralExportModalOpen, setIsCollateralExportModalOpen] = useState(false);
  const [collateralExportFrom, setCollateralExportFrom] = useState("");
  const [collateralExportTo, setCollateralExportTo] = useState("");
  const [showLtvBlockBorrow, setShowLtvBlockBorrow] = useState(false);
  const [isCollateralTableOpen, setIsCollateralTableOpen] = useState(false);
  const [collateralToDelete, setCollateralToDelete] = useState<Collateral | null>(null);
  const [isBorrowTableOpen, setIsBorrowTableOpen] = useState(false);
  const [borrowToDelete, setBorrowToDelete] = useState<Borrow | null>(null);

  const { data: collaterals, isLoading: collateralsLoading } = useQuery<Collateral[]>({
    queryKey: ["/api/collaterals"],
    enabled: isAuthenticated,
  });
  const { data: tokens } = useQuery<Token[]>({
    queryKey: ["/api/market/tokens"],
  });

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    tokens?.forEach((t) => map.set(t.symbol.toUpperCase(), t.price));
    return map;
  }, [tokens]);

  const aggregatedCollaterals = useMemo(() => aggregateCollaterals(collaterals || []), [collaterals]);

  const getCollateralUsd = useCallback(
    (agg: CollateralAggregate) => {
      const price = priceMap.get(agg.asset.toUpperCase());
      if (price !== undefined) {
        return (agg.amount || 0) * price;
      }
      return Number(agg.valueUsd || 0);
    },
    [priceMap]
  );

  const withdrawOptions = useMemo(() => {
    const options: Collateral[] = [];
    const positives = aggregatedCollaterals.filter((c) => getCollateralUsd(c) > 0);

    for (const agg of positives) {
      const asset = agg.asset.toUpperCase();
      const original = (collaterals || []).find(
        (c) => (c.type || "collateral") !== "withdraw" && (c.asset || "").toUpperCase() === asset
      );
      if (original) {
        options.push(original);
      }
    }
    return options;
  }, [aggregatedCollaterals, collaterals, getCollateralUsd]);

  const { data: borrows, isLoading: borrowsLoading } = useQuery<Borrow[]>({
    queryKey: ["/api/borrows"],
    enabled: isAuthenticated,
  });
  const aggregatedBorrows = useMemo(() => aggregateBorrows(borrows || []), [borrows]);
  const getBorrowUsd = useCallback(
    (agg: BorrowAggregate) => {
      const price = priceMap.get(agg.asset.toUpperCase());
      const signedAmount = agg.borrowedAmount || 0;
      if (price !== undefined) {
        return signedAmount * price;
      }
      return Number(agg.valueUsd || 0);
    },
    [priceMap]
  );
  const repayOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Borrow[] = [];
    (borrows || [])
      .filter((b) => (b.type || "borrow") !== "repay")
      .forEach((b) => {
        const asset = (b.asset || "").toUpperCase();
        if (!asset || seen.has(asset)) return;
        seen.add(asset);
        options.push(b);
      });
    return options;
  }, [borrows]);

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

  const deleteCollateralMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/collaterals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collaterals"] });
      setIsCollateralTableOpen(true); // keep table open and refreshed
      toast({ title: "Collateral deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete collateral", variant: "destructive" });
    },
  });

  const deleteBorrowMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/borrows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrows"] });
      setIsBorrowTableOpen(true);
      toast({ title: "Borrow deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete borrow", variant: "destructive" });
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

  useEffect(() => {
    if (collateralMode === "withdraw" && !selectedCollateralIdForWithdraw && withdrawOptions.length > 0) {
      setSelectedCollateralIdForWithdraw(withdrawOptions[0].id.toString());
    }
  }, [collateralMode, withdrawOptions, selectedCollateralIdForWithdraw]);

  useEffect(() => {
    if (collateralMode !== "withdraw") return;
    if (!selectedCollateralIdForWithdraw) return;
    const selected = withdrawOptions.find((c) => c.id.toString() === selectedCollateralIdForWithdraw);
    if (selected) {
      setCollateralForm((prev) => ({
        ...prev,
        asset: selected.asset,
        protocol: selected.protocol || prev.protocol,
      }));
    }
  }, [collateralMode, selectedCollateralIdForWithdraw, withdrawOptions]);

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
      const sign = collateralMode === "withdraw" ? -1 : 1;
      const totalBrl = ((collateralForm.valueUsd || 0) + feeNum) * data.rate * sign;
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
    if (borrowMode === "repay" && !selectedBorrowIdForRepay && repayOptions.length > 0) {
      setSelectedBorrowIdForRepay(repayOptions[0].id.toString());
    }
  }, [borrowMode, repayOptions, selectedBorrowIdForRepay]);

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

  const totalCollateral =
    aggregatedCollaterals.reduce((sum, c) => sum + getCollateralUsd(c), 0) || 0;
  const totalBorrowed = aggregatedBorrows.reduce((sum, b) => sum + getBorrowUsd(b), 0);
  const currentLtv = totalCollateral > 0 ? (totalBorrowed / totalCollateral) * 100 : 0;
  const maxLtv = 73;
  const liquidationLtv = 78;
  const blockBorrowLtv = 73;
  const ltvPercent = Math.min(currentLtv, liquidationLtv);
  const ltvColor = currentLtv >= liquidationLtv ? "#ef4444" : currentLtv >= 50 ? "#f97316" : "#10b981";

  const exportBorrowCsv = () => {
    if (!borrows || borrows.length === 0) {
      toast({ title: "No borrows to export", variant: "destructive" });
      return;
    }
    if (!exportFrom || !exportTo) {
      toast({ title: "Select start and end dates to export", variant: "destructive" });
      return;
    }

    const fromDate = new Date(exportFrom);
    const toDate = new Date(exportTo);
    toDate.setHours(23, 59, 59, 999);

    const rows = borrows.filter((b) => {
      if (!b.txDate) return false;
      const d = new Date(b.txDate);
      return !isNaN(d.getTime()) && d >= fromDate && d <= toDate;
    });

    if (rows.length === 0) {
      toast({ title: "No transactions in this range", variant: "destructive" });
      return;
    }

    const headers = ["tx_date", "type", "protocol", "chain", "asset", "value_usd", "ptax", "total_value_brl"];
    const csvLines = [headers.join(",")];

    rows.forEach((b) => {
      const line = [
        b.txDate || "",
        b.type || "borrow",
        b.protocol || "",
        b.chain || "",
        b.asset || "",
        Number(b.valueUsd ?? 0),
        Number(b.ptax ?? 0),
        Number(b.totalValueBrl ?? 0),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      csvLines.push(line.join(","));
    });

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `borrows-${exportFrom}-${exportTo}.csv`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
    toast({ title: "Exported CSV successfully" });
  };

  const exportCollateralCsv = () => {
    if (!collaterals || collaterals.length === 0) {
      toast({ title: "No collaterals to export", variant: "destructive" });
      return;
    }
    if (!collateralExportFrom || !collateralExportTo) {
      toast({ title: "Select start and end dates to export", variant: "destructive" });
      return;
    }

    const fromDate = new Date(collateralExportFrom);
    const toDate = new Date(collateralExportTo);
    toDate.setHours(23, 59, 59, 999);

    const rows = collaterals.filter((c) => {
      if (!c.txDate) return false;
      const d = new Date(c.txDate);
      return !isNaN(d.getTime()) && d >= fromDate && d <= toDate;
    });

    if (rows.length === 0) {
      toast({ title: "No collateral transactions in this range", variant: "destructive" });
      return;
    }

    const headers = ["tx_date", "type", "chain", "protocol", "asset", "value_usd", "ptax", "total_value_brl"];
    const csvLines = [headers.join(",")];

    rows.forEach((c) => {
      const sign = (c.type || "collateral") === "withdraw" ? -1 : 1;
      const line = [
        c.txDate || "",
        c.type || "collateral",
        c.chain || "",
        c.protocol || "",
        c.asset || "",
        sign * Number(c.valueUsd ?? 0),
        Number(c.ptax ?? 0),
        sign * Number(c.totalValueBrl ?? 0),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      csvLines.push(line.join(","));
    });

    const csvContent = csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = `collaterals-${collateralExportFrom}-${collateralExportTo}.csv`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setIsCollateralExportModalOpen(false);
    toast({ title: "Exported CSV successfully" });
  };

  const collateralColumns = [
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: CollateralAggregate) => (
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
      render: (item: CollateralAggregate) => {
        const sign = Math.sign(item.amount || 0);
        return (
          <span className={cn("font-mono", sign < 0 && "text-rose-400")}>
            {Number(item.amount || 0).toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: CollateralAggregate) => {
        const usd = getCollateralUsd(item);
        const sign = Math.sign(usd || 0);
        return (
          <span className={cn("font-mono", sign < 0 && "text-rose-400")}>
            {formatCurrency(usd)}
          </span>
        );
      },
    },
  ];

  const collateralFullColumns = [
    {
      key: "txDate",
      header: "Date",
      sortable: true,
      render: (item: Collateral) => item.txDate || "-",
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item: Collateral) => item.type || "collateral",
    },
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: Collateral) => item.asset || "-",
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (item: Collateral) => {
        const sign = (item.type || "collateral") === "withdraw" ? -1 : 1;
        const amount = sign * Number(item.amount || 0);
        return (
          <span className={cn("font-mono", amount < 0 && "text-rose-400")}>
            {amount.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: Collateral) => {
        const sign = (item.type || "collateral") === "withdraw" ? -1 : 1;
        const value = sign * Number(item.valueUsd || 0);
        return (
          <span className={cn("font-mono", value < 0 && "text-rose-400")}>
            {formatCurrency(value)}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Collateral) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-rose-500"
            onClick={() => {
              if (!item.id) return;
              setCollateralToDelete(item);
            }}
            title="Delete collateral"
            aria-label={`Delete collateral ${item.asset}`}
            data-testid={`button-delete-collateral-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const borrowColumns = [
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: BorrowAggregate) => (
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
      render: (item: BorrowAggregate) => (
        <span className="font-mono">{Number(item.borrowedAmount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: BorrowAggregate) => (
        (() => {
          const usd = getBorrowUsd(item);
          const sign = Math.sign(usd || 0);
          return (
            <span className={cn("font-mono", sign < 0 && "text-rose-400")}>
              {formatCurrency(usd)}
            </span>
          );
        })()
      ),
    },
  ];

  const borrowFullColumns = [
    {
      key: "txDate",
      header: "Date",
      sortable: true,
      render: (item: Borrow) => item.txDate || "-",
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item: Borrow) => item.type || "borrow",
    },
    {
      key: "asset",
      header: "Asset",
      sortable: true,
      render: (item: Borrow) => item.asset || "-",
    },
    {
      key: "borrowedAmount",
      header: "Amount",
      sortable: true,
      render: (item: Borrow) => {
        const sign = (item.type || "borrow") === "repay" ? -1 : 1;
        const amt = sign * Number(item.borrowedAmount || 0);
        return <span className={cn("font-mono", amt < 0 && "text-rose-400")}>{amt.toLocaleString()}</span>;
      },
    },
    {
      key: "valueUsd",
      header: "USD Value",
      sortable: true,
      render: (item: Borrow) => {
        const sign = (item.type || "borrow") === "repay" ? -1 : 1;
        const val = sign * Number(item.valueUsd || 0);
        return <span className={cn("font-mono", val < 0 && "text-rose-400")}>{formatCurrency(val)}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Borrow) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-rose-500"
            onClick={() => {
              if (!item.id) return;
              setBorrowToDelete(item);
            }}
            title="Delete borrow"
            aria-label={`Delete borrow ${item.asset}`}
            data-testid={`button-delete-borrow-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
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
          variant="default"
          testId="metric-total-collateral"
        />
        <MetricCard
          title="Total Borrowed"
          value={formatCurrency(totalBorrowed)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          testId="metric-total-borrowed"
        />
        <Card className="glass card-hover relative overflow-hidden rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Current LTV</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Loan to value based on your collateral
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-full text-white flex items-center justify-center text-xs font-semibold shadow-lg"
                style={{ backgroundColor: ltvColor }}
              >
                {currentLtv.toFixed(1)}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">{currentLtv.toFixed(2)}%</span>
              <span className="text-muted-foreground">Max {maxLtv.toFixed(2)}%</span>
            </div>
            <div className="relative pt-1">
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(ltvPercent, 100)}%`,
                    backgroundColor: ltvColor,
                  }}
                />
              </div>
              <div
                className="absolute -top-2 h-3 w-3 rounded-full bg-white"
                style={{
                  left: `${Math.min(ltvPercent, 100)}%`,
                  border: `1px solid ${ltvColor}`,
                }}
              />
              <div
                className="absolute inset-y-0 w-px bg-rose-500"
                style={{ left: `${liquidationLtv}%` }}
              />
              <div
                className="absolute text-rose-500 text-[10px] font-semibold leading-tight"
                style={{ left: `${liquidationLtv}%`, top: "12px", transform: "translateX(-50%)" }}
              >
                {liquidationLtv.toFixed(2)}%
                <br />
                Liquidation
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg">Collateral</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCollateralMode("collateral");
                  setCollateralForm({
                    protocol: "",
                    asset: "",
                    amount: 0,
                    valueUsd: 0,
                  });
                  setCollateralExtra({
                    date: new Date().toISOString().split("T")[0],
                    chain: "",
                    hash: "",
                    feeToken: "",
                    feeAmount: "",
                    feeValueUsd: "",
                    ptax: "",
                    totalValueBrl: "",
                  });
                  setCollateralAmountInput("");
                  setCollateralValueUsdInput("");
                  setSelectedCollateralIdForWithdraw("");
                  setIsCollateralModalOpen(true);
                }}
                className="gap-1"
                data-testid="button-add-collateral"
              >
                <Plus className="w-4 h-4" />
                Supply
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                type="button"
                data-testid="button-withdraw-collateral"
                onClick={() => {
                  if (!withdrawOptions || withdrawOptions.length === 0) {
                    toast({ title: "Add a collateral before withdrawing", variant: "destructive" });
                    return;
                  }
                  setCollateralMode("withdraw");
                  setCollateralForm({
                    protocol: "",
                    asset: "",
                    amount: 0,
                    valueUsd: 0,
                  });
                  setCollateralExtra({
                    date: new Date().toISOString().split("T")[0],
                    chain: "",
                    hash: "",
                    feeToken: "",
                    feeAmount: "",
                    feeValueUsd: "",
                    ptax: "",
                    totalValueBrl: "",
                  });
                  setCollateralAmountInput("");
                  setCollateralValueUsdInput("");
                  setSelectedCollateralIdForWithdraw("");
                  setIsCollateralModalOpen(true);
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Withdraw
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                type="button"
                data-testid="button-table-collateral"
                onClick={() => setIsCollateralTableOpen(true)}
              >
                <Table className="w-4 h-4" />
                Table
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCollateralExportModalOpen(true)}
                className="gap-1"
                data-testid="button-export-collaterals"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {collateralsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : aggregatedCollaterals && aggregatedCollaterals.length > 0 ? (
              <DataTable
                data={aggregatedCollaterals.filter((c) => getCollateralUsd(c) !== 0)}
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
                variant="outline"
                className="gap-1"
                onClick={() => {
                  if (currentLtv >= blockBorrowLtv) {
                    setShowLtvBlockBorrow(true);
                    return;
                  }
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
                data-testid="button-add-borrow"
              >
                <Plus className="w-4 h-4" />
                Borrow
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
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
                variant="outline"
                className="gap-1"
                type="button"
                data-testid="button-table-borrow"
                onClick={() => setIsBorrowTableOpen(true)}
              >
                <Table className="w-4 h-4" />
                Table
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setIsExportModalOpen(true)}
                data-testid="button-export-borrows"
              >
                <Download className="w-4 h-4" />
                Export
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
            ) : aggregatedBorrows && aggregatedBorrows.length > 0 ? (
              <DataTable
                data={aggregatedBorrows}
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
            <DialogTitle>{collateralMode === "withdraw" ? "Withdraw Collateral" : "Add Collateral"}</DialogTitle>
            <DialogDescription>
              {collateralMode === "withdraw"
                ? "Log a withdrawal to reduce your collateral"
                : "Add a new collateral position"}
            </DialogDescription>
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
                type: collateralMode,
                parentCollateralId:
                  collateralMode === "withdraw" && selectedCollateralIdForWithdraw
                    ? parseInt(selectedCollateralIdForWithdraw, 10)
                    : null,
              };
              createCollateralMutation.mutate(payload);
            }}
            className="space-y-4"
          >
            {collateralMode === "withdraw" && (
              <div className="space-y-2">
                <Label htmlFor="collateral-parent">Withdrawing Collateral</Label>
                <Select
                  value={selectedCollateralIdForWithdraw}
                  onValueChange={setSelectedCollateralIdForWithdraw}
                  disabled={withdrawOptions.length === 0}
                >
                  <SelectTrigger id="collateral-parent">
                    <SelectValue placeholder="Select collateral to withdraw" />
                  </SelectTrigger>
                  <SelectContent>
                    {withdrawOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.asset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                disabled={collateralMode === "withdraw"}
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
                    const sign = collateralMode === "withdraw" ? -1 : 1;
                    const totalBrl = ptax ? ((val + feeUsd) * ptax * sign).toFixed(2) : "";
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
                      const sign = collateralMode === "withdraw" ? -1 : 1;
                      const totalBrl = ptax ? ((valUsd + feeNum) * ptax * sign).toFixed(2) : "";
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
                    const sign = collateralMode === "withdraw" ? -1 : 1;
                    const totalBrl = ptaxNum ? ((valUsd + feeNum) * ptaxNum * sign).toFixed(2) : "";
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
                {collateralMode === "withdraw" ? "Withdraw" : "Add Collateral"}
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
                  disabled={repayOptions.length === 0}
                >
                  <SelectTrigger id="borrow-parent">
                    <SelectValue placeholder="Select borrow to repay" />
                  </SelectTrigger>
                  <SelectContent>
                    {repayOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.asset}
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

      <Dialog open={isCollateralExportModalOpen} onOpenChange={setIsCollateralExportModalOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Collateral History</DialogTitle>
            <DialogDescription>Select the period to export as CSV</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collateral-export-from">From</Label>
              <Input
                id="collateral-export-from"
                type="date"
                value={collateralExportFrom}
                onChange={(e) => setCollateralExportFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collateral-export-to">To</Label>
              <Input
                id="collateral-export-to"
                type="date"
                value={collateralExportTo}
                onChange={(e) => setCollateralExportTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCollateralExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={exportCollateralCsv} className="bg-gradient-to-r from-purple-500 to-cyan-500">
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCollateralTableOpen} onOpenChange={setIsCollateralTableOpen}>
        <DialogContent className="max-w-4xl glass-strong">
          <DialogHeader>
            <DialogTitle>Collateral Operations</DialogTitle>
            <DialogDescription>Full list of collateral entries from Supabase</DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {collateralsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <DataTable
                data={collaterals || []}
                columns={collateralFullColumns}
                pageSize={10}
                emptyMessage="No collateral entries"
              />
            )}
          </div>
          <DialogFooter className="justify-end">
            <Button variant="outline" onClick={() => setIsCollateralTableOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Borrow History</DialogTitle>
            <DialogDescription>Select the period to export as CSV</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-from">From</Label>
              <Input
                id="export-from"
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-to">To</Label>
              <Input
                id="export-to"
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={exportBorrowCsv} className="bg-gradient-to-r from-purple-500 to-cyan-500">
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showLtvBlockBorrow} onOpenChange={setShowLtvBlockBorrow}>
        <DialogContent className="max-w-md text-center glass-strong">
          <DialogHeader>
            <DialogTitle className="text-lg">Borrow Blocked</DialogTitle>
            <DialogDescription>
              Loan health is compromised (LTV ≥ {blockBorrowLtv}%). Amortize your debt before adding a new borrow.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <div className="text-2xl font-bold text-rose-500">{currentLtv.toFixed(2)}%</div>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setShowLtvBlockBorrow(false)} className="bg-gradient-to-r from-purple-500 to-cyan-500">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!collateralToDelete} onOpenChange={() => setCollateralToDelete(null)}>
        <DialogContent className="max-w-sm glass-strong">
          <DialogHeader>
            <DialogTitle>Delete collateral entry?</DialogTitle>
            <DialogDescription>
              This will remove the selected collateral operation permanently.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm">
            {collateralToDelete ? (
              <div className="space-y-1 text-left">
                <div className="font-medium">{collateralToDelete.asset}</div>
                <div className="text-muted-foreground text-xs">
                  Date: {collateralToDelete.txDate || "-"} · Amount: {collateralToDelete.amount?.toString() || 0} · USD: {formatCurrency(Number(collateralToDelete.valueUsd || 0))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="justify-end">
            <Button variant="outline" onClick={() => setCollateralToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!collateralToDelete?.id) return;
                deleteCollateralMutation.mutate(collateralToDelete.id);
                setCollateralToDelete(null);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isBorrowTableOpen} onOpenChange={setIsBorrowTableOpen}>
        <DialogContent className="max-w-4xl glass-strong">
          <DialogHeader>
            <DialogTitle>Borrow Operations</DialogTitle>
            <DialogDescription>Full list of borrow entries from Supabase</DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {borrowsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <DataTable
                data={borrows || []}
                columns={borrowFullColumns}
                pageSize={10}
                emptyMessage="No borrow entries"
              />
            )}
          </div>
          <DialogFooter className="justify-end">
            <Button variant="outline" onClick={() => setIsBorrowTableOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!borrowToDelete} onOpenChange={() => setBorrowToDelete(null)}>
        <DialogContent className="max-w-sm glass-strong">
          <DialogHeader>
            <DialogTitle>Delete borrow entry?</DialogTitle>
            <DialogDescription>This will remove the selected borrow operation permanently.</DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm">
            {borrowToDelete ? (
              <div className="space-y-1 text-left">
                <div className="font-medium">{borrowToDelete.asset}</div>
                <div className="text-muted-foreground text-xs">
                  Date: {borrowToDelete.txDate || "-"} · Amount: {borrowToDelete.borrowedAmount?.toString() || 0} · USD: {formatCurrency(Number(borrowToDelete.valueUsd || 0))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="justify-end">
            <Button variant="outline" onClick={() => setBorrowToDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!borrowToDelete?.id) return;
                deleteBorrowMutation.mutate(borrowToDelete.id);
                setBorrowToDelete(null);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
