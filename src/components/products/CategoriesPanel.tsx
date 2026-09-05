'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  createBuildKartCategory, updateBuildKartCategory,
  toggleBuildKartCategoryActive, deleteBuildKartCategory,
} from '@/integrations/buildkart/actions';
import type { BuildKartCategory } from '@/integrations/buildkart/queries';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Tag } from 'lucide-react';

interface Props { categories: BuildKartCategory[] }

export function CategoriesPanel({ categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuildKartCategory | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(999);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null); setName(''); setSortOrder(999); setError(null); setDialogOpen(true);
  }
  function openEdit(c: BuildKartCategory) {
    setEditing(c); setName(c.name); setSortOrder(c.sort_order); setError(null); setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateBuildKartCategory(editing.id, { name, sort_order: sortOrder })
        : await createBuildKartCategory(name, sortOrder);
      if ('error' in result && result.error) { setError(result.error); return; }
      setDialogOpen(false); router.refresh();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => { await toggleBuildKartCategoryActive(id, !current); router.refresh(); });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return;
    startTransition(async () => { await deleteBuildKartCategory(id); router.refresh(); });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No categories yet
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'success' : 'secondary'}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => handleToggle(c.id, c.is_active)} disabled={isPending} title={c.is_active ? 'Deactivate' : 'Activate'}>
                        {c.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Category name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cement" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 999)} min={0} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
