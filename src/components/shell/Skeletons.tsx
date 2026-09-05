import { Skeleton } from '@/components/ui/skeleton';

// ── Stat card grid skeleton ───────────────────────────────────

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card shadow-sm p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Chart area skeleton ───────────────────────────────────────

export function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border bg-card shadow-sm p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="flex items-end gap-2 h-[200px]">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton
                key={j}
                className="flex-1 rounded-t"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table skeleton ─────────────────────────────────────────────

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 rounded" style={{ flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Full page skeleton (stat grid + charts + table) ───────────

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      <StatGridSkeleton />
      <ChartSkeleton />
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}

export function ListPageSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-9 w-28 ml-auto rounded-lg" />
      </div>
      <TableSkeleton rows={8} cols={cols} />
    </div>
  );
}
