import { redirect, notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { ServicesPanel } from '@/components/houserve/ServicesPanel';
import { getHouserveServices } from '@/integrations/houserve/queries';

interface PageProps {
  params: Promise<{ workspace: string }>;
}

export default async function ServicesPage({ params }: PageProps) {
  const { workspace } = await params;
  if (workspace !== 'houserve') redirect(`/${workspace}`);

  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);
  if (!ws) notFound();

  const services = await getHouserveServices();

  const categories = [...new Set(services.map((s) => s.category))];
  const activeCount = services.filter((s) => s.is_active).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Services"
        description={`${services.length} total · ${activeCount} active · ${categories.length} categories`}
      />
      <ServicesPanel services={services} />
    </div>
  );
}
