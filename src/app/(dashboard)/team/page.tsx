import { requireSuperAdmin } from '@/lib/auth';
import { getTeamMembers } from '@/lib/team/actions';
import { PageHeader } from '@/components/shell/PageHeader';
import { TeamManagementPanel } from '@/components/team/TeamManagementPanel';

export default async function TeamPage() {
  const currentAdmin = await requireSuperAdmin();
  const members = await getTeamMembers();

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Team & Access Control"
        description={`${members.length} team members · ${activeCount} active administrators`}
      />
      <TeamManagementPanel
        members={members}
        currentAdminId={currentAdmin.id}
      />
    </div>
  );
}
