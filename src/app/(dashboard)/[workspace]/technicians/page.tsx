import { redirect, notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getHouserveTechnicians } from '@/integrations/houserve/queries';
import { Wrench } from 'lucide-react';

interface PageProps {
  params: Promise<{ workspace: string }>;
}

export default async function TechniciansPage({ params }: PageProps) {
  const { workspace } = await params;
  if (workspace !== 'houserve') redirect(`/${workspace}`);

  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const technicians = await getHouserveTechnicians();
  const busyCount = technicians.filter((t) => (t.active_bookings ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Technicians"
        description={`${technicians.length} total · ${busyCount} currently active`}
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Active Bookings</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {technicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No technicians registered yet
                </TableCell>
              </TableRow>
            ) : (
              technicians.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {t.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          {(t.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-sm">{t.full_name ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{t.email ?? '—'}</div>
                    <div>{t.phone ?? ''}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-sm">{t.active_bookings ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(t.active_bookings ?? 0) > 0 ? 'warning' : 'success'}>
                      {(t.active_bookings ?? 0) > 0 ? 'Busy' : 'Available'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
