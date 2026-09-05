import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { workspace } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const { category, q, page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? '1') || 1;

  if (workspace === 'buildkart') {
    const key = process.env.BUILDKART_SUPABASE_SERVICE_ROLE_KEY;
    if (!key || key.includes('MISSING')) {
      const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
      return (
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title="Products" description="BuildKart" />
          <NotConfiguredCard workspaceName="BuildKart" envKey="BUILDKART_SUPABASE_SERVICE_ROLE_KEY" />
        </div>
      );
    }

    try {
      const [{ getBuildKartProducts, getBuildKartCategories }] = await Promise.all([
        import('@/integrations/buildkart/queries'),
      ]);
      const [{ products, total }, allCategories] = await Promise.all([
        getBuildKartProducts({ category, search: q, page }),
        getBuildKartCategories(),
      ]);
      const categoryNames = [...new Set(products.map((p) => p.category))].sort();
      // Merge from all categories table too
      const allCategoryNames = [...new Set([
        ...allCategories.map((c) => c.name),
        ...categoryNames,
      ])].sort();

      const { BuildKartProductsPanel } = await import('@/components/products/BuildKartProductsPanel');
      return (
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title="Products" description={`BuildKart · ${total} total`} />
          <BuildKartProductsPanel
            products={products}
            total={total}
            categories={allCategoryNames}
            currentCategory={category ?? ''}
            currentSearch={q ?? ''}
          />
        </div>
      );
    } catch {
      const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
      return (
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title="Products" description="BuildKart" />
          <NotConfiguredCard workspaceName="BuildKart" envKey="BUILDKART_SUPABASE_SERVICE_ROLE_KEY" />
        </div>
      );
    }
  }

  if (workspace === 'shudhham') {
    const { getShudhhamProducts } = await import('@/integrations/shudhham/queries');
    const { products, total } = await getShudhhamProducts({ category, search: q, page });
    const categories = [...new Set(products.map((p) => p.category))].sort();

    const { ShudhhamProductsPanel } = await import('@/components/products/ShudhhamProductsPanel');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Products" description={`Shudhham · ${total} total`} />
        <ShudhhamProductsPanel
          products={products}
          total={total}
          categories={categories}
          currentCategory={category ?? ''}
          currentSearch={q ?? ''}
        />
      </div>
    );
  }

  // Houserve doesn't have products — redirect to dashboard
  return notFound();
}
