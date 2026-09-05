import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard, StatCardSkeleton } from '@/components/shell/StatCard';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingCart, Users, Package,
  Calendar, TrendingUp, AlertCircle
} from 'lucide-react';
import { Suspense } from 'react';
import { ChartSkeleton } from '@/components/shell/Skeletons';
import {
  getShudhhamDashboardKPIs,
  getShudhhamRecentOrders,
  getShudhhamWeeklyChart,
} from '@/integrations/shudhham/queries';
import {
  getHouserveDashboardKPIs,
  getHouserveRecentBookings,
  getHouserveWeeklyChart,
} from '@/integrations/houserve/queries';
import {
  getBuildKartDashboardKPIs,
  getBuildKartRecentOrders,
  getBuildKartWeeklyChart,
} from '@/integrations/buildkart/queries';

// ── Per-workspace KPI loaders ─────────────────────────────────

async function ShudhhamDashboard({ accentHex }: { accentHex: string }) {
  const [kpis, recentOrders, chartData] = await Promise.all([
    getShudhhamDashboardKPIs(),
    getShudhhamRecentOrders(5),
    getShudhhamWeeklyChart(),
  ]);
  const { GenericOrderCharts } = await import('@/components/shared/GenericOrderCharts');

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders Today" value={kpis.ordersToday.toString()} icon={ShoppingCart} accentHex={accentHex} />
        <StatCard
          label="Revenue This Week" value={formatCurrency(kpis.revenueThisWeek)}
          sub={`${kpis.revenueTrend > 0 ? '+' : ''}${kpis.revenueTrend}% vs last week`}
          trend={kpis.revenueTrend} icon={TrendingUp} accentHex={accentHex}
        />
        <StatCard label="Total Customers" value={kpis.totalCustomers.toLocaleString()} icon={Users} accentHex={accentHex} />
        <StatCard
          label="Pending Orders" value={kpis.pendingOrders.toString()}
          sub={kpis.pendingOrders > 0 ? 'Needs attention' : 'All clear'}
          trend={kpis.pendingOrders > 0 ? -1 : 0} icon={AlertCircle} accentHex={accentHex}
        />
      </div>

      <GenericOrderCharts data={chartData} accentHex={accentHex} />

      <RecentTable
        title="Recent Orders"
        headers={['Customer', 'Amount', 'Status', 'Date']}
        rows={recentOrders.map((o) => [
          <div key={o.id} className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {(o.full_name || 'G')[0].toUpperCase()}
            </span>
            <span className="font-semibold text-foreground truncate">{o.full_name ?? 'Guest User'}</span>
          </div>,
          <span key={o.id} className="font-bold tabular-nums text-foreground">{formatCurrency(o.total_amount)}</span>,
          <StatusBadge key={o.id} status={o.status} />,
          <span key={o.id} className="text-muted-foreground tabular-nums">{formatDate(o.created_at)}</span>,
        ])}
        emptyMessage="No orders yet"
        viewAllHref="/shudhham/orders"
      />
    </>
  );
}

async function HouserveDashboard({ accentHex }: { accentHex: string }) {
  const key = process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('MISSING')) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />;
  }

  try {
    const [kpis, recentBookings, chartData] = await Promise.all([
      getHouserveDashboardKPIs(),
      getHouserveRecentBookings(5),
      getHouserveWeeklyChart(),
    ]);

    // Dynamic import of client chart component (Recharts requires browser)
    const { HouserveCharts } = await import('@/components/houserve/HouserveCharts');

    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Bookings Today"
            value={kpis.bookingsToday.toString()}
            icon={Calendar}
            accentHex={accentHex}
          />
          <StatCard
            label="Revenue This Week"
            value={formatCurrency(kpis.revenueThisWeek)}
            sub={`${kpis.revenueTrend > 0 ? '+' : ''}${kpis.revenueTrend}% vs last week`}
            trend={kpis.revenueTrend}
            icon={TrendingUp}
            accentHex={accentHex}
          />
          <StatCard
            label="Customers"
            value={kpis.totalCustomers.toLocaleString()}
            icon={Users}
            accentHex={accentHex}
          />
          <StatCard
            label="Pending Bookings"
            value={kpis.pendingBookings.toString()}
            sub={`${kpis.activeBookings} active right now`}
            trend={kpis.pendingBookings > 0 ? -1 : 0}
            icon={AlertCircle}
            accentHex={accentHex}
          />
        </div>

        <HouserveCharts data={chartData} accentHex={accentHex} />

        <RecentTable
          title="Recent Bookings"
          headers={['Ref', 'Amount', 'Status', 'Date']}
          rows={recentBookings.map((b) => [
            <span key={b.id} className="font-mono font-semibold text-foreground">{b.booking_ref}</span>,
            <span key={b.id} className="font-bold tabular-nums text-foreground">{formatCurrency(b.total_amount)}</span>,
            <StatusBadge key={b.id} status={b.status} />,
            <span key={b.id} className="text-muted-foreground tabular-nums">{formatDate(b.scheduled_date)}</span>,
          ])}
          emptyMessage="No bookings yet"
          viewAllHref="/houserve/bookings"
        />
      </>
    );
  } catch (err: unknown) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return <NotConfiguredCard workspaceName="Houserve" envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />;
  }
}

