import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { DataTable } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { CapitalGainsEntry } from "@shared/schema";

const BRL_THRESHOLD = 35000;
const TAX_RATE = 0.15;

function formatCurrency(value: number, currency: "USD" | "BRL" = "BRL"): string {
  const symbol = currency === "USD" ? "$" : "R$";
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function CapitalGains() {
  const { isAuthenticated, setShowLoginModal } = useAuth();

  const { data: entries, isLoading } = useQuery<CapitalGainsEntry[]>({
    queryKey: ["/api/tax/capital-gains"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your capital gains calculator.
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

  const totalSellVolume = entries?.reduce((sum, e) => sum + e.sellVolumeBrl, 0) || 0;
  const totalTaxDue = entries?.reduce((sum, e) => sum + e.taxDueBrl, 0) || 0;
  const taxableMonths = entries?.filter((e) => e.taxable).length || 0;

  const columns = [
    {
      key: "month",
      header: "Month",
      sortable: true,
      render: (entry: CapitalGainsEntry) => (
        <span className="font-medium">{formatMonth(entry.month)}</span>
      ),
    },
    {
      key: "sellVolumeBrl",
      header: "Sell Volume (BRL)",
      sortable: true,
      className: "text-right",
      render: (entry: CapitalGainsEntry) => (
        <div className="text-right">
          <span className="font-mono">{formatCurrency(entry.sellVolumeBrl)}</span>
          <div className="mt-1">
            <Progress
              value={Math.min((entry.sellVolumeBrl / BRL_THRESHOLD) * 100, 100)}
              className="h-1.5 w-24 ml-auto"
            />
          </div>
        </div>
      ),
    },
    {
      key: "taxable",
      header: "Status",
      render: (entry: CapitalGainsEntry) =>
        entry.taxable ? (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
            <AlertTriangle className="w-3 h-3" />
            Taxable
          </Badge>
        ) : (
          <Badge variant="outline" className="text-emerald-400 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Exempt
          </Badge>
        ),
    },
    {
      key: "taxDueBrl",
      header: "Tax Due (15%)",
      sortable: true,
      className: "text-right",
      render: (entry: CapitalGainsEntry) =>
        entry.taxable ? (
          <span className="font-mono text-rose-400">
            {formatCurrency(entry.taxDueBrl)}
          </span>
        ) : (
          <span className="text-muted-foreground">R$0.00</span>
        ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Capital Gains Calculator
          </h1>
          <p className="text-muted-foreground mt-1">
            Calculate capital gains tax for crypto to fiat sales
          </p>
        </div>
      </div>

      <Card className="glass border-amber-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400">Tax Rule (IN 2991)</p>
              <p className="text-muted-foreground">
                Capital gains tax of 15% applies only to months where total sell volume
                exceeds R$35,000. Tax is calculated on gains from crypto-to-fiat sales only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Sell Volume"
          value={formatCurrency(totalSellVolume)}
          subtitle="Year to date"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
          testId="metric-total-sell"
        />
        <MetricCard
          title="Total Tax Due"
          value={formatCurrency(totalTaxDue)}
          subtitle={`${taxableMonths} taxable month${taxableMonths !== 1 ? "s" : ""}`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          testId="metric-total-tax"
        />
        <MetricCard
          title="Threshold"
          value={formatCurrency(BRL_THRESHOLD)}
          subtitle="Monthly limit before tax"
          icon={<Calculator className="w-5 h-5" />}
          variant="default"
          testId="metric-threshold"
        />
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Monthly Capital Gains</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : entries && entries.length > 0 ? (
            <DataTable
              data={entries}
              columns={columns}
              pageSize={12}
              emptyMessage="No capital gains data"
              testId="table-capital-gains"
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No capital gains data available</p>
              <p className="text-sm">Add sell operations to calculate gains</p>
            </div>
          )}
        </CardContent>
      </Card>

      {entries && entries.some((e) => e.taxable) && (
        <Card className="glass border-rose-500/30 overflow-visible">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Total Tax Liability</p>
                  <p className="text-sm text-muted-foreground">
                    Based on {taxableMonths} taxable month{taxableMonths !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-rose-400 font-mono">
                  {formatCurrency(totalTaxDue)}
                </p>
                <p className="text-sm text-muted-foreground">15% tax rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
