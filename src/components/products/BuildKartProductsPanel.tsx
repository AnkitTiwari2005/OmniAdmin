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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  createBuildKartProduct,
  updateBuildKartProduct,
  toggleBuildKartProductField,
  deleteBuildKartProduct,
} from '@/integrations/buildkart/actions';
import type { BuildKartProduct } from '@/integrations/buildkart/queries';
import { Plus, Pencil, Trash2, Search, Star, Loader2, X } from 'lucide-react';

interface Props {
  products: BuildKartProduct[];
  total: number;
  categories: string[];
  currentCategory: string;
  currentSearch: string;
}

interface ProductFormState {
  name: string;
  price: number;
  original_price: number | null;
  discount: number | null;
  stock: number;
  category: string;
  subcategory: string | null;
  brand: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  price: 0,
  original_price: null,
  discount: null,
  stock: 10,
  category: '',
  subcategory: null,
  brand: null,
  images: [''],
  is_active: true,
  is_featured: false,
  is_bestseller: false,
};

export function BuildKartProductsPanel({
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
  const [editing, setEditing] = useState<BuildKartProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
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
    setForm({
      ...EMPTY_FORM,
      category: currentCategory !== 'all' ? currentCategory : '',
      images: [''],
    });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: BuildKartProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      price: p.price,
      original_price: p.original_price,
      discount: p.discount,
      stock: p.stock ?? 0,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      images: p.images && p.images.length > 0 ? [...p.images] : (p.image_url ? [p.image_url] : ['']),
      is_active: p.is_active,
      is_featured: p.is_featured,
      is_bestseller: p.is_bestseller,
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleImageChange(index: number, val: string) {
    const newImages = [...form.images];
    newImages[index] = val;
    setForm((f) => ({ ...f, images: newImages }));
  }

  function addImageRow() {
    setForm((f) => ({ ...f, images: [...f.images, ''] }));
  }

  function removeImageRow(index: number) {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm((f) => ({ ...f, images: newImages.length > 0 ? newImages : [''] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanedImages = form.images.map((img) => img.trim()).filter(Boolean);

    startTransition(async () => {
      const payload = {
        name: form.name,
        price: Number(form.price),
        original_price: form.original_price != null && form.original_price !== 0 ? Number(form.original_price) : null,
        discount: form.discount != null ? Number(form.discount) : null,
        stock: Number(form.stock) || 0,
        category: form.category,
        subcategory: form.subcategory || null,
        brand: form.brand || null,
        images: cleanedImages,
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_bestseller: form.is_bestseller,
      };

      const result = editing
        ? await updateBuildKartProduct(editing.id, payload)
        : await createBuildKartProduct(payload);

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

  function handleToggle(
    id: string,
    field: 'is_active' | 'is_featured' | 'is_bestseller',
    current: boolean
  ) {
    startTransition(async () => {
      const result = await toggleBuildKartProductField(id, field, !current);
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
        description: `Updated ${field.replace('is_', '')}`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteBuildKartProduct(deleteId);
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
            placeholder="Search name, brand…"
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
        <Button onClick={openCreate} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category / Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
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
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const stockVal = p.stock ?? 0;
                return (
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
                            📦
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm line-clamp-1">{p.name}</div>
                          {p.subcategory && (
                            <div className="text-xs text-muted-foreground">{p.subcategory}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {p.category}
                      </Badge>
                      {p.brand && (
                        <div className="text-xs text-muted-foreground mt-1">{p.brand}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{formatCurrency(p.price)}</div>
                      {p.original_price && p.original_price > p.price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatCurrency(p.original_price)}
                        </div>
                      )}
                      {p.discount ? (
                        <div className="text-xs text-emerald-600 font-medium">
                          {p.discount}% OFF
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {stockVal <= 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          Out of stock
                        </Badge>
                      ) : stockVal < 10 ? (
                        <Badge variant="warning" className="text-xs">
                          {stockVal} low
                        </Badge>
                      ) : (
                        <span className="text-sm font-medium">{stockVal}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {p.rating.toFixed(1)}{' '}
                          <span className="text-muted-foreground">({p.review_count ?? 0})</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    {(['is_active', 'is_featured', 'is_bestseller'] as const).map((field) => (
                      <TableCell key={field}>
                        <button
                          role="switch"
                          aria-checked={Boolean(p[field])}
                          aria-label={`Toggle ${field.replace('is_', '')} for ${p.name}`}
                          onClick={() => handleToggle(p.id, field, p[field])}
                          disabled={isPending}
                          className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${p[field] ? 'bg-green-500' : 'bg-muted'}`}
                          title={p[field] ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p[field] ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </TableCell>
                    ))}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pr-1">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. UltraTech Super Cement 50kg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Selling Price (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setForm((f) => {
                      const disc =
                        f.original_price && f.original_price > price
                          ? Math.round(((f.original_price - price) / f.original_price) * 100)
                          : f.discount;
                      return { ...f, price, discount: disc };
                    });
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Original Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.original_price ?? ''}
                  onChange={(e) => {
                    const orig = e.target.value ? parseFloat(e.target.value) : null;
                    setForm((f) => {
                      const disc =
                        orig && orig > f.price
                          ? Math.round(((orig - f.price) / orig) * 100)
                          : null;
                      return { ...f, original_price: orig, discount: disc };
                    });
                  }}
                  placeholder="MRP"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discount: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  placeholder="e.g. Cement"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subcategory</Label>
                <Input
                  value={form.subcategory ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value || null }))}
                  placeholder="e.g. OPC 53 Grade"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input
                  value={form.brand ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value || null }))}
                  placeholder="e.g. UltraTech"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Inventory Stock *</Label>
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))
                }
                required
                placeholder="Units in warehouse"
              />
            </div>

            {/* Images Array Manager */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Product Images (Array)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImageRow}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Image URL
                </Button>
              </div>
              {form.images.map((imgUrl, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={imgUrl}
                    onChange={(e) => handleImageChange(idx, e.target.value)}
                    placeholder="https://..."
                    className="text-xs font-mono"
                  />
                  {form.images.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImageRow(idx)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Flags */}
            <div className="flex gap-6 pt-1">
              {(['is_active', 'is_featured', 'is_bestseller'] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="capitalize">{field.replace('is_', '')}</span>
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <DialogFooter className="pt-2">
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
            remove the product from the BuildKart catalog.
          </span>
        }
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