async function BuildKartDashboard({ accentHex }: { accentHex: string }) {
  const key = process.env.BUILDKART_SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('MISSING')) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return <NotConfiguredCard workspaceName="BuildKart" envKey="BUILDKART_SUPABASE_SERVICE_ROLE_KEY" />;
  }

  try {
    const [kpis, recentOrders, chartData] = await Promise.all([
      getBuildKartDashboardKPIs(),
      getBuildKartRecentOrders(5),
      getBuildKartWeeklyChart(),
    ]);
    const { GenericOrderCharts } = await import('@/components/shared/GenericOrderCharts');

    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Orders Today" value={kpis.ordersToday.toString()} icon={ShoppingCart} accentHex={accentHex} />
          <StatCard
            label="Revenue This Week" value={formatCurrency(kpis.revenueThisWeek)}
            sub={`${kpis.revenueTrend > 0 ? '+' : ''}${kpis.revenueTrend}% vs last week`}
            trend={kpis.revenueTrend} icon={TrendingUp} accentHex={accentHex}
          />
          <StatCard label="Active Products" value={kpis.totalProducts.toLocaleString()} icon={Package} accentHex={accentHex} />
          <StatCard
            label="Pending Orders" value={kpis.pendingOrders.toString()}
            sub={kpis.pendingOrders > 0 ? 'Needs attention' : 'All clear'}
            trend={kpis.pendingOrders > 0 ? -1 : 0} icon={AlertCircle} accentHex={accentHex}
          />
        </div>

        <GenericOrderCharts data={chartData} accentHex={accentHex} />

        <RecentTable
          title="Recent Orders"
          headers={['Order ID', 'Amount', 'Status', 'Date']}
          rows={recentOrders.map((o) => [
            <span key={o.id} className="font-mono font-semibold text-foreground">#{o.id.slice(0, 8)}</span>,
            <span key={o.id} className="font-bold tabular-nums text-foreground">{formatCurrency(o.total)}</span>,
            <StatusBadge key={o.id} status={o.status} />,
            <span key={o.id} className="text-muted-foreground tabular-nums">{formatDate(o.created_at)}</span>,
          ])}
          emptyMessage="No orders yet"
          viewAllHref="/buildkart/orders"
        />
      </>
    );
  } catch (err: unknown) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return <NotConfiguredCard workspaceName="BuildKart" envKey="BUILDKART_SUPABASE_SERVICE_ROLE_KEY" />;
  }
}

// ── Reusable status badge ─────────────────────────────────────

const STATUS_VARIANTS: Record<
  string,
  'success' | 'warning' | 'info' | 'destructive' | 'secondary'
> = {
  // Shudhham orders
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'destructive',
  // Houserve bookings
  confirmed: 'warning',
  assigned: 'info',
  accepted: 'info',
  on_the_way: 'info',
  in_progress: 'info',
  completed: 'success',
  // BuildKart orders (capitalised)
  Processing: 'warning',
  Shipped: 'info',
  Delivered: 'success',
  Cancelled: 'destructive',
};

function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? 'secondary';
  return (
    <Badge
      variant={variant}
      dot
      pulse={variant === 'warning' || variant === 'info'}
      className="capitalize px-2.5 py-0.5 text-xs font-semibold"
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// ── Generic recent items table ────────────────────────────────

interface RecentTableProps {
  title: string;
  headers: string[];
  rows: (string | React.ReactNode)[][];
  emptyMessage: string;
  viewAllHref: string;
}

function RecentTable({ title, headers, rows, emptyMessage, viewAllHref }: RecentTableProps) {
  return (
    <div className="glass-card card-highlight rounded-2xl border border-border/50 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
        <h3 className="font-bold text-sm tracking-tight text-foreground">{title}</h3>
        <a
          href={viewAllHref}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
        >
          <span>View all</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </a>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-3.5 text-xs">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────

interface DashboardPageProps {
  params: Promise<{ workspace: string }>;
}

export default async function WorkspaceDashboard({ params }: DashboardPageProps) {
  const { workspace } = await params;
  const admin = await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={`${ws.name} Dashboard`}
        description={`Overview of ${ws.description}`}
      />

      <Suspense fallback={<DashboardSkeleton />}>
        {workspace === 'shudhham' && (
          <ShudhhamDashboard accentHex={ws.accentHex} />
        )}
        {workspace === 'houserve' && (
          <HouserveDashboard accentHex={ws.accentHex} />
        )}
        {workspace === 'buildkart' && (
          <BuildKartDashboard accentHex={ws.accentHex} />
        )}
      </Suspense>
    </div>
  );
}

export async function generateStaticParams() {
  return [
    { workspace: 'shudhham' },
    { workspace: 'houserve' },
    { workspace: 'buildkart' },
  ];
}
