'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import {
  createBuildKartProduct, updateBuildKartProduct,
  toggleBuildKartProductField, deleteBuildKartProduct,
} from '@/integrations/buildkart/actions';
import type { BuildKartProduct } from '@/integrations/buildkart/queries';
import { Plus, Pencil, Trash2, Search, Star, Zap, Loader2 } from 'lucide-react';

interface Props {
  products: BuildKartProduct[];
  total: number;
  categories: string[];
  currentCategory: string;
  currentSearch: string;
}

const EMPTY = {
  name: '', price: 0, original_price: null as number | null,
  category: '', subcategory: null as string | null, brand: null as string | null,
  image_url: null as string | null, is_active: true, is_featured: false, is_bestseller: false,
};

export function BuildKartProductsPanel({ products, total, categories, currentCategory, currentSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BuildKartProduct | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, category: currentCategory !== 'all' ? currentCategory : '' });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: BuildKartProduct) {
    setEditing(p);
    setForm({
      name: p.name, price: p.price, original_price: p.original_price,
      category: p.category, subcategory: p.subcategory, brand: p.brand,
      image_url: p.image_url, is_active: p.is_active, is_featured: p.is_featured, is_bestseller: p.is_bestseller,
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateBuildKartProduct(editing.id, form)
        : await createBuildKartProduct({ ...form, price: Number(form.price), original_price: form.original_price ? Number(form.original_price) : null });
      if ('error' in result && result.error) { setError(result.error); return; }
      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleToggle(id: string, field: 'is_active' | 'is_featured' | 'is_bestseller', current: boolean) {
    startTransition(async () => {
      await toggleBuildKartProductField(id, field, !current);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteBuildKartProduct(id);
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
            placeholder="Search name, brand…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', searchInput); }}
            className="pl-9"
          />
        </div>

        <Select value={currentCategory || 'all'} onValueChange={(v) => setParam('category', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">{total} products</span>
        <Button onClick={openCreate} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category / Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Bestseller</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="h-9 w-9 rounded-md object-cover border" />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-muted border flex items-center justify-center text-xs">📦</div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        {p.subcategory && <div className="text-xs text-muted-foreground">{p.subcategory}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                    {p.brand && <div className="text-xs text-muted-foreground mt-1">{p.brand}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{formatCurrency(p.price)}</div>
                    {p.original_price && p.original_price > p.price && (
                      <div className="text-xs text-muted-foreground line-through">{formatCurrency(p.original_price)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.rating ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {p.rating.toFixed(1)} <span className="text-muted-foreground">({p.review_count ?? 0})</span>
                      </span>
                    ) : '—'}
                  </TableCell>
                  {(['is_active', 'is_featured', 'is_bestseller'] as const).map((field) => (
                    <TableCell key={field}>
                      <button
                        onClick={() => handleToggle(p.id, field, p[field])}
                        disabled={isPending}
                        className={`w-10 h-5 rounded-full transition-colors relative ${p[field] ? 'bg-green-500' : 'bg-muted'}`}
                        title={p[field] ? 'Click to disable' : 'Click to enable'}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} disabled={isPending}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Original Price (₹)</Label>
                <Input type="number" min={0} step={0.01} value={form.original_price ?? ''} onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required placeholder="e.g. Cement" />
              </div>
              <div className="space-y-1.5">
                <Label>Subcategory</Label>
                <Input value={form.subcategory ?? ''} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value || null }))} placeholder="e.g. OPC" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input value={form.brand ?? ''} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value || null }))} placeholder="e.g. UltraTech" />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={form.image_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value || null }))} placeholder="https://…" />
            </div>
            <div className="flex gap-6">
              {(['is_active', 'is_featured', 'is_bestseller'] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))} className="rounded" />
                  {field.replace('is_', '').replace('_', ' ')}
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
