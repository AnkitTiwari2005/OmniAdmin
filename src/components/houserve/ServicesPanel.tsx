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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { createService, updateService, toggleServiceActive, deleteService } from '@/integrations/houserve/actions';
import type { HouserveService } from '@/integrations/houserve/types';
import { houserveServiceSchema } from '@/lib/validation/schemas';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setFieldErrors({});
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
    setFieldErrors({});
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = houserveServiceSchema.safeParse({
      name: form.name,
      price: Number(form.price),
      category: form.category,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes) || null,
      image_url: form.image_url || null,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) errs[err.path[0].toString()] = err.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = editing
        ? await updateService(editing.id, {
            name: form.name,
            category: form.category,
            description: form.description || undefined,
            price: form.price,
            duration_minutes: form.duration_minutes,
            sort_order: form.sort_order,
          })
        : await createService({
            name: form.name,
            category: form.category,
            description: form.description || undefined,
            price: form.price,
            duration_minutes: form.duration_minutes,
            sort_order: form.sort_order,
          });

      if ('error' in result && result.error) {
        setError(result.error);
        toast({
          title: 'Operation Failed',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: editing ? 'Service Updated' : 'Service Created',
          description: `Successfully saved ${form.name}`,
          variant: 'success',
        });
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleServiceActive(id, !current);
      if ('error' in result && result.error) {
        toast({
          title: 'Update Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Status Updated',
        description: `Service ${!current ? 'activated' : 'deactivated'}`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteService(deleteId);
      if ('error' in result && result.error) {
        toast({
          title: 'Delete Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Service Deleted',
        description: `Deleted ${deleteName}`,
        variant: 'success',
      });
      setDeleteId(null);
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
                    <Badge variant="secondary" className="text-xs">
                      {s.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(s.price)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'success' : 'secondary'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        role="switch"
                        aria-checked={s.is_active}
                        aria-label={`Toggle active status for ${s.name}`}
                        onClick={() => handleToggle(s.id, s.is_active)}
                        disabled={isPending}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {s.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(s)}
                        disabled={isPending}
                        aria-label={`Edit ${s.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(s.id);
                          setDeleteName(s.name);
                        }}
                        disabled={isPending}
                        aria-label={`Delete ${s.name}`}
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
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                required
                placeholder="e.g. Deep Cleaning"
                className={fieldErrors.name ? 'border-destructive' : ''}
              />
              {fieldErrors.name && <p className="text-xs text-destructive font-medium">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => {
                  setForm((f) => ({ ...f, category: e.target.value }));
                  if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: '' }));
                }}
                required
                placeholder="e.g. Cleaning"
                className={fieldErrors.category ? 'border-destructive' : ''}
              />
              {fieldErrors.category && <p className="text-xs text-destructive font-medium">{fieldErrors.category}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this service include?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }));
                    if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                  }}
                  required
                  className={fieldErrors.price ? 'border-destructive' : ''}
                />
                {fieldErrors.price && <p className="text-xs text-destructive font-medium">{fieldErrors.price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))
                  }
                  required
                />
              </div>
            </div>
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url || null }))}
              folder="houserve/services"
              label="Service Icon / Photo"
            />

            <div className="space-y-1.5">
              <Label htmlFor="sort">Sort order</Label>
              <Input
                id="sort"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* In-app Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete Service"
        description={
          <span>
            Are you sure you want to delete <strong className="text-foreground">{deleteName}</strong>?
          </span>
        }
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
