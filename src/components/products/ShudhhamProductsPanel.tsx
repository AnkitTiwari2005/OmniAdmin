'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  createShudhhamProduct,
  updateShudhhamProduct,
  deleteShudhhamProduct,
} from '@/integrations/shudhham/actions';
import type { ShudhhamProduct } from '@/integrations/shudhham/queries';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

interface Props {
  products: ShudhhamProduct[];
  total: number;
  categories: string[];
  currentCategory: string;
  currentSearch: string;
}

const EMPTY = {
  name: '',
  description: null as string | null,
  price: 0,
  category: '',
  image_url: null as string | null,
};

export function ShudhhamProductsPanel({
  products,
  total,
  categories,
  currentCategory,
  currentSearch,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShudhhamProduct | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, category: currentCategory !== 'all' ? currentCategory : '' });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: ShudhhamProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image_url: p.image_url,
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateShudhhamProduct(editing.id, { ...form, price: Number(form.price) })
        : await createShudhhamProduct({ ...form, price: Number(form.price) });

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
        title: editing ? 'Product Updated' : 'Product Created',
        description: `Successfully saved ${form.name}`,
        variant: 'success',
      });
      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteShudhhamProduct(deleteId);
      if ('error' in result && result.error) {
        toast({
          title: 'Delete Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Product Deleted',
        description: `Deleted ${deleteName}`,
        variant: 'success',
      });
      setDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('q', searchInput);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={currentCategory || 'all'}
          onValueChange={(v) => setParam('category', v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">{total} products</span>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="relative h-9 w-9 rounded-md overflow-hidden border shrink-0 bg-muted">
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            width={36}
                            height={36}
                            className="object-cover h-full w-full"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-muted border flex items-center justify-center text-xs shrink-0">
                          🌿
                        </div>
                      )}
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(p.price)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                    {p.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(p)}
                        disabled={isPending}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(p.id);
                          setDeleteName(p.name);
                        }}
                        disabled={isPending}
                        aria-label={`Delete ${p.name}`}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Ashwagandha Organic Powder"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  placeholder="e.g. Oils"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
                rows={3}
                placeholder="Key benefits and ingredients"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                value={form.image_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value || null }))}
                placeholder="https://…"
              />
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Product'}
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
        title="Delete Product"
        description={
          <span>
            Are you sure you want to delete{' '}
            <strong className="text-foreground">{deleteName}</strong>? This action will permanently
            remove the product from the Shudhham catalog.
          </span>
        }
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
