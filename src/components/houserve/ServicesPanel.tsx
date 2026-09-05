'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { createService, updateService, toggleServiceActive, deleteService } from '@/integrations/houserve/actions';
import type { HouserveService } from '@/integrations/houserve/types';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

interface ServiceFormProps {
  services: HouserveService[];
}

const EMPTY: Omit<HouserveService, 'id' | 'created_at'> = {
  name: '',
  category: '',
  description: '',
  price: 0,
  duration_minutes: 60,
  image_url: null,
  is_active: true,
  sort_order: 0,
};

export function ServicesPanel({ services }: ServiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouserveService | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(s: HouserveService) {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category,
      description: s.description ?? '',
      price: s.price,
      duration_minutes: s.duration_minutes,
      image_url: s.image_url,
      is_active: s.is_active,
      sort_order: s.sort_order,
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateService(editing.id, { name: form.name, category: form.category, description: form.description || undefined, price: form.price, duration_minutes: form.duration_minutes, sort_order: form.sort_order })
        : await createService({ name: form.name, category: form.category, description: form.description || undefined, price: form.price, duration_minutes: form.duration_minutes, sort_order: form.sort_order });

      if ('error' in result && result.error) {
        setError(result.error);
      } else {
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleServiceActive(id, !current);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteService(id);
      router.refresh();
    });
  }

  return (
    <>
      {/* Header action */}
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Services table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No services yet — add your first one
                </TableCell>
              </TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'success' : 'secondary'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => handleToggle(s.id, s.is_active)}
                        disabled={isPending}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {s.is_active
                          ? <ToggleRight className="h-4 w-4 text-green-500" />
                          : <ToggleLeft className="h-4 w-4" />
                        }
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(s.id)}
                        disabled={isPending}
                      >
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'New Service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Service name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Deep Cleaning" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Input id="category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required placeholder="e.g. Cleaning" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this service include?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (min) *</Label>
                <Input id="duration" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sort">Sort order</Label>
              <Input id="sort" type="number" min={0} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
