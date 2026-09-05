'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { TeamMember } from '@/lib/team/types';
import type { AdminRole } from '@/lib/auth';
import {
  inviteAdminMember,
  updateAdminMemberRole,
  toggleAdminMemberActive,
  removeAdminMember,
} from '@/lib/team/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Trash2,
  Search,
  Mail,
} from 'lucide-react';

interface Props {
  members: TeamMember[];
  currentAdminId: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  shudhham_admin: 'Shudhham Admin',
  houserve_admin: 'Houserve Admin',
  buildkart_admin: 'BuildKart Admin',
};

export function TeamManagementPanel({ members, currentAdminId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');

  // Invite Modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'shudhham_admin' as AdminRole,
  });

  // Edit Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>('shudhham_admin');

  // Deactivate Confirm
  const [toggleActiveId, setToggleActiveId] = useState<string | null>(null);
  const [toggleActiveState, setToggleActiveState] = useState<boolean>(false);
  const [toggleActiveName, setToggleActiveName] = useState<string>('');

  // Remove Confirm
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removeName, setRemoveName] = useState<string>('');

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.full_name ?? '').toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      ROLE_LABELS[m.role]?.toLowerCase().includes(q)
    );
  });

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await inviteAdminMember(inviteForm);
      if ('error' in res && res.error) {
        toast({ title: 'Invite Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Invitation Sent',
        description: `Invite email sent to ${inviteForm.email}`,
        variant: 'success',
      });
      setInviteOpen(false);
      setInviteForm({ email: '', full_name: '', role: 'shudhham_admin' });
      router.refresh();
    });
  }

  function handleRoleUpdate() {
    if (!editingMember) return;
    startTransition(async () => {
      const res = await updateAdminMemberRole(editingMember.id, selectedRole);
      if ('error' in res && res.error) {
        toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Role Updated',
        description: `Updated ${editingMember.full_name || editingMember.email} to ${ROLE_LABELS[selectedRole]}`,
        variant: 'success',
      });
      setRoleModalOpen(false);
      setEditingMember(null);
      router.refresh();
    });
  }

  function handleToggleActiveConfirm() {
    if (!toggleActiveId) return;
    startTransition(async () => {
      const res = await toggleAdminMemberActive(toggleActiveId, toggleActiveState);
      if ('error' in res && res.error) {
        toast({ title: 'Action Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: toggleActiveState ? 'Admin Activated' : 'Admin Deactivated',
        description: `${toggleActiveName} access is now ${toggleActiveState ? 'active' : 'deactivated'}`,
        variant: 'success',
      });
      setToggleActiveId(null);
      router.refresh();
    });
  }

  function handleRemoveConfirm() {
    if (!removeId) return;
    startTransition(async () => {
      const res = await removeAdminMember(removeId);
      if ('error' in res && res.error) {
        toast({ title: 'Removal Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Admin Removed',
        description: `${removeName} was permanently removed from admin access`,
        variant: 'success',
      });
      setRemoveId(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search admins by name, email, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2" size="sm">
          <UserPlus className="h-4 w-4" />
          Invite Admin
        </Button>
      </div>

      {/* Team Members Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Administrator</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Access Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Member Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No administrator profiles found
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((m) => {
                const isSelf = m.id === currentAdminId;
                const initials = (m.full_name || m.email)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {m.full_name || 'Admin User'}
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'super_admin' ? 'default' : 'secondary'}
                        className="font-medium"
                      >
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        role="switch"
                        aria-checked={m.is_active}
                        aria-label={`Toggle access for ${m.full_name || m.email}`}
                        onClick={() => {
                          if (isSelf) {
                            toast({ title: 'Restricted', description: 'You cannot deactivate your own account', variant: 'destructive' });
                            return;
                          }
                          setToggleActiveId(m.id);
                          setToggleActiveState(!m.is_active);
                          setToggleActiveName(m.full_name || m.email);
                        }}
                        disabled={isPending || isSelf}
                        className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                          isSelf ? 'opacity-60 cursor-not-allowed' : ''
                        } ${m.is_active ? 'bg-emerald-500' : 'bg-muted'}`}
                        title={isSelf ? 'Cannot deactivate yourself' : m.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            m.is_active ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.last_sign_in_at ? formatDate(m.last_sign_in_at) : 'Never logged in'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingMember(m);
                            setSelectedRole(m.role);
                            setRoleModalOpen(true);
                          }}
                          title="Change role"
                          aria-label={`Change role for ${m.full_name || m.email}`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setRemoveId(m.id);
                              setRemoveName(m.full_name || m.email);
                            }}
                            title="Remove admin access"
                            aria-label={`Remove access for ${m.full_name || m.email}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invite Admin Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleInviteSubmit}>
            <DialogHeader>
              <DialogTitle>Invite New Administrator</DialogTitle>
              <DialogDescription>
                Send an official invitation link via Supabase Auth email to grant access to OmniAdmin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email Address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input
                  id="admin-name"
                  placeholder="e.g. John Doe"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-role">Workspace Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(val) => setInviteForm({ ...inviteForm, role: val as AdminRole })}
                >
                  <SelectTrigger id="admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin (All Workspaces)</SelectItem>
                    <SelectItem value="shudhham_admin">Shudhham Admin (Ayurveda)</SelectItem>
                    <SelectItem value="houserve_admin">Houserve Admin (Home Services)</SelectItem>
                    <SelectItem value="buildkart_admin">BuildKart Admin (Materials)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Admin Role</DialogTitle>
            <DialogDescription>
              Assign new permissions for {editingMember?.full_name || editingMember?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-1.5">
            <Label htmlFor="role-select">Select New Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as AdminRole)}
            >
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin (All Workspaces)</SelectItem>
                <SelectItem value="shudhham_admin">Shudhham Admin (Ayurveda)</SelectItem>
                <SelectItem value="houserve_admin">Houserve Admin (Home Services)</SelectItem>
                <SelectItem value="buildkart_admin">BuildKart Admin (Materials)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRoleUpdate} disabled={isPending}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(toggleActiveId)}
        onOpenChange={(open) => !open && setToggleActiveId(null)}
        title={toggleActiveState ? 'Reactivate Admin Access?' : 'Deactivate Admin Access?'}
        description={`Are you sure you want to ${toggleActiveState ? 'activate' : 'deactivate'} ${toggleActiveName}? ${
          toggleActiveState
            ? 'They will regain immediate login and operational access.'
            : 'They will be immediately locked out of all workspace actions.'
        }`}
        confirmLabel={toggleActiveState ? 'Activate' : 'Deactivate'}
        variant={toggleActiveState ? 'default' : 'destructive'}
        onConfirm={handleToggleActiveConfirm}
      />

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="Revoke Admin Access Permanently?"
        description={`Are you sure you want to remove ${removeName} from the administration team? Their admin profile will be deleted and all dashboard privileges revoked.`}
        confirmLabel="Remove Access"
        variant="destructive"
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
