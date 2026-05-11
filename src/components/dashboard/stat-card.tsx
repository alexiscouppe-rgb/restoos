import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "orange" | "yellow" | "green" | "red" | "purple";
  trend?: string;
  trendUp?: boolean;
  urgent?: boolean;
  subtitle?: string;
}

const colorMap = {
  blue:   { icon: "text-blue-500",    bg: "bg-blue-500/10",    ring: "ring-blue-500/20",    trend: "text-blue-600"    },
  orange: { icon: "text-orange-500",  bg: "bg-orange-500/10",  ring: "ring-orange-500/20",  trend: "text-orange-600"  },
  yellow: { icon: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/20",   trend: "text-amber-600"   },
  green:  { icon: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", trend: "text-emerald-600" },
  red:    { icon: "text-red-500",     bg: "bg-red-500/10",     ring: "ring-red-500/20",     trend: "text-red-600"     },
  purple: { icon: "text-violet-500",  bg: "bg-violet-500/10",  ring: "ring-violet-500/20",  trend: "text-violet-600"  },
};

export function StatCard({ title, value, icon: Icon, color, trend, trendUp, urgent, subtitle }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={cn(
      "stat-card animate-fade-up cursor-default select-none",
      urgent && "border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/20"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Icon */}
        <div className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1",
          c.bg, c.ring
        )}>
          <Icon className={cn("h-4.5 w-4.5", c.icon)} strokeWidth={2} />
        </div>

        {/* Trend badge */}
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
            trendUp === false
              ? "bg-red-500/10 text-red-600"
              : "bg-emerald-500/10 text-emerald-600"
          )}>
            {trendUp !== false ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-1 leading-tight">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
        )}
      </div>

      {urgent && (
        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-orange-500 animate-pulse-soft" />
      )}
    </div>
  );
}
