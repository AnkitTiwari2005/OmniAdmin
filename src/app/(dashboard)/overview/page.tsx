import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  getShudhhamDashboardKPIs,
  getShudhhamRecentOrders,
} from '@/integrations/shudhham/queries';
import {
  getHouserveDashboardKPIs,
  getHouserveRecentBookings,
} from '@/integrations/houserve/queries';
import {
  getBuildKartDashboardKPIs,
  getBuildKartRecentOrders,
} from '@/integrations/buildkart/queries';
import {
  ArrowRight,
  TrendingUp,
  Users,
  AlertCircle,
  ShoppingBag,
  Wrench,
  Hammer,
  DollarSign,
  Activity,
} from 'lucide-react';

export const revalidate = 30; // 30 second cache for overview

export default async function OverviewPage() {
  const admin = await requireAdmin();

  const [
    shudhhamKPIsRes,
    houserveKPIsRes,
    buildkartKPIsRes,
    shudhhamOrdersRes,
    houserveBookingsRes,
    buildkartOrdersRes,
  ] = await Promise.allSettled([
    getShudhhamDashboardKPIs(),
    getHouserveDashboardKPIs(),
    getBuildKartDashboardKPIs(),
    getShudhhamRecentOrders(5),
    getHouserveRecentBookings(5),
    getBuildKartRecentOrders(5),
  ]);

  const shudhhamKPIs = shudhhamKPIsRes.status === 'fulfilled' ? shudhhamKPIsRes.value : null;
  const houserveKPIs = houserveKPIsRes.status === 'fulfilled' ? houserveKPIsRes.value : null;
  const buildkartKPIs = buildkartKPIsRes.status === 'fulfilled' ? buildkartKPIsRes.value : null;

  const shudhhamOrders = shudhhamOrdersRes.status === 'fulfilled' ? shudhhamOrdersRes.value : [];
  const houserveBookings = houserveBookingsRes.status === 'fulfilled' ? houserveBookingsRes.value : [];
  const buildkartOrders = buildkartOrdersRes.status === 'fulfilled' ? buildkartOrdersRes.value : [];

  const totalWeeklyRevenue =
    (shudhhamKPIs?.revenueThisWeek ?? 0) +
    (houserveKPIs?.revenueThisWeek ?? 0) +
    (buildkartKPIs?.revenueThisWeek ?? 0);

  const totalTransactionsToday =
    (shudhhamKPIs?.ordersToday ?? 0) +
    (houserveKPIs?.bookingsToday ?? 0) +
    (buildkartKPIs?.ordersToday ?? 0);

  const totalCustomers =
    (shudhhamKPIs?.totalCustomers ?? 0) +
    (houserveKPIs?.totalCustomers ?? 0) +
    (buildkartKPIs?.totalCustomers ?? 0);

  const totalPending =
    (shudhhamKPIs?.pendingOrders ?? 0) +
    (houserveKPIs?.pendingBookings ?? 0) +
    (buildkartKPIs?.pendingOrders ?? 0);

  const adminFirstName = admin.full_name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      {/* Executive Command Hero Banner */}
      <div className="glass-card card-highlight relative overflow-hidden rounded-3xl p-6 md:p-8 border border-border/60 bg-gradient-to-br from-card via-card/95 to-indigo-950/10 shadow-xs">
        {/* Ambient background glow orb */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="indigo" dot pulse className="px-3 py-1 font-medium">
                Executive Command Center
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                All 3 Enterprises Live & Connected
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Good day, {adminFirstName}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl font-normal leading-relaxed">
              Unified cross-portfolio operations and aggregated real-time metrics across{' '}
              <span className="font-semibold text-foreground/90">Shudhham</span>,{' '}
              <span className="font-semibold text-foreground/90">Houserve</span>, and{' '}
              <span className="font-semibold text-foreground/90">BuildKart</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/activity">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm hover:bg-muted/80 shadow-2xs transition-all active:scale-[0.98]"
              >
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>Audit Activity</span>
              </Button>
            </Link>
            {admin.role === 'super_admin' && (
              <Link href="/team">
                <Button
                  size="sm"
                  className="gap-2 rounded-xl shadow-xs transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Users className="h-4 w-4" />
                  <span>Manage Team</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Weekly Revenue */}
        <div className="glass-card card-highlight rounded-2xl p-5 hover-lift group relative overflow-hidden border border-border/50">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-start justify-between relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Revenue</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{formatCurrency(totalWeeklyRevenue)}</p>
          </div>
          <div className="mt-2.5 flex items-center gap-2 relative z-10">
            <Badge variant="success" dot className="px-2 py-0.5 text-[11px]">
              Past 7 Days
            </Badge>
            <span className="text-xs text-muted-foreground truncate font-medium">
              3 active enterprises
            </span>
          </div>
        </div>

        {/* Today's Volume */}
        <div className="glass-card card-highlight rounded-2xl p-5 hover-lift group relative overflow-hidden border border-border/50">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-start justify-between relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Transactions</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{totalTransactionsToday}</p>
          </div>
          <div className="mt-2.5 flex items-center gap-2 relative z-10">
            <Badge variant="info" dot className="px-2 py-0.5 text-[11px]">
              Active Flow
            </Badge>
            <span className="text-xs text-muted-foreground truncate font-medium">
              Orders & bookings today
            </span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="glass-card card-highlight rounded-2xl p-5 hover-lift group relative overflow-hidden border border-border/50">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-start justify-between relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered Customers</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{totalCustomers.toLocaleString()}</p>
          </div>
          <div className="mt-2.5 flex items-center gap-2 relative z-10">
            <Badge variant="indigo" dot className="px-2 py-0.5 text-[11px]">
              Customer Base
            </Badge>
            <span className="text-xs text-muted-foreground truncate font-medium">
              Combined registered accounts
            </span>
          </div>
        </div>

        {/* Pending Action Items */}
        <div className="glass-card card-highlight rounded-2xl p-5 hover-lift group relative overflow-hidden border border-border/50">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
          <div className="flex items-start justify-between relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Attention</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{totalPending}</p>
          </div>
          <div className="mt-2.5 flex items-center gap-2 relative z-10">
            {totalPending > 0 ? (
              <Badge variant="warning" dot pulse className="px-2 py-0.5 text-[11px]">
                Requires Action
              </Badge>
            ) : (
              <Badge variant="success" dot className="px-2 py-0.5 text-[11px]">
                All Cleared
              </Badge>
            )}
            <span className="text-xs text-muted-foreground truncate font-medium">
              Awaiting fulfillment
            </span>
          </div>
        </div>
      </div>

      {/* Workspace Portfolio Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Enterprise Portfolios</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Live status and performance overview by business vertical</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shudhham Portfolio Card */}
          <div className="glass-card card-highlight rounded-2xl p-6 hover-lift relative overflow-hidden group border border-border/50 border-t-4 border-t-emerald-600 flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="space-y-5 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-2xs">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">Shudhham</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Ayurveda Products</p>
                  </div>
                </div>
                <Badge variant="success" dot pulse className="px-2.5 py-0.5 text-[10px]">
                  eCommerce
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Today's Orders</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">{shudhhamKPIs?.ordersToday ?? 0}</p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">7-Day Revenue</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">
                    {formatCurrency(shudhhamKPIs?.revenueThisWeek ?? 0)}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Pending Orders</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums text-amber-600 dark:text-amber-400">
                    {shudhhamKPIs?.pendingOrders ?? 0}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Customers</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">
                    {shudhhamKPIs?.totalCustomers ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/40 relative z-10">
              <Link href="/shudhham" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between group/btn rounded-xl border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                >
                  <span className="font-semibold text-xs text-foreground group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 transition-colors">
                    Launch Shudhham Console
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 group-hover/btn:translate-x-1.5 transition-all duration-200" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Houserve Portfolio Card */}
          <div className="glass-card card-highlight rounded-2xl p-6 hover-lift relative overflow-hidden group border border-border/50 border-t-4 border-t-sky-600 flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-sky-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="space-y-5 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 shadow-2xs">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">Houserve</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Home Services & Repair</p>
                  </div>
                </div>
                <Badge variant="info" dot pulse className="px-2.5 py-0.5 text-[10px]">
                  Services
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Today's Bookings</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">{houserveKPIs?.bookingsToday ?? 0}</p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">7-Day Revenue</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">
                    {formatCurrency(houserveKPIs?.revenueThisWeek ?? 0)}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Pending Bookings</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums text-amber-600 dark:text-amber-400">
                    {houserveKPIs?.pendingBookings ?? 0}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Active in Field</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums text-sky-600 dark:text-sky-400">
                    {houserveKPIs?.activeBookings ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/40 relative z-10">
              <Link href="/houserve" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between group/btn rounded-xl border-border/60 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                >
                  <span className="font-semibold text-xs text-foreground group-hover/btn:text-sky-600 dark:group-hover/btn:text-sky-400 transition-colors">
                    Launch Houserve Console
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/btn:text-sky-600 dark:group-hover/btn:text-sky-400 group-hover/btn:translate-x-1.5 transition-all duration-200" />
                </Button>
              </Link>
            </div>
          </div>

          {/* BuildKart Portfolio Card */}
          <div className="glass-card card-highlight rounded-2xl p-6 hover-lift relative overflow-hidden group border border-border/50 border-t-4 border-t-amber-600 flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-amber-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

            <div className="space-y-5 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 shadow-2xs">
                    <Hammer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">BuildKart</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Building Materials & Tools</p>
                  </div>
                </div>
                <Badge variant="warning" dot pulse className="px-2.5 py-0.5 text-[10px]">
                  Materials
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Today's Orders</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">{buildkartKPIs?.ordersToday ?? 0}</p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">7-Day Revenue</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">
                    {formatCurrency(buildkartKPIs?.revenueThisWeek ?? 0)}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Pending Orders</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums text-amber-600 dark:text-amber-400">
                    {buildkartKPIs?.pendingOrders ?? 0}
                  </p>
                </div>
                <div className="bg-muted/40 group-hover:bg-muted/60 p-3 rounded-xl border border-border/30 transition-colors">
                  <span className="text-[11px] font-medium text-muted-foreground">Active Catalog</span>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">
                    {buildkartKPIs?.totalProducts ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/40 relative z-10">
              <Link href="/buildkart" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between group/btn rounded-xl border-border/60 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
                >
                  <span className="font-semibold text-xs text-foreground group-hover/btn:text-amber-600 dark:group-hover/btn:text-amber-400 transition-colors">
                    Launch BuildKart Console
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover/btn:text-amber-600 dark:group-hover/btn:text-amber-400 group-hover/btn:translate-x-1.5 transition-all duration-200" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Transactions Feed (3 Columns) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Real-Time Transactions Stream</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live incoming order flows and customer service bookings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shudhham Recent Orders */}
          <div className="glass-card card-highlight rounded-2xl border border-border/50 overflow-hidden shadow-xs flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold tracking-tight">Shudhham Orders</span>
              </div>
              <Link
                href="/shudhham/orders"
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                View all →
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Customer</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shudhhamOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                        No recent orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    shudhhamOrders.map((o) => (
                      <TableRow key={o.id} className="border-border/30 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border/40">
                              <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                                {(o.full_name || 'G')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold truncate max-w-[110px]">
                              {o.full_name || 'Guest User'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold tabular-nums py-3">
                          {formatCurrency(o.total_amount)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Badge
                            variant={
                              o.status === 'delivered' || o.status === 'completed'
                                ? 'success'
                                : o.status === 'cancelled'
                                ? 'destructive'
                                : 'warning'
                            }
                            dot
                            className="text-[10px] capitalize px-2 py-0.5"
                          >
                            {o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Houserve Recent Bookings */}
          <div className="glass-card card-highlight rounded-2xl border border-border/50 overflow-hidden shadow-xs flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <span className="text-xs font-bold tracking-tight">Houserve Bookings</span>
              </div>
              <Link
                href="/houserve/bookings"
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                View all →
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Reference</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houserveBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                        No recent bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    houserveBookings.map((b) => (
                      <TableRow key={b.id} className="border-border/30 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 font-mono text-xs font-medium text-foreground">
                          {b.booking_ref || b.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold tabular-nums py-3">
                          {formatCurrency(b.total_amount)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Badge
                            variant={
                              b.status === 'completed'
                                ? 'success'
                                : b.status === 'cancelled'
                                ? 'destructive'
                                : b.status === 'in_progress'
                                ? 'info'
                                : 'warning'
                            }
                            dot
                            className="text-[10px] capitalize px-2 py-0.5"
                          >
                            {b.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* BuildKart Recent Orders */}
          <div className="glass-card card-highlight rounded-2xl border border-border/50 overflow-hidden shadow-xs flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-xs font-bold tracking-tight">BuildKart Orders</span>
              </div>
              <Link
                href="/buildkart/orders"
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                View all →
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Order ID</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider py-2.5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildkartOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                        No recent orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    buildkartOrders.map((o) => (
                      <TableRow key={o.id} className="border-border/30 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 font-mono text-xs font-medium text-foreground">
                          #{o.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold tabular-nums py-3">
                          {formatCurrency(o.total)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Badge
                            variant={
                              o.status === 'delivered' || o.status === 'completed'
                                ? 'success'
                                : o.status === 'cancelled'
                                ? 'destructive'
                                : 'warning'
                            }
                            dot
                            className="text-[10px] capitalize px-2 py-0.5"
                          >
                            {o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
