import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  await requireAdmin();

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cross-Business Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time performance metrics and operations across all 3 enterprises
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/activity">
            <Button variant="outline" size="sm" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </Button>
          </Link>
        </div>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Weekly Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalWeeklyRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Past 7 days across all workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Today's Volume
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactionsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders & bookings placed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Customers
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Combined registered customer accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pending Attention
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders & bookings awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Workspace Portfolios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Shudhham Card */}
          <Card className="border-t-4 border-t-emerald-600 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Shudhham</CardTitle>
                    <CardDescription className="text-xs">Ayurveda Products</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                  eCommerce
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Today's Orders</div>
                  <div className="text-lg font-semibold mt-0.5">{shudhhamKPIs?.ordersToday ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">7-Day Revenue</div>
                  <div className="text-lg font-semibold mt-0.5">
                    {formatCurrency(shudhhamKPIs?.revenueThisWeek ?? 0)}
                  </div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Pending Orders</div>
                  <div className="text-lg font-semibold mt-0.5">{shudhhamKPIs?.pendingOrders ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Customers</div>
                  <div className="text-lg font-semibold mt-0.5">{shudhhamKPIs?.totalCustomers ?? 0}</div>
                </div>
              </div>
              <Link href="/shudhham" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between group">
                  <span>Open Shudhham</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Houserve Card */}
          <Card className="border-t-4 border-t-sky-600 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-sky-600/10 flex items-center justify-center text-sky-600">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Houserve</CardTitle>
                    <CardDescription className="text-xs">Home Services & Repair</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-sky-700 bg-sky-50 border-sky-200">
                  Services
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Today's Bookings</div>
                  <div className="text-lg font-semibold mt-0.5">{houserveKPIs?.bookingsToday ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">7-Day Revenue</div>
                  <div className="text-lg font-semibold mt-0.5">
                    {formatCurrency(houserveKPIs?.revenueThisWeek ?? 0)}
                  </div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Pending Bookings</div>
                  <div className="text-lg font-semibold mt-0.5">{houserveKPIs?.pendingBookings ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Active in Field</div>
                  <div className="text-lg font-semibold mt-0.5">{houserveKPIs?.activeBookings ?? 0}</div>
                </div>
              </div>
              <Link href="/houserve" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between group">
                  <span>Open Houserve</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* BuildKart Card */}
          <Card className="border-t-4 border-t-amber-600 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-600">
                    <Hammer className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">BuildKart</CardTitle>
                    <CardDescription className="text-xs">Building Materials & Tools</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                  Materials
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Today's Orders</div>
                  <div className="text-lg font-semibold mt-0.5">{buildkartKPIs?.ordersToday ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">7-Day Revenue</div>
                  <div className="text-lg font-semibold mt-0.5">
                    {formatCurrency(buildkartKPIs?.revenueThisWeek ?? 0)}
                  </div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Pending Orders</div>
                  <div className="text-lg font-semibold mt-0.5">{buildkartKPIs?.pendingOrders ?? 0}</div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg">
                  <div className="text-xs text-muted-foreground">Active Catalog</div>
                  <div className="text-lg font-semibold mt-0.5">{buildkartKPIs?.totalProducts ?? 0}</div>
                </div>
              </div>
              <Link href="/buildkart" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between group">
                  <span>Open BuildKart</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Recent Transactions Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shudhham Recent Orders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Shudhham Recent
            </h3>
            <Link href="/shudhham/orders" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shudhhamOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                      No recent orders
                    </TableCell>
                  </TableRow>
                ) : (
                  shudhhamOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-medium truncate max-w-[120px]">
                        {o.full_name || 'Guest'}
                      </TableCell>
                      <TableCell className="text-xs">{formatCurrency(o.total_amount)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px] capitalize">
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-600" />
              Houserve Recent
            </h3>
            <Link href="/houserve/bookings" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ref</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {houserveBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                      No recent bookings
                    </TableCell>
                  </TableRow>
                ) : (
                  houserveBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-mono">{b.booking_ref || b.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(b.total_amount)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px] capitalize">
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              BuildKart Recent
            </h3>
            <Link href="/buildkart/orders" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order ID</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildkartOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-muted-foreground">
                      No recent orders
                    </TableCell>
                  </TableRow>
                ) : (
                  buildkartOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs font-mono">{o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(o.total)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px] capitalize">
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
  );
}
