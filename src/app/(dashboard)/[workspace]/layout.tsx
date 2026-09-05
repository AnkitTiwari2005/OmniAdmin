import { requireAdmin, canAccessWorkspace } from '@/lib/auth';
import { WORKSPACES } from '@/lib/workspace';
import type { WorkspaceSlug } from '@/lib/workspace';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { redirect } from 'next/navigation';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { workspace: workspaceSlug } = await params;
  const admin = await requireAdmin();

  // Check role access
  if (!canAccessWorkspace(admin.role, workspaceSlug)) {
    redirect('/');
  }

  const workspace = WORKSPACES.find((w) => w.slug === workspaceSlug);
  if (!workspace) {
    redirect('/');
  }

  // Figure out which workspaces this admin can see
  const allowedWorkspaces: WorkspaceSlug[] =
    admin.role === 'super_admin'
      ? WORKSPACES.map((w) => w.slug)
      : [admin.role.replace('_admin', '') as WorkspaceSlug];

  return (
    // data-workspace attribute drives the CSS accent variable overrides in globals.css
    <div className="flex h-screen overflow-hidden" data-workspace={workspaceSlug}>
      <Sidebar
        workspaceSlug={workspace.slug}
        adminRole={admin.role}
        allowedWorkspaces={allowedWorkspaces}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          admin={admin}
          workspaceName={workspace.name}
          accentHex={workspace.accentHex}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          <QueryProvider>
            {children}
          </QueryProvider>
        </main>
      </div>
    </div>
  );
}
