import Link from 'next/link';
import { requireWorkspaceAccess } from '@/lib/auth';
import { getWorkspaceOrNull } from '@/lib/workspace';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface SubPageProps {
  params: Promise<{ workspace: string; subpage: string }>;
}

export default async function WorkspaceSubPageFallback({ params }: SubPageProps) {
  const { workspace, subpage } = await params;
  await requireWorkspaceAccess(workspace);
  const ws = getWorkspaceOrNull(workspace);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Page Not Found"
        description={`${ws?.name ?? 'Workspace'} · /${subpage}`}
      />

      <div className="rounded-xl border bg-card p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-sm">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Unknown Section</h3>
        <p className="text-sm text-muted-foreground mb-6">
          The requested path <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">/{workspace}/{subpage}</code> is not a recognized route in the {ws?.name ?? ''} workspace.
        </p>
        <Button asChild>
          <Link href={`/${workspace}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
