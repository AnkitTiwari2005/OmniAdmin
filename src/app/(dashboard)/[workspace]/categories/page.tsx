import { redirect, notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { getBuildKartCategories } from '@/integrations/buildkart/queries';
import { CategoriesPanel } from '@/components/products/CategoriesPanel';

interface PageProps {
  params: Promise<{ workspace: string }>;
}

export default async function CategoriesPage({ params }: PageProps) {
  const { workspace } = await params;
  if (workspace !== 'buildkart') redirect(`/${workspace}`);

  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const categories = await getBuildKartCategories();
  const activeCount = categories.filter((c) => c.is_active).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Categories"
        description={`BuildKart · ${categories.length} total · ${activeCount} active`}
      />
      <CategoriesPanel categories={categories} />
    </div>
  );
}
