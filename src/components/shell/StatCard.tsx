import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: number; // positive = up, negative = down, 0 = neutral
  accentHex: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend, accentHex }: StatCardProps) {
  return (
    <div className="glass-card card-highlight rounded-2xl p-5 hover-lift group relative overflow-hidden border border-border/50">
      {/* Subtle ambient accent glow on hover */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ backgroundColor: accentHex }}
      />

      <div className="flex items-start justify-between relative z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 shadow-2xs transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: accentHex + '18' }}
        >
          <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" style={{ color: accentHex }} />
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
      </div>

      {(sub !== undefined || trend !== undefined) && (
        <div className="mt-2.5 flex items-center gap-2 relative z-10">
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border',
                trend > 0
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400'
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {trend === 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              <Minus className="h-3 w-3" />
              0%
            </span>
          )}
          {sub && (
            <span className="text-xs text-muted-foreground truncate font-medium">
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card card-highlight rounded-2xl p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-9 w-32 rounded-lg" />
      <Skeleton className="mt-2.5 h-4 w-24 rounded-md" />
    </div>
  );
}
