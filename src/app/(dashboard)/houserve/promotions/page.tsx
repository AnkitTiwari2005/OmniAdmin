import { notFound } from 'next/navigation';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { getHouservePromotions } from '@/integrations/houserve/queries';
import { PromotionsPanel } from '@/components/houserve/PromotionsPanel';
import { Sparkles } from 'lucide-react';

export default async function HouservePromotionsPage() {
  await requireWorkspaceAccess('houserve');
  const ws = getWorkspaceOrNull('houserve');
  if (!ws) notFound();

  let promotions: import('@/integrations/houserve/types').HouservePromotion[] = [];
  let isNotConfigured = false;

  const key = process.env.HOUSERVE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.includes('MISSING')) {
    isNotConfigured = true;
  } else {
    try {
      promotions = await getHouservePromotions();
    } catch {
      isNotConfigured = true;
    }
  }

  if (isNotConfigured) {
    const { NotConfiguredCard } = await import('@/components/shell/NotConfiguredCard');
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Promotions" description={ws.name} />
        <NotConfiguredCard workspaceName={ws.name} envKey="HOUSERVE_SUPABASE_SERVICE_ROLE_KEY" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Promotions & Banners"
        description={`${ws.name} · ${promotions.length} active promotions`}
      />
      <PromotionsPanel promotions={promotions} />
    </div>
  );
}
