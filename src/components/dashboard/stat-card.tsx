import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  iconClassName,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-5 hover:shadow-md transition-all duration-200 cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            {title}
          </p>
          <p
            className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight leading-tight mb-1 truncate"
            title={String(value)}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
              {subtitle}
            </p>
          )}
          {trend && trendValue && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                trend === "up" && "text-green-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-[var(--muted-foreground)]"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconClassName ?? "bg-coffee-100 text-coffee-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
