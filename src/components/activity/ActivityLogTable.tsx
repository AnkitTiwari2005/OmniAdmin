'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditLogEntry } from '@/lib/audit';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import {
  Activity,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react';

interface Props {
  entries: AuditLogEntry[];
}

export function ActivityLogTable({ entries }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEntries = entries.filter((e) => {
    if (workspaceFilter !== 'all' && e.workspace !== workspaceFilter) return false;
    const q = search.toLowerCase();
    return (
      (e.admin_name ?? '').toLowerCase().includes(q) ||
      (e.admin_email ?? '').toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.target_table.toLowerCase().includes(q) ||
      (e.target_id ?? '').toLowerCase().includes(q)
    );
  });

  function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'warning' | 'success' {
    if (action.includes('delete') || action.includes('remove') || action.includes('deactivate')) return 'destructive';
    if (action.includes('create') || action.includes('invite') || action.includes('promote')) return 'success';
    if (action.includes('update') || action.includes('role')) return 'warning';
    return 'secondary';
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search action, admin, table, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspaces</SelectItem>
              <SelectItem value="shudhham">Shudhham</SelectItem>
              <SelectItem value="houserve">Houserve</SelectItem>
              <SelectItem value="buildkart">BuildKart</SelectItem>
              <SelectItem value="admin">Admin Platform</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            startTransition(() => {
              router.refresh();
            });
          }}
          disabled={isPending}
          className="gap-2"
          aria-label="Refresh activity feed"
        >
          <RotateCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Administrator</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No audit activity logged yet
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((e) => {
                const isExpanded = expandedId === e.id;
                const hasDetails = Object.keys(e.details ?? {}).length > 0;

                return (
                  <>
                    <TableRow
                      key={e.id}
                      className={hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => hasDetails && setExpandedId(isExpanded ? null : e.id)}
                    >
                      <TableCell className="text-muted-foreground">
                        {hasDetails && (
                          isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(e.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{e.admin_name || 'System / Admin'}</div>
                        <div className="text-xs text-muted-foreground">{e.admin_email || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs font-normal">
                          {e.workspace}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(e.action)} className="capitalize text-xs">
                          {e.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Database className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground">{e.target_table}</span>
                          {e.target_id && (
                            <span className="font-mono text-[10px] text-muted-foreground/80 truncate max-w-[100px]">
                              #{e.target_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {hasDetails ? JSON.stringify(e.details) : '—'}
                      </TableCell>
                    </TableRow>
                    {isExpanded && hasDetails && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="rounded-lg bg-background p-3 border font-mono text-xs overflow-auto max-h-48 text-muted-foreground">
                            <pre>{JSON.stringify(e.details, null, 2)}</pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
