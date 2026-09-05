import { requireAdmin } from '@/lib/auth';
import { WORKSPACES, DEFAULT_WORKSPACE } from '@/lib/workspace';
import type { WorkspaceSlug } from '@/lib/workspace';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';

export default async function OverviewLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const allowedWorkspaces: WorkspaceSlug[] =
    admin.role === 'super_admin'
      ? WORKSPACES.map((w) => w.slug)
      : [admin.role.replace('_admin', '') as WorkspaceSlug];

  return (
    <div className="flex h-screen overflow-hidden" data-workspace="shudhham">
      <Sidebar
        workspaceSlug={DEFAULT_WORKSPACE}
        adminRole={admin.role}
        allowedWorkspaces={allowedWorkspaces}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          admin={admin}
          workspaceName="All Businesses"
          accentHex="#0f172a"
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
