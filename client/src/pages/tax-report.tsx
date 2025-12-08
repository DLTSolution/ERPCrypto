import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { DataTable } from "@/components/data-table";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Download,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileJson,
  File,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TaxReportEntry } from "@shared/schema";

const BRL_THRESHOLD = 35000;

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

function groupByMonth(entries: TaxReportEntry[]): Record<string, TaxReportEntry[]> {
  return entries.reduce((acc, entry) => {
    const month = entry.date.substring(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {} as Record<string, TaxReportEntry[]>);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function TaxReport() {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery<TaxReportEntry[]>({
    queryKey: ["/api/tax/report"],
    enabled: isAuthenticated,
  });

  const handleExportPDF = () => {
    toast({ title: "Generating PDF...", description: "This is a mock export." });
  };

  const handleExportJSON = () => {
    if (!entries) return;
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tax_report_in2991.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON exported successfully" });
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your fiscal report.
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

  const totalUsd = entries?.reduce((sum, e) => sum + e.valueUsd, 0) || 0;
  const totalBrl = entries?.reduce((sum, e) => sum + e.valueBrl, 0) || 0;
  const groupedByMonth = entries ? groupByMonth(entries) : {};
  const monthsAboveThreshold = Object.entries(groupedByMonth).filter(
    ([_, items]) => items.reduce((sum, e) => sum + e.valueBrl, 0) > BRL_THRESHOLD
  ).length;

  const columns = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (entry: TaxReportEntry) => (
        <span className="text-muted-foreground">{formatDate(entry.date)}</span>
      ),
    },
    {
      key: "operationType",
      header: "Type",
      sortable: true,
      render: (entry: TaxReportEntry) => (
        <Badge variant="outline" className="capitalize">
          {entry.operationType.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (entry: TaxReportEntry) => (
        <span className="text-sm">{entry.description}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (entry: TaxReportEntry) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {entry.source.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "valueUsd",
      header: "USD",
      sortable: true,
      className: "text-right",
      render: (entry: TaxReportEntry) => (
        <span className="font-mono">{formatCurrency(entry.valueUsd)}</span>
      ),
    },
    {
      key: "valueBrl",
      header: "BRL",
      sortable: true,
      className: "text-right",
      render: (entry: TaxReportEntry) => (
        <span className="font-mono">{formatCurrency(entry.valueBrl, "BRL")}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Fiscal Report - IN 2991
          </h1>
          <p className="text-muted-foreground mt-1">
            Consolidated fiscal extract for tax reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="gap-2"
            data-testid="button-export-pdf"
          >
            <File className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
            className="gap-2"
            data-testid="button-export-json"
          >
            <FileJson className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total USD Value"
          value={formatCurrency(totalUsd)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          testId="metric-total-usd"
        />
        <MetricCard
          title="Total BRL Value"
          value={formatCurrency(totalBrl, "BRL")}
          icon={<DollarSign className="w-5 h-5" />}
          variant="default"
          testId="metric-total-brl"
        />
        <MetricCard
          title="Months Above R$35k"
          value={monthsAboveThreshold.toString()}
          subtitle={monthsAboveThreshold > 0 ? "Tax reporting required" : "No tax due"}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="default"
          testId="metric-months-above"
        />
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : Object.keys(groupedByMonth).length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(groupedByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, items]) => {
                  const monthTotalBrl = items.reduce((sum, e) => sum + e.valueBrl, 0);
                  const isAboveThreshold = monthTotalBrl > BRL_THRESHOLD;

                  return (
                    <AccordionItem
                      key={month}
                      value={month}
                      className="border border-border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{formatMonth(month)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {items.length} entries
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono">
                              {formatCurrency(monthTotalBrl, "BRL")}
                            </span>
                            {isAboveThreshold && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Above R$35k
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <DataTable
                          data={items}
                          columns={columns}
                          pageSize={5}
                          testId={`table-month-${month}`}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tax report entries found</p>
              <p className="text-sm">Add operations, pools, or borrows to generate report</p>
            </div>
          )}
        </CardContent>
      </Card>

      {entries && entries.length > 0 && (
        <Card className="glass overflow-visible">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">All Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={entries}
              columns={columns}
              searchKey="description"
              searchPlaceholder="Search entries..."
              pageSize={10}
              testId="table-all-entries"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
