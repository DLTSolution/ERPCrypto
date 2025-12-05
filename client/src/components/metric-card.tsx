import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  change?: number;
  icon?: React.ReactNode;
  variant?: "default" | "gradient" | "neon-purple" | "neon-cyan" | "neon-green";
  className?: string;
  testId?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = "default",
  className,
  testId,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "text-muted-foreground";
    if (change > 0) return "text-emerald-400";
    if (change < 0) return "text-rose-400";
    return "text-muted-foreground";
  };

  const variantStyles = {
    default: "glass",
    gradient: "bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30",
    "neon-purple": "glass neon-glow-purple border-purple-500/30",
    "neon-cyan": "glass neon-glow-cyan border-cyan-500/30",
    "neon-green": "glass neon-glow-green border-emerald-500/30",
  };

  return (
    <Card
      className={cn(
        "card-hover overflow-visible rounded-xl",
        variantStyles[variant],
        className
      )}
      data-testid={testId}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {change !== undefined && (
                <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  <span>{Math.abs(change).toFixed(2)}%</span>
                </div>
              )}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
          {icon && (
            <div className="p-3 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
