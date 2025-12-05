import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { LoginModal } from "@/components/login-modal";
import NotFound from "@/pages/not-found";
import Market from "@/pages/market";
import PoolsMonitor from "@/pages/pools-monitor";
import Charts from "@/pages/charts";
import Wallets from "@/pages/wallets";
import UserPools from "@/pages/user-pools";
import BorrowLend from "@/pages/borrow-lend";
import Operations from "@/pages/operations";
import TaxReport from "@/pages/tax-report";
import CapitalGains from "@/pages/capital-gains";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/market" />
      </Route>
      <Route path="/market" component={Market} />
      <Route path="/tools/pools-monitor" component={PoolsMonitor} />
      <Route path="/tools/charts" component={Charts} />
      <Route path="/wallets" component={Wallets} />
      <Route path="/pools/user-pools" component={UserPools} />
      <Route path="/borrow-lend" component={BorrowLend} />
      <Route path="/operations" component={Operations} />
      <Route path="/tax/report" component={TaxReport} />
      <Route path="/tax/gain-loss" component={CapitalGains} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
            <LoginModal />
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
