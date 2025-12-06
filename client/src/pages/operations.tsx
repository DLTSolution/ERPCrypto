import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/data-table";
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
import {
  ArrowLeftRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Import,
  Users,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Operation, InsertOperation, Wallet } from "@shared/schema";

const OPERATION_TYPES = [
  { value: "buy", label: "Buy", icon: ShoppingCart, color: "text-emerald-400" },
  { value: "sell", label: "Sell", icon: DollarSign, color: "text-rose-400" },
  { value: "swap", label: "Swap", icon: RefreshCw, color: "text-cyan-400" },
  { value: "transfer_in", label: "Transfer In", icon: ArrowDownLeft, color: "text-purple-400" },
  { value: "transfer_out", label: "Transfer Out", icon: ArrowUpRight, color: "text-amber-400" },
  { value: "p2p_in", label: "P2P In", icon: Users, color: "text-emerald-500" },
  { value: "p2p_out", label: "P2P Out", icon: Users, color: "text-rose-500" },
  { value: "payments", label: "Payments", icon: CreditCard, color: "text-blue-400" },
  { value: "lost_funds", label: "Lost Funds", icon: AlertTriangle, color: "text-rose-500" },
];

function formatCurrency(value: number, currency: "USD" | "BRL" = "USD"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeDecimal(value: string): string {
  return value.replace(",", ".");
}

function parseDecimalInput(value: string, fallback: number = 0): number {
  const normalized = normalizeDecimal(value);
  if (normalized === "" || normalized === ".") return fallback;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? fallback : parsed;
}

function parseDecimalInputNullable(value: string): number | null {
  const normalized = normalizeDecimal(value);
  if (normalized === "" || normalized === ".") return null;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

export default function Operations() {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    type: string;
    chain: string;
    hash: string;
    date: string;
    tokenIn: string;
    amountIn: number | null;
    tokenOut: string;
    amountOut: number | null;
    priceUsd: number;
    valueUsd: number;
    feeToken: string;
    amountFee: number;
    feeValueUsd: number;
    ptax: number;
    totalValueBrl: number;
    walletFrom: string;
    walletTo: string;
    description: string;
  }>({
    type: "buy",
    chain: "",
    hash: "",
    date: new Date().toISOString().split("T")[0],
    tokenIn: "",
    amountIn: null,
    tokenOut: "",
    amountOut: null,
    priceUsd: 0,
    valueUsd: 0,
    feeToken: "",
    amountFee: 0,
    feeValueUsd: 0,
    ptax: 0,
    totalValueBrl: 0,
    walletFrom: "",
    walletTo: "",
    description: "",
  });

  const { data: operations, isLoading } = useQuery<Operation[]>({
    queryKey: ["/api/operations"],
    enabled: isAuthenticated,
  });

  const { data: wallets } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertOperation) => apiRequest("POST", "/api/operations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations"] });
      toast({ title: "Operation recorded successfully" });
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to record operation", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "buy",
      chain: "",
      hash: "",
      date: new Date().toISOString().split("T")[0],
      tokenIn: "",
      amountIn: null,
      tokenOut: "",
      amountOut: null,
      priceUsd: 0,
      valueUsd: 0,
      feeToken: "",
      amountFee: 0,
      feeValueUsd: 0,
      ptax: 0,
      totalValueBrl: 0,
      walletFrom: "",
      walletTo: "",
      description: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formatAmount = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      return parseFloat(value.toFixed(8));
    };
    
    const formatPrice = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      return parseFloat(value.toFixed(2));
    };
    
    const formatPtax = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      return parseFloat(value.toFixed(4));
    };
    
    const submitData: InsertOperation = {
      type: formData.type,
      chain: formData.chain || null,
      hash: formData.hash || null,
      date: formData.date,
      tokenIn: formData.tokenIn ? formData.tokenIn.toUpperCase() : null,
      amountIn: formatAmount(formData.amountIn),
      tokenOut: formData.tokenOut ? formData.tokenOut.toUpperCase() : null,
      amountOut: formatAmount(formData.amountOut),
      priceUsd: formatPrice(formData.priceUsd),
      valueUsd: formatPrice(formData.valueUsd) ?? 0,
      feeToken: formData.feeToken ? formData.feeToken.toUpperCase() : null,
      amountFee: formatAmount(formData.amountFee),
      feeValueUsd: formatPrice(formData.feeValueUsd),
      ptax: formatPtax(formData.ptax),
      totalValueBrl: formatPrice(formData.totalValueBrl) ?? 0,
      details: {
        walletFrom: formData.walletFrom || null,
        walletTo: formData.walletTo || null,
        description: formData.description || null,
      },
    };
    
    createMutation.mutate(submitData);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <ArrowLeftRight className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your operations registry.
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

  const getOperationType = (type: string) => {
    return OPERATION_TYPES.find((t) => t.value === type) || OPERATION_TYPES[0];
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (op: Operation) => (
        <span className="text-muted-foreground">{formatDate(op.date)}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (op: Operation) => {
        const opType = getOperationType(op.type);
        const Icon = opType.icon;
        return (
          <Badge variant="outline" className={`gap-1 ${opType.color}`}>
            <Icon className="w-3 h-3" />
            {opType.label}
          </Badge>
        );
      },
    },
    {
      key: "tokens",
      header: "Tokens",
      render: (op: Operation) => (
        <div className="flex items-center gap-2">
          {op.tokenOut && (
            <span className="text-rose-400">
              -{op.amountOut?.toLocaleString()} {op.tokenOut}
            </span>
          )}
          {op.tokenOut && op.tokenIn && (
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          )}
          {op.tokenIn && (
            <span className="text-emerald-400">
              +{op.amountIn?.toLocaleString()} {op.tokenIn}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "valueUsd",
      header: "Value (USD)",
      sortable: true,
      className: "text-right",
      render: (op: Operation) => (
        <span className="font-mono">{formatCurrency(op.valueUsd)}</span>
      ),
    },
    {
      key: "totalValueBrl",
      header: "Value (BRL)",
      sortable: true,
      className: "text-right",
      render: (op: Operation) => (
        <span className="font-mono text-muted-foreground">
          {formatCurrency(op.totalValueBrl, "BRL")}
        </span>
      ),
    },
    {
      key: "transferType",
      header: "Transfer",
      render: (op: Operation) => {
        const details = (op.details as { transferType?: string }) || {};
        return details.transferType ? (
          <Badge
            variant="outline"
            className={
              details.transferType === "internal"
                ? "text-cyan-400"
                : "text-amber-400"
            }
          >
            {details.transferType}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
  ];

  const needsTokenOut = ["sell", "swap", "transfer_out", "p2p_out", "payments", "lost_funds"].includes(formData.type || "");
  const needsTokenIn = ["buy", "swap", "transfer_in", "p2p_in"].includes(formData.type || "");
  const needsWallets = ["transfer_in", "transfer_out"].includes(formData.type || "");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Operations Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Record and track all your crypto operations
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2 bg-gradient-to-r from-purple-500 to-cyan-500"
          data-testid="button-add-operation"
        >
          <Plus className="w-4 h-4" />
          Add Operation
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {OPERATION_TYPES.map((type) => {
          const count = operations?.filter((o) => o.type === type.value).length || 0;
          const Icon = type.icon;
          return (
            <Badge
              key={type.value}
              variant="outline"
              className={`gap-1.5 ${type.color}`}
            >
              <Icon className="w-3 h-3" />
              {type.label}: {count}
            </Badge>
          );
        })}
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">All Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : operations && operations.length > 0 ? (
            <DataTable
              data={operations}
              columns={columns}
              searchKey="type"
              searchPlaceholder="Search by type..."
              emptyMessage="No operations found"
              testId="table-operations"
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No operations recorded yet</p>
              <p className="text-sm">Click "Add Operation" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-strong max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Operation</DialogTitle>
            <DialogDescription>Record a new crypto operation</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Operation Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v as InsertOperation["type"] })
                }
              >
                <SelectTrigger data-testid="select-operation-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hash">Transaction Hash (optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.chain || ""}
                  onValueChange={(v) => setFormData({ ...formData, chain: v })}
                >
                  <SelectTrigger className="w-[140px]" data-testid="select-chain">
                    <SelectValue placeholder="Chain" />
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
                <Input
                  id="hash"
                  placeholder="0x..."
                  value={formData.hash || ""}
                  onChange={(e) => setFormData({ ...formData, hash: e.target.value })}
                  className="font-mono text-sm flex-1"
                  data-testid="input-hash"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  title="Import data from hash (coming soon)"
                  data-testid="button-import-hash"
                >
                  <Import className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                data-testid="input-date"
                required
              />
            </div>

            {/* BUY: Token In, Amount In, Price USD, Value USD */}
            {formData.type === "buy" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenIn">Token In</Label>
                    <Input
                      id="tokenIn"
                      placeholder="e.g., BTC"
                      value={formData.tokenIn || ""}
                      onChange={(e) => setFormData({ ...formData, tokenIn: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-in"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountIn">Amount In</Label>
                    <Input
                      id="amountIn"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountIn ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountIn: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-in"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* SELL: Token Out, Amount Out, Price USD, Value USD, Fee, PTAX, BRL */}
            {formData.type === "sell" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenOut">Token Out</Label>
                    <Input
                      id="tokenOut"
                      placeholder="e.g., BTC"
                      value={formData.tokenOut || ""}
                      onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-out"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountOut">Amount Out</Label>
                    <Input
                      id="amountOut"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountOut ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountOut: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-out"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* TRANSFER IN: Same as Buy model + Wallets */}
            {formData.type === "transfer_in" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenIn">Token In</Label>
                    <Input
                      id="tokenIn"
                      placeholder="e.g., BTC"
                      value={formData.tokenIn || ""}
                      onChange={(e) => setFormData({ ...formData, tokenIn: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-in"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountIn">Amount In</Label>
                    <Input
                      id="amountIn"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountIn ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountIn: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-in"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
                {wallets && wallets.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wallet From</Label>
                      <Select
                        value={formData.walletFrom || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletFrom: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-from">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Wallet To</Label>
                      <Select
                        value={formData.walletTo || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletTo: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-to">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TRANSFER OUT: Same as Sell model + Wallets */}
            {formData.type === "transfer_out" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenOut">Token Out</Label>
                    <Input
                      id="tokenOut"
                      placeholder="e.g., BTC"
                      value={formData.tokenOut || ""}
                      onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-out"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountOut">Amount Out</Label>
                    <Input
                      id="amountOut"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountOut ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountOut: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-out"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
                {wallets && wallets.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wallet From</Label>
                      <Select
                        value={formData.walletFrom || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletFrom: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-from">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Wallet To</Label>
                      <Select
                        value={formData.walletTo || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletTo: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-to">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PAYMENTS: Same as Sell model */}
            {formData.type === "payments" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenOut">Token Out</Label>
                    <Input
                      id="tokenOut"
                      placeholder="e.g., BTC"
                      value={formData.tokenOut || ""}
                      onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-out"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountOut">Amount Out</Label>
                    <Input
                      id="amountOut"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountOut ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountOut: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-out"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* LOST FUNDS: Same as Sell model */}
            {formData.type === "lost_funds" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenOut">Token Out</Label>
                    <Input
                      id="tokenOut"
                      placeholder="e.g., BTC"
                      value={formData.tokenOut || ""}
                      onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value.toUpperCase() })}
                      className="uppercase"
                      data-testid="input-token-out"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountOut">Amount Out</Label>
                    <Input
                      id="amountOut"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00000000"
                      value={formData.amountOut ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, amountOut: parseDecimalInputNullable(e.target.value) })
                      }
                      data-testid="input-amount-out"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      id="priceUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.priceUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, priceUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-price-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueUsd">Value (USD)</Label>
                    <Input
                      id="valueUsd"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.valueUsd || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-usd"
                      required
                    />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* OTHER TYPES: swap, p2p_in, p2p_out */}
            {!["buy", "sell", "transfer_in", "transfer_out", "payments", "lost_funds"].includes(formData.type || "") && (
              <>
                {needsTokenOut && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tokenOut">Token Out</Label>
                      <Input
                        id="tokenOut"
                        placeholder="e.g., BTC"
                        value={formData.tokenOut || ""}
                        onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-token-out"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountOut">Amount Out</Label>
                      <Input
                        id="amountOut"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountOut ?? ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountOut: parseDecimalInputNullable(e.target.value) })
                        }
                        data-testid="input-amount-out"
                      />
                    </div>
                  </div>
                )}

                {needsTokenIn && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tokenIn">Token In</Label>
                      <Input
                        id="tokenIn"
                        placeholder="e.g., ETH"
                        value={formData.tokenIn || ""}
                        onChange={(e) => setFormData({ ...formData, tokenIn: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-token-in"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountIn">Amount In</Label>
                      <Input
                        id="amountIn"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountIn ?? ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountIn: parseDecimalInputNullable(e.target.value) })
                        }
                        data-testid="input-amount-in"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="valueUsd">Value (USD)</Label>
                  <Input
                    id="valueUsd"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formData.valueUsd || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, valueUsd: parseDecimalInput(e.target.value) })
                    }
                    data-testid="input-value-usd"
                    required
                  />
                </div>

                <div className="border-t border-border/50 pt-4 mt-4">
                  <Label className="text-sm text-muted-foreground mb-3 block">Transaction Fee</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feeToken">Fee Token</Label>
                      <Input
                        id="feeToken"
                        placeholder="e.g., ETH"
                        value={formData.feeToken || ""}
                        onChange={(e) => setFormData({ ...formData, feeToken: e.target.value.toUpperCase() })}
                        className="uppercase"
                        data-testid="input-fee-token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountFee">Amount Fee</Label>
                      <Input
                        id="amountFee"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00000000"
                        value={formData.amountFee || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, amountFee: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-amount-fee"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feeValueUsd">Fee Value (USD)</Label>
                      <Input
                        id="feeValueUsd"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formData.feeValueUsd || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, feeValueUsd: parseDecimalInput(e.target.value) })
                        }
                        data-testid="input-fee-value-usd"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ptax">PTAX</Label>
                    <Input
                      id="ptax"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0000"
                      value={formData.ptax || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, ptax: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-ptax"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueBrl">Total Value (BRL)</Label>
                    <Input
                      id="valueBrl"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formData.totalValueBrl || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, totalValueBrl: parseDecimalInput(e.target.value) })
                      }
                      data-testid="input-value-brl"
                      required
                    />
                  </div>
                </div>

                {needsWallets && wallets && wallets.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Wallet From</Label>
                      <Select
                        value={formData.walletFrom || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletFrom: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-from">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Wallet To</Label>
                      <Select
                        value={formData.walletTo || "external"}
                        onValueChange={(v) => setFormData({ ...formData, walletTo: v === "external" ? "" : v })}
                      >
                        <SelectTrigger data-testid="select-wallet-to">
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External</SelectItem>
                          {wallets.map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Add notes..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                disabled={createMutation.isPending}
                data-testid="button-submit-operation"
              >
                Record Operation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
