'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import {
  createPromotion,
  updatePromotion,
  togglePromotionActive,
  deletePromotion,
} from '@/integrations/houserve/actions';
import type { HouservePromotion } from '@/integrations/houserve/types';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Sparkles } from 'lucide-react';

interface Props {
  promotions: HouservePromotion[];
}

const EMPTY_PROMOTION = {
  title: '',
  subtitle: '',
  cta_text: 'Book Now',
  bg_gradient: 'linear-gradient(to top, rgba(20,60,30,0.85) 0%, rgba(20,60,30,0.3) 60%, transparent 100%)',
  link_path: '/services',
  sort_order: 0,
  image_url: '',
  is_active: true,
};

export function PromotionsPanel({ promotions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouservePromotion | null>(null);
  const [form, setForm] = useState(EMPTY_PROMOTION);
  const [error, setError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>('');

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_PROMOTION);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: HouservePromotion) {
    setEditing(p);
    setForm({
      title: p.title,
      subtitle: p.subtitle ?? '',
      cta_text: p.cta_text ?? 'Book Now',
      bg_gradient: p.bg_gradient ?? '',
      link_path: p.link_path ?? '/services',
      sort_order: p.sort_order ?? 0,
      image_url: p.image_url ?? '',
      is_active: p.is_active,
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        cta_text: form.cta_text || 'Book Now',
        bg_gradient: form.bg_gradient || null,
        link_path: form.link_path || '/services',
        sort_order: Number(form.sort_order) || 0,
        image_url: form.image_url || null,
        is_active: form.is_active,
      };

      const result = editing
        ? await updatePromotion(editing.id, payload)
        : await createPromotion(payload);

      if ('error' in result && result.error) {
        setError(result.error);
        toast({
          title: 'Operation Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: editing ? 'Promotion Updated' : 'Promotion Created',
        description: `Successfully saved ${form.title}`,
        variant: 'success',
      });
      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await togglePromotionActive(id, !current);
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
        description: `Promotion ${!current ? 'activated' : 'deactivated'}`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deletePromotion(deleteId);
      if ('error' in result && result.error) {
        toast({
          title: 'Delete Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Promotion Deleted',
        description: `Deleted ${deleteTitle}`,
        variant: 'success',
      });
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{promotions.length} active banners & promotions</span>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Promotion
        </Button>
      </div>

      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banner</TableHead>
              <TableHead>Target Link</TableHead>
              <TableHead>CTA</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No promotions found
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="relative h-12 w-20 rounded-md overflow-hidden border shrink-0 bg-muted">
                          <Image
                            src={p.image_url}
                            alt={p.title}
                            width={80}
                            height={48}
                            className="object-cover h-full w-full"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-20 rounded-md bg-muted border flex items-center justify-center text-xs shrink-0">
                          ✨
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{p.title}</div>
                        {p.subtitle && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{p.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                    {p.link_path ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline">{p.cta_text ?? 'Book Now'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'success' : 'secondary'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => handleToggle(p.id, p.is_active)}
                        disabled={isPending}
                        title={p.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {p.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(p)}
                        disabled={isPending}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(p.id);
                          setDeleteTitle(p.title);
                        }}
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Promotion' : 'New Promotion'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="e.g. AC Service Starting ₹499"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="e.g. Split & Window AC — Same-day slots"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CTA Text</Label>
                <Input
                  value={form.cta_text}
                  onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                  placeholder="Book Now"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Link Path</Label>
              <Input
                value={form.link_path}
                onChange={(e) => setForm((f) => ({ ...f, link_path: e.target.value }))}
                placeholder="e.g. /services?category=AC Repair"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              <span>Active banner (visible in app)</span>
            </label>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Promotion'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete Promotion"
        description={
          <span>
            Are you sure you want to delete <strong className="text-foreground">{deleteTitle}</strong>?
          </span>
        }
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
