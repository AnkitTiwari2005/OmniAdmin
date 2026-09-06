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
  UserCheck,
  UserX,
  Crown,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


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
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {/* Stat Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Members', value: members.length, icon: Shield, color: 'text-primary' },
          { label: 'Active Admins', value: members.filter(m => m.is_active).length, icon: UserCheck, color: 'text-emerald-500' },
          { label: 'Inactive', value: members.filter(m => !m.is_active).length, icon: UserX, color: 'text-muted-foreground' },
        ].map(stat => (
          <div key={stat.label} className="glass-card card-highlight rounded-2xl p-4 border border-border/50 text-center">
            <stat.icon className={`h-5 w-5 mx-auto mb-1.5 ${stat.color}`} />
            <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Card Grid */}
      {filteredMembers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border/50">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No administrators found</p>
          <p className="text-sm text-muted-foreground mt-1">Adjust your search or invite a new admin</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
          {filteredMembers.map(m => {
            const isSelf = m.id === currentAdminId;
            const initials = (m.full_name || m.email)
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={m.id}
                className="glass-card card-highlight rounded-2xl p-5 border border-border/50 hover-lift group relative overflow-hidden flex flex-col gap-4"
              >
                {/* Glow orb */}
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: m.role === 'super_admin' ? '#6366f120' : '#3b82f620' }}
                />

                {/* Header: avatar + name + role badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold ring-2 ring-border/50">
                        {initials}
                      </div>
                      {/* Active indicator dot */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                          m.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm truncate">{m.full_name || 'Admin User'}</p>
                        {isSelf && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 shrink-0">
                            You
                          </Badge>
                        )}
                        {m.role === 'super_admin' && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.email}</p>
                    </div>
                  </div>

                  {/* Action menu using dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 glass-card rounded-xl p-1">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingMember(m);
                          setSelectedRole(m.role);
                          setRoleModalOpen(true);
                        }}
                        className="cursor-pointer rounded-lg text-xs"
                      >
                        <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (isSelf) {
                            toast({ title: 'Restricted', description: 'Cannot deactivate yourself', variant: 'destructive' });
                            return;
                          }
                          setToggleActiveId(m.id);
                          setToggleActiveState(!m.is_active);
                          setToggleActiveName(m.full_name || m.email);
                        }}
                        className="cursor-pointer rounded-lg text-xs"
                        disabled={isSelf}
                      >
                        {m.is_active ? (
                          <UserX className="mr-2 h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="mr-2 h-3.5 w-3.5" />
                        )}
                        {m.is_active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      {!isSelf && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setRemoveId(m.id);
                              setRemoveName(m.full_name || m.email);
                            }}
                            className="cursor-pointer rounded-lg text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Access
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Role + Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={m.role === 'super_admin' ? 'default' : 'secondary'}
                    className="text-xs font-medium"
                  >
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      m.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        m.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                      }`}
                    />
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Footer: last active + member since */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/40">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                      Last Active
                    </p>
                    <p className="text-xs text-foreground font-medium">
                      {m.last_sign_in_at ? formatDate(m.last_sign_in_at) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                      Member Since
                    </p>
                    <p className="text-xs text-foreground font-medium">{formatDate(m.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}

