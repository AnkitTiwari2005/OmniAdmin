import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Placeholder page for workspace sub-routes (orders, bookings, products, etc.)
// Full implementation built in Steps 2-4 per workspace.

interface SubPageProps {
  params: Promise<{ workspace: string; subpage: string }>;
}

const SUBPAGE_LABELS: Record<string, string> = {
  orders: 'Orders',
  bookings: 'Bookings',
  products: 'Products',
  services: 'Services',
  categories: 'Categories',
  customers: 'Customers',
  technicians: 'Technicians',
  payments: 'Payments',
};

export default async function WorkspaceSubPage({ params }: SubPageProps) {
  const { workspace, subpage } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const label = SUBPAGE_LABELS[subpage] ?? subpage;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={label}
        description={`${ws.name} · ${label}`}
        action={
          <Badge variant="outline" className="text-xs">
            Coming in Step {workspace === 'houserve' ? '2' : workspace === 'buildkart' ? '3' : '4'}
          </Badge>
        }
      />

      {/* Skeleton preview to show information density intent */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}
