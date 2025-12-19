import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: {
    card: "border-border/50 hover:border-border transition-colors",
    icon: "text-muted-foreground/70",
    gradient: "from-muted/5 to-muted/0",
  },
  primary: {
    card: "border-primary/20 hover:border-primary/40 transition-colors",
    icon: "text-primary",
    gradient: "from-primary/5 to-primary/0",
  },
  success: {
    card: "border-green-500/20 hover:border-green-500/40 transition-colors",
    icon: "text-green-600",
    gradient: "from-green-500/5 to-green-500/0",
  },
  warning: {
    card: "border-orange-500/20 hover:border-orange-500/40 transition-colors",
    icon: "text-orange-600",
    gradient: "from-orange-500/5 to-orange-500/0",
  },
  info: {
    card: "border-blue-500/20 hover:border-blue-500/40 transition-colors",
    icon: "text-blue-600",
    gradient: "from-blue-500/5 to-blue-500/0",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        styles.card
      )}
    >
      {/* Subtle gradient background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          styles.gradient
        )}
      />

      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "rounded-lg bg-background/50 p-2 backdrop-blur-sm",
            styles.icon
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {trend && (
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

