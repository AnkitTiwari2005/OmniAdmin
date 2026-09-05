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
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  createShudhhamProduct,
  updateShudhhamProduct,
  deleteShudhhamProduct,
  bulkUpdateShudhhamProducts,
} from '@/integrations/shudhham/actions';
import type { ShudhhamProduct } from '@/integrations/shudhham/queries';
import { shudhhamProductSchema } from '@/lib/validation/schemas';
import { Plus, Pencil, Trash2, Search, Loader2, CheckSquare } from 'lucide-react';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelectAll() {
    if (products.every((p) => selectedIds.includes(p.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleBulkCategory(newCategory: string) {
    if (!selectedIds.length || !newCategory) return;
    startTransition(async () => {
      const res = await bulkUpdateShudhhamProducts(selectedIds, { category: newCategory });
      if ('error' in res && res.error) {
        toast({ title: 'Bulk Update Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Products Updated',
        description: `Reassigned ${selectedIds.length} products to ${newCategory}`,
        variant: 'success',
      });
      setSelectedIds([]);
      router.refresh();
    });
  }

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
    setFieldErrors({});
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
    setFieldErrors({});
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = shudhhamProductSchema.safeParse({ ...form, price: Number(form.price) });
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
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={products.length > 0 && products.every((p) => selectedIds.includes(p.id))}
                  onChange={toggleSelectAll}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  aria-label="Select all products"
                />
              </TableHead>
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
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <TableRow key={p.id} className={isSelected ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        aria-label={`Select ${p.name}`}
                      />
                    </TableCell>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background px-4 py-2.5 rounded-full shadow-2xl border border-border/20 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/20">
            {selectedIds.length} selected
          </span>
          <div className="h-4 w-px bg-background/20" />
          <div className="flex items-center gap-2">
            <span className="text-xs">Reassign Category:</span>
            <Select onValueChange={handleBulkCategory}>
              <SelectTrigger className="h-7 text-xs bg-background/10 border-background/20 text-background min-w-[130px]">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-background/80 hover:text-background hover:bg-background/20"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </Button>
        </div>
      )}

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
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                required
                placeholder="e.g. Ashwagandha Organic Powder"
                className={fieldErrors.name ? 'border-destructive' : ''}
              />
              {fieldErrors.name && <p className="text-xs text-destructive font-medium">{fieldErrors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input
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
                <Label>Category *</Label>
                <Input
                  value={form.category}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, category: e.target.value }));
                    if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: '' }));
                  }}
                  required
                  placeholder="e.g. Oils"
                  className={fieldErrors.category ? 'border-destructive' : ''}
                />
                {fieldErrors.category && <p className="text-xs text-destructive font-medium">{fieldErrors.category}</p>}
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
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url || null }))}
              folder="shudhham"
              label="Product Image"
            />

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
