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
          o.full_name ?? '—',
          formatCurrency(o.total_amount),
          <StatusBadge key={o.id} status={o.status} />,
          formatDate(o.created_at),
        ])}
        emptyMessage="No orders yet"
        viewAllHref="orders"
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
            b.booking_ref,
            formatCurrency(b.total_amount),
            <StatusBadge key={b.id} status={b.status} />,
            formatDate(b.scheduled_date),
          ])}
          emptyMessage="No bookings yet"
          viewAllHref="bookings"
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
            o.id.slice(0, 8) + '…',
            formatCurrency(o.total),
            <StatusBadge key={o.id} status={o.status} />,
            formatDate(o.created_at),
          ])}
          emptyMessage="No orders yet"
          viewAllHref="orders"
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
    <Badge variant={variant} className="capitalize">
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
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold">{title}</h3>
        <a
          href={viewAllHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
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
              <tr className="border-b">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-5 py-3">
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
