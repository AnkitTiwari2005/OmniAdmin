import { requireSuperAdmin } from '@/lib/auth';
import { WORKSPACES, DEFAULT_WORKSPACE } from '@/lib/workspace';
import type { WorkspaceSlug } from '@/lib/workspace';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  const allowedWorkspaces: WorkspaceSlug[] = WORKSPACES.map((w) => w.slug);

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
          workspaceName="OmniAdmin Team"
          accentHex="#4F46E5"
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
