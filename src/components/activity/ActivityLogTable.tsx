'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AuditLogEntry } from '@/lib/audit';
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
  Database,
  PlusCircle,
  Edit3,
  Trash2,
  Clock3,
  RefreshCw,
} from 'lucide-react';

interface Props {
  entries: AuditLogEntry[];
}

function getActionIcon(action: string): { Icon: React.ElementType; color: string } {
  if (action.includes('delete') || action.includes('remove') || action.includes('deactivate')) {
    return { Icon: Trash2, color: 'text-destructive' };
  }
  if (action.includes('create') || action.includes('invite') || action.includes('promote')) {
    return { Icon: PlusCircle, color: 'text-emerald-500' };
  }
  if (action.includes('update') || action.includes('role')) {
    return { Icon: Edit3, color: 'text-amber-500' };
  }
  return { Icon: Activity, color: 'text-muted-foreground' };
}

function getWorkspaceColor(workspace: string): string {
  if (workspace === 'shudhham')  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (workspace === 'houserve')  return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  if (workspace === 'buildkart') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  return 'bg-muted text-muted-foreground border-border';
}

function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'warning' | 'success' {
  if (action.includes('delete') || action.includes('remove') || action.includes('deactivate')) return 'destructive';
  if (action.includes('create') || action.includes('invite') || action.includes('promote')) return 'success';
  if (action.includes('update') || action.includes('role')) return 'warning';
  return 'secondary';
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

  const totalCreates = filteredEntries.filter(e => e.action.includes('create') || e.action.includes('invite')).length;
  const totalDeletes = filteredEntries.filter(e => e.action.includes('delete') || e.action.includes('remove')).length;

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {/* Toolbar card */}
      <div className="glass-card card-highlight rounded-2xl p-4 border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Activity Timeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredEntries.length} events logged</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            className="gap-2 rounded-xl border-border/60 hover:bg-muted/60"
            aria-label="Refresh activity feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search action, admin, table, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-border/60"
            />
          </div>
          <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
            <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Workspaces</SelectItem>
              <SelectItem value="shudhham">Shudhham</SelectItem>
              <SelectItem value="houserve">Houserve</SelectItem>
              <SelectItem value="buildkart">BuildKart</SelectItem>
              <SelectItem value="admin">Admin Platform</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <Activity className="h-3 w-3" />
            {filteredEntries.length} total
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <PlusCircle className="h-3 w-3" />
            {totalCreates} creates
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
            <Trash2 className="h-3 w-3" />
            {totalDeletes} deletes
          </span>
        </div>
      </div>

      {/* Timeline */}
      {filteredEntries.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-border/50">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No activity logged</p>
          <p className="text-sm text-muted-foreground mt-1">
            Admin actions across all workspaces will appear here
          </p>
        </div>
      ) : (
        <div className={`relative transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
          {/* Vertical timeline line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border/40 z-0" />

          <div className="space-y-2">
            {filteredEntries.map((e) => {
              const { Icon, color } = getActionIcon(e.action);
              const isExpanded = expandedId === e.id;
              const hasDetails = Object.keys(e.details ?? {}).length > 0;

              return (
                <div key={e.id} className="relative flex gap-3 group">
                  {/* Icon bubble */}
                  <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-200">
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 mb-1 glass-card rounded-xl p-3.5 border border-border/50 transition-all duration-200 ${hasDetails ? 'cursor-pointer hover:border-border/80 hover:-translate-y-px hover:shadow-sm' : ''}`}
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : e.id)}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {e.admin_name || 'System / Admin'}
                        </span>
                        <Badge variant={getActionBadgeVariant(e.action)} className="capitalize text-[10px] px-1.5 py-0 font-medium">
                          {e.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border capitalize ${getWorkspaceColor(e.workspace)}`}>
                          {e.workspace}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap shrink-0">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(e.created_at)}
                      </span>
                    </div>

                    {/* Bottom row: email + target */}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {e.admin_email && (
                        <span className="text-xs text-muted-foreground">{e.admin_email}</span>
                      )}
                      {e.target_table && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Database className="h-3 w-3 shrink-0" />
                          <span className="font-mono">{e.target_table}</span>
                          {e.target_id && (
                            <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-[80px]">
                              #{e.target_id.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      )}
                      {hasDetails && (
                        <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                          {isExpanded ? '▲ Hide details' : '▼ View details'}
                        </span>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 border border-border/40 font-mono text-xs overflow-auto max-h-48 text-muted-foreground">
                        <pre>{JSON.stringify(e.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
