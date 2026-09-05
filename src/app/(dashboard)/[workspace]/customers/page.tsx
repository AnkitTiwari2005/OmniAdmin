import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';

// Houserve and Shudhham and BuildKart all have customers — workspace-aware query
async function fetchCustomers(workspace: string, page: number) {
  if (workspace === 'houserve') {
    const { getHouserveCustomers } = await import('@/integrations/houserve/queries');
    return getHouserveCustomers(page);
  }
  if (workspace === 'shudhham') {
    const { getShudhhamCustomers } = await import('@/integrations/shudhham/queries');
    return getShudhhamCustomers(page);
  }
  if (workspace === 'buildkart') {
    const { getBuildKartCustomers } = await import('@/integrations/buildkart/queries');
    return getBuildKartCustomers(page);
  }
  return { customers: [], total: 0 };
}

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CustomersPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1') || 1;
  const PAGE_SIZE = 30;

  const { customers, total } = await fetchCustomers(workspace, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Customers" description={`${ws.name} · ${total} total`} />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No customers yet
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                        {(c.full_name ?? c.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{c.full_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? <a href={`?page=${page - 1}`}><ChevronLeft className="h-4 w-4" /></a> : <span><ChevronLeft className="h-4 w-4" /></span>}
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} asChild={page < totalPages}>
              {page < totalPages ? <a href={`?page=${page + 1}`}><ChevronRight className="h-4 w-4" /></a> : <span><ChevronRight className="h-4 w-4" /></span>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
