'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { HouserveTechnician } from '@/integrations/houserve/types';
import {
  createTechnician,
  promoteCustomerToTechnician,
  demoteTechnicianToCustomer,
  updateTechnician,
  toggleTechnicianActive,
} from '@/integrations/houserve/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/hooks/use-toast';
import {
  Wrench,
  UserPlus,
  Plus,
  Edit2,
  UserMinus,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

interface Props {
  technicians: HouserveTechnician[];
  promotableCustomers: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
}

export function TechniciansPanel({ technicians, promotableCustomers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState('');

  // Add Technician Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<'create' | 'promote'>('create');
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', phone: '', password: '' });

  // Promote Customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Edit Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<HouserveTechnician | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });

  // Demote confirmation
  const [demoteId, setDemoteId] = useState<string | null>(null);
  const [demoteName, setDemoteName] = useState<string>('');

  // Toggle active confirmation
  const [toggleActiveId, setToggleActiveId] = useState<string | null>(null);
  const [toggleActiveState, setToggleActiveState] = useState<boolean>(false);
  const [toggleActiveName, setToggleActiveName] = useState<string>('');

  // Filtered technicians
  const filteredTechs = technicians.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.full_name ?? '').toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.phone ?? '').toLowerCase().includes(q)
    );
  });

  // Filtered promotable customers
  const filteredCustomers = promotableCustomers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      (c.full_name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  });

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTechnician(createForm);
      if ('error' in res && res.error) {
        toast({ title: 'Failed to Add Technician', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Technician Added',
        description: `${createForm.full_name} has been created and added to active technicians.`,
        variant: 'success',
      });
      setAddOpen(false);
      setCreateForm({ full_name: '', email: '', phone: '', password: '' });
      router.refresh();
    });
  }

  function handlePromote() {
    if (!selectedCustomerId) return;
    startTransition(async () => {
      const res = await promoteCustomerToTechnician(selectedCustomerId);
      if ('error' in res && res.error) {
        toast({ title: 'Promotion Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Technician Promoted', description: 'Customer promoted to technician successfully', variant: 'success' });
      setAddOpen(false);
      setSelectedCustomerId(null);
      router.refresh();
    });
  }

  function openEdit(tech: HouserveTechnician) {
    setEditingTech(tech);
    setEditForm({
      full_name: tech.full_name ?? '',
      phone: tech.phone ?? '',
      email: tech.email ?? '',
    });
    setEditOpen(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTech) return;
    startTransition(async () => {
      const res = await updateTechnician(editingTech.id, editForm);
      if ('error' in res && res.error) {
        toast({ title: 'Update Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Technician Updated', description: 'Technician details updated successfully', variant: 'success' });
      setEditOpen(false);
      setEditingTech(null);
      router.refresh();
    });
  }

  function handleDemoteConfirm() {
    if (!demoteId) return;
    startTransition(async () => {
      const res = await demoteTechnicianToCustomer(demoteId);
      if ('error' in res && res.error) {
        toast({ title: 'Demotion Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Technician Demoted', description: `${demoteName} demoted back to customer role`, variant: 'success' });
      setDemoteId(null);
      router.refresh();
    });
  }

  function handleToggleActiveConfirm() {
    if (!toggleActiveId) return;
    startTransition(async () => {
      const res = await toggleTechnicianActive(toggleActiveId, toggleActiveState);
      if ('error' in res && res.error) {
        toast({ title: 'Status Update Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: toggleActiveState ? 'Technician Activated' : 'Technician Deactivated',
        description: `${toggleActiveName} is now ${toggleActiveState ? 'active' : 'inactive'}`,
        variant: 'success',
      });
      setToggleActiveId(null);
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
            placeholder="Search technicians by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Add Technician
        </Button>
      </div>

      {/* Technicians Table */}
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Technician</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Workload</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Active Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Wrench}
                    title="No technicians found"
                    description={search ? `No technicians matching "${search}"` : 'No technicians assigned to the team yet.'}
                    action={{ label: 'Add Technician', onClick: () => setAddOpen(true) }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredTechs.map((t) => {
                const isActive = t.is_active !== false;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {t.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-semibold shrink-0">
                            {(t.full_name ?? '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{t.full_name ?? 'Unnamed Technician'}</div>
                          <div className="text-xs text-muted-foreground font-mono">ID: {t.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{t.email ?? '—'}</div>
                      <div className="text-xs">{t.phone ?? 'No phone recorded'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold">{t.active_bookings ?? 0}</span>
                        <span className="text-xs text-muted-foreground">active tasks</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(t.active_bookings ?? 0) > 0 ? 'warning' : 'success'}>
                        {(t.active_bookings ?? 0) > 0 ? 'Busy' : 'Available'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`Toggle active status for ${t.full_name ?? 'technician'}`}
                        onClick={() => {
                          setToggleActiveId(t.id);
                          setToggleActiveState(!isActive);
                          setToggleActiveName(t.full_name ?? 'Technician');
                        }}
                        disabled={isPending}
                        className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                          isActive ? 'bg-emerald-500' : 'bg-muted'
                        }`}
                        title={isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            isActive ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(t)}
                          title="Edit technician info"
                          aria-label={`Edit ${t.full_name ?? 'technician'}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={() => {
                            setDemoteId(t.id);
                            setDemoteName(t.full_name ?? 'Technician');
                          }}
                          title="Demote back to customer"
                          aria-label={`Demote ${t.full_name ?? 'technician'} to customer`}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Promote Technician Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Technician</DialogTitle>
            <DialogDescription>
              Create a new technician from scratch or promote an existing customer.
            </DialogDescription>
          </DialogHeader>

          {/* Toggle between Create New and Promote Existing */}
          <div className="flex rounded-lg bg-muted p-1 gap-1 my-2">
            <button
              type="button"
              onClick={() => setAddTab('create')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                addTab === 'create' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              New Technician
            </button>
            <button
              type="button"
              onClick={() => setAddTab('promote')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                addTab === 'promote' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Promote Customer ({promotableCustomers.length})
            </button>
          </div>

          {addTab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Rajesh Kumar"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email Address *</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="technician@houserve.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-phone">Phone Number *</Label>
                <Input
                  id="create-phone"
                  placeholder="+91 98765 43210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-password">Temporary Password (Optional)</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Auto-generated if left blank"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">The technician will use this password to sign in to Houserve.</p>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Technician
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="py-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search existing customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border divide-y">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No customers found to promote
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-sm">{c.full_name ?? 'Customer'}</div>
                          <div className="text-xs text-muted-foreground">{c.email ?? c.phone ?? 'No contact info'}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-sky-600" />}
                      </div>
                    );
                  })
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePromote}
                  disabled={!selectedCustomerId || isPending}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Promote to Technician
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Technician Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Technician Info</DialogTitle>
              <DialogDescription>
                Update contact information for {editingTech?.full_name ?? 'this technician'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="tech-name">Full Name</Label>
                <Input
                  id="tech-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tech-email">Email Address</Label>
                <Input
                  id="tech-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tech-phone">Phone Number</Label>
                <Input
                  id="tech-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Demote Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(demoteId)}
        onOpenChange={(open) => !open && setDemoteId(null)}
        title="Demote Technician to Customer?"
        description={`Are you sure you want to demote ${demoteName}? They will be removed from the active technician assignment pool and revert to a regular customer profile.`}
        confirmLabel="Demote Technician"
        variant="destructive"
        onConfirm={handleDemoteConfirm}
      />

      {/* Toggle Active Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(toggleActiveId)}
        onOpenChange={(open) => !open && setToggleActiveId(null)}
        title={toggleActiveState ? 'Activate Technician?' : 'Deactivate Technician?'}
        description={`Are you sure you want to ${toggleActiveState ? 'reactivate' : 'deactivate'} ${toggleActiveName}? ${
          toggleActiveState
            ? 'They will become eligible to receive booking assignments.'
            : 'They will no longer be available for dispatch on new bookings.'
        }`}
        confirmLabel={toggleActiveState ? 'Activate' : 'Deactivate'}
        variant={toggleActiveState ? 'default' : 'destructive'}
        onConfirm={handleToggleActiveConfirm}
      />
    </>
  );
}
