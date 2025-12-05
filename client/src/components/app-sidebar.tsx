import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import dltLogo from "@assets/nowlogo512_1764941820446.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Waves,
  CandlestickChart,
  Wallet,
  ArrowLeftRight,
  Landmark,
  Layers,
  FileText,
  Calculator,
  Lock,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  url: string;
  icon: typeof BarChart3;
  protected?: boolean;
}

const publicItems: NavItem[] = [
  {
    title: "Market Overview",
    url: "/market",
    icon: BarChart3,
  },
  {
    title: "Pools Monitor",
    url: "/tools/pools-monitor",
    icon: Waves,
  },
  {
    title: "Charts",
    url: "/tools/charts",
    icon: CandlestickChart,
  },
];

const protectedItems: NavItem[] = [
  {
    title: "Wallets",
    url: "/wallets",
    icon: Wallet,
    protected: true,
  },
  {
    title: "Operations",
    url: "/operations",
    icon: ArrowLeftRight,
    protected: true,
  },
  {
    title: "Borrow & Lend",
    url: "/borrow-lend",
    icon: Landmark,
    protected: true,
  },
  {
    title: "User Pools",
    url: "/pools/user-pools",
    icon: Layers,
    protected: true,
  },
  {
    title: "Fiscal Report",
    url: "/tax/report",
    icon: FileText,
    protected: true,
  },
  {
    title: "Capital Gains",
    url: "/tax/gain-loss",
    icon: Calculator,
    protected: true,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isAuthenticated, setShowLoginModal, logout, user } = useAuth();

  const handleProtectedClick = (e: React.MouseEvent, isProtected?: boolean) => {
    if (isProtected && !isAuthenticated) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/market">
          <div className="flex items-center gap-3 cursor-pointer group">
            <img 
              src={dltLogo} 
              alt="DLT Solution" 
              className="w-10 h-10 rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold gradient-text" data-testid="text-logo">
                DLT Solution
              </h1>
              <p className="text-xs text-muted-foreground">DLT - DeFi Dashboard</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Public Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="w-full"
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace(/\//g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 flex items-center gap-2">
            Protected Tools
            {!isAuthenticated && (
              <Badge variant="outline" className="text-xs py-0 px-1.5">
                <Lock className="w-2.5 h-2.5 mr-1" />
                Login
              </Badge>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {protectedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className={`w-full ${!isAuthenticated ? "opacity-60" : ""}`}
                  >
                    <Link
                      href={isAuthenticated ? item.url : "#"}
                      onClick={(e) => handleProtectedClick(e, item.protected)}
                      data-testid={`nav-${item.url.replace(/\//g, "-")}`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {!isAuthenticated && (
                        <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-username">
                  {user?.username}
                </p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500"
            data-testid="button-login-sidebar"
          >
            <User className="w-4 h-4 mr-2" />
            Login / Connect
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
