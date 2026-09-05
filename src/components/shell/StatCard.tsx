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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: accentHex + '18' }}
        >
          <Icon className="h-4 w-4" style={{ color: accentHex }} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {(sub !== undefined || trend !== undefined) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend !== undefined && trend !== 0 && (
            <>
              {trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
            </>
          )}
          {trend === 0 && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          {sub && (
            <span
              className={cn(
                'text-xs',
                trend === undefined || trend === 0
                  ? 'text-muted-foreground'
                  : trend > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}
