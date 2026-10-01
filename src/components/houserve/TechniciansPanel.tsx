'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { HouserveTechnician, HouserveTechnicianPayout } from '@/integrations/houserve/types';
import {
  createTechnician,
  promoteCustomerToTechnician,
  demoteTechnicianToCustomer,
  updateTechnician,
  toggleTechnicianActive,
  approveTechnicianKyc,
  rejectTechnicianKyc,
  getTechnicianDocumentUrl,
  settleTechnicianPayout,
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';
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
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  ExternalLink,
  Wallet,
  Eye,
  Star,
  CheckCheck,
} from 'lucide-react';

interface Props {
  technicians: HouserveTechnician[];
  promotableCustomers: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }>;
  payouts: HouserveTechnicianPayout[];
}

function maskId(idNumber: string | null | undefined): string {
  if (!idNumber) return '—';
  if (idNumber.length <= 4) return idNumber;
  return `**** ${idNumber.slice(-4)}`;
}

export function TechniciansPanel({ technicians, promotableCustomers, payouts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab state
  const [activeTab, setActiveTab] = useState<'technicians' | 'payouts'>('technicians');

  // Filter state
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');

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

  // KYC Reject Dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTechId, setRejectTechId] = useState<string | null>(null);
  const [rejectTechName, setRejectTechName] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  // KYC Document Preview Dialog
  const [docOpen, setDocOpen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docTechName, setDocTechName] = useState<string>('');
  const [docIdType, setDocIdType] = useState<string>('');
  const [docIdNumber, setDocIdNumber] = useState<string>('');

  // Settle Payout Confirmation Dialog
  const [settlePayoutId, setSettlePayoutId] = useState<string | null>(null);
  const [settlePayoutAmount, setSettlePayoutAmount] = useState<number>(0);
  const [settlePayoutTechName, setSettlePayoutTechName] = useState<string>('');

  // Counters
  const pendingKycCount = technicians.filter((t) => t.verification_status === 'pending').length;
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;

  // Filtered technicians
  const filteredTechs = technicians.filter((t) => {
    if (kycFilter !== 'all' && t.verification_status !== kycFilter) return false;
    const q = search.toLowerCase();
    return (
      (t.full_name ?? '').toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.phone ?? '').toLowerCase().includes(q) ||
      (t.skills ?? []).some((s) => s.toLowerCase().includes(q)) ||
      (t.id_number ?? '').toLowerCase().includes(q)
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

  // Filtered payouts
  const filteredPayouts = payouts.filter((p) => {
    if (payoutStatusFilter !== 'all' && p.status !== payoutStatusFilter) return false;
    const q = payoutSearch.toLowerCase();
    return (
      (p.technician?.full_name ?? '').toLowerCase().includes(q) ||
      (p.technician?.phone ?? '').toLowerCase().includes(q) ||
      (p.technician?.bank_upi_id ?? '').toLowerCase().includes(q) ||
      (p.notes ?? '').toLowerCase().includes(q)
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

  function handleApproveKyc(techId: string, name: string) {
    startTransition(async () => {
      const res = await approveTechnicianKyc(techId);
      if ('error' in res && res.error) {
        toast({ title: 'Approval Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Partner KYC Approved',
        description: `${name} has been verified and can now go online in HandyMan app.`,
        variant: 'success',
      });
      router.refresh();
    });
  }

  function openRejectModal(tech: HouserveTechnician) {
    setRejectTechId(tech.id);
    setRejectTechName(tech.full_name ?? 'Technician');
    setRejectReason(tech.rejection_reason || '');
    setRejectOpen(true);
  }

  function handleRejectKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTechId) return;
    startTransition(async () => {
      const res = await rejectTechnicianKyc(rejectTechId, rejectReason);
      if ('error' in res && res.error) {
        toast({ title: 'Rejection Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Partner KYC Rejected',
        description: `Notification dispatched to ${rejectTechName} with the rejection reason.`,
        variant: 'destructive',
      });
      setRejectOpen(false);
      setRejectTechId(null);
      router.refresh();
    });
  }

  async function openDocPreview(tech: HouserveTechnician) {
    if (!tech.id_document_url) {
      toast({ title: 'No Document', description: 'This partner has not uploaded an ID document yet.' });
      return;
    }
    setDocTechName(tech.full_name ?? 'Technician');
    setDocIdType(tech.id_type || 'ID Document');
    setDocIdNumber(tech.id_number || '');
    setDocUrl(null);
    setDocLoading(true);
    setDocOpen(true);

    try {
      const res = await getTechnicianDocumentUrl(tech.id_document_url);
      setDocUrl(res.url);
    } catch {
      toast({ title: 'Failed to load document', description: 'Could not generate document link.', variant: 'destructive' });
    } finally {
      setDocLoading(false);
    }
  }

  function handleSettlePayoutConfirm() {
    if (!settlePayoutId) return;
    startTransition(async () => {
      const res = await settleTechnicianPayout(settlePayoutId);
      if ('error' in res && res.error) {
        toast({ title: 'Payout Settlement Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Payout Settled',
        description: `₹${settlePayoutAmount} payout for ${settlePayoutTechName} marked as paid.`,
        variant: 'success',
      });
      setSettlePayoutId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab('technicians')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all',
            activeTab === 'technicians'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <Wrench className="h-4 w-4" />
          Technicians & KYC
          {pendingKycCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-400 text-amber-950">
              {pendingKycCount} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all',
            activeTab === 'payouts'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <Wallet className="h-4 w-4" />
          Partner Payouts & Withdrawals
          {pendingPayoutsCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-400 text-amber-950">
              {pendingPayoutsCount} pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'technicians' ? (
        <>
          {/* Technicians & KYC Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search name, phone, trade, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              {/* KYC Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
                  const isSelected = kycFilter === status;
                  const count =
                    status === 'all'
                      ? technicians.length
                      : technicians.filter((t) => t.verification_status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setKycFilter(status)}
                      className={cn(
                        'text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5',
                        isSelected
                          ? 'bg-foreground text-background border-foreground font-semibold shadow-2xs'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <span className="capitalize">{status === 'all' ? 'All' : status === 'pending' ? 'Pending KYC' : status}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.2 text-[10px]',
                          isSelected ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={() => setAddOpen(true)} className="gap-2 h-9 rounded-xl shrink-0" size="sm">
              <Plus className="h-4 w-4" />
              Add Technician
            </Button>
          </div>

          {/* Technicians & KYC Table */}
          <div className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Partner</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Skills & Experience</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>ID Proof</TableHead>
                  <TableHead>Earnings & Rating</TableHead>
                  <TableHead>Workload / Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTechs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={Wrench}
                        title="No technicians found"
                        description={search ? `No partners matching "${search}"` : 'No partner technicians registered under this filter.'}
                        action={{ label: 'Add Technician', onClick: () => setAddOpen(true) }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechs.map((t) => {
                    const isActive = t.is_active !== false;
                    const isOnline = Boolean(t.is_online);
                    const kycStatus = t.verification_status ?? 'pending';

                    return (
                      <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                        {/* 1. Partner Profile + Online Indicator */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {t.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={t.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-border/50" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold ring-2 ring-border/50">
                                  {(t.full_name ?? '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              {/* Live Online Ping Indicator */}
                              <div
                                className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center"
                                title={isOnline ? 'Partner is currently Online in HandyMan app' : 'Offline'}
                              >
                                {isOnline ? (
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-card" />
                                  </span>
                                ) : (
                                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 border-2 border-card" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                                {t.full_name ?? 'Unnamed Partner'}
                                {isOnline && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">ID: {t.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Contact Info */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{t.phone ?? 'No phone'}</div>
                          <div className="truncate max-w-[150px] mt-0.5">{t.email ?? '—'}</div>
                        </TableCell>

                        {/* 3. Skills & Experience */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(t.skills && t.skills.length > 0) ? (
                                t.skills.slice(0, 2).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">General Service</span>
                              )}
                              {(t.skills && t.skills.length > 2) && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  +{t.skills.length - 2}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-medium">
                              {t.experience_years ? `${t.experience_years} yrs exp` : 'New partner'}
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. KYC Status */}
                        <TableCell>
                          {kycStatus === 'approved' && (
                            <Badge variant="success" dot className="text-xs gap-1 font-medium">
                              <ShieldCheck className="h-3 w-3" />
                              Approved
                            </Badge>
                          )}
                          {kycStatus === 'pending' && (
                            <div className="space-y-1">
                              <Badge variant="warning" dot pulse className="text-xs gap-1 font-medium">
                                <Clock className="h-3 w-3" />
                                Pending Review
                              </Badge>
                            </div>
                          )}
                          {kycStatus === 'rejected' && (
                            <div className="space-y-1">
                              <Badge variant="destructive" className="text-xs gap-1 font-medium">
                                <ShieldAlert className="h-3 w-3" />
                                Rejected
                              </Badge>
                              {t.rejection_reason && (
                                <p className="text-[10px] text-destructive/80 max-w-[140px] truncate" title={t.rejection_reason}>
                                  {t.rejection_reason}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* 5. ID Proof & Document Viewer */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold">
                              {t.id_type || 'ID Proof'}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {maskId(t.id_number)}
                            </div>
                            {t.id_document_url ? (
                              <button
                                type="button"
                                onClick={() => openDocPreview(t)}
                                className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium mt-0.5"
                              >
                                <Eye className="h-3 w-3" />
                                View Doc
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic">No file</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Wallet Balance & Rating */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-foreground tabular-nums">
                              {formatCurrency(t.wallet_balance ?? 0)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">
                              {t.bank_upi_id ? `UPI: ${t.bank_upi_id}` : 'UPI not set'}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{Number(t.rating ?? 5.0).toFixed(1)}</span>
                              <span className="text-muted-foreground text-[10px] font-normal">
                                ({t.total_completed_jobs ?? 0} jobs)
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 7. Workload & Active Status Switch */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold tabular-nums">{t.active_bookings ?? 0}</span>
                              <span className="text-[11px] text-muted-foreground">active</span>
                            </div>
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
                              className={`w-9 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                                isActive ? 'bg-emerald-500' : 'bg-muted'
                              }`}
                              title={isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  isActive ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </TableCell>

                        {/* 8. Quick Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick KYC Action Buttons */}
                            {kycStatus !== 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                onClick={() => handleApproveKyc(t.id, t.full_name ?? 'Partner')}
                                disabled={isPending}
                                title="Approve KYC Verification"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            )}

                            {kycStatus !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={() => openRejectModal(t)}
                                disabled={isPending}
                                title="Reject KYC Verification"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            )}

                            {/* Edit Info */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(t)}
                              title="Edit contact info"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {/* Demote */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              onClick={() => {
                                setDemoteId(t.id);
                                setDemoteName(t.full_name ?? 'Technician');
                              }}
                              title="Demote back to customer"
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
        </>
      ) : (
        /* Tab 2: Partner Withdrawals & Payouts */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search partner name, phone, UPI..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Payout Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'pending', 'paid', 'cancelled'] as const).map((status) => {
                const isSelected = payoutStatusFilter === status;
                const count =
                  status === 'all'
                    ? payouts.length
                    : payouts.filter((p) => p.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setPayoutStatusFilter(status)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5',
                      isSelected
                        ? 'bg-foreground text-background border-foreground font-semibold shadow-2xs'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className="capitalize">{status === 'all' ? 'All Payouts' : status}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px]',
                        isSelected ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payouts Table */}
          <div className={`rounded-2xl border bg-card shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-70' : 'opacity-100'}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Partner</TableHead>
                  <TableHead>Withdrawal Amount</TableHead>
                  <TableHead>Payout Destination</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={Wallet}
                        title="No withdrawal requests found"
                        description={payoutSearch ? `No requests matching "${payoutSearch}"` : 'No payout or withdrawal records logged yet.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map((p) => {
                    const isPendingPayout = p.status === 'pending';

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm">{p.technician?.full_name ?? 'Field Partner'}</div>
                          <div className="text-xs text-muted-foreground">{p.technician?.phone ?? '—'}</div>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(p.amount)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-mono font-medium text-foreground">
                            {p.technician?.bank_upi_id ? p.technician.bank_upi_id : 'Bank / Cash'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize font-normal">
                            {p.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {p.status === 'paid' && (
                            <Badge variant="success" dot className="text-xs font-medium">
                              Paid / Settled
                            </Badge>
                          )}
                          {p.status === 'pending' && (
                            <Badge variant="warning" dot pulse className="text-xs font-medium">
                              Pending Settle
                            </Badge>
                          )}
                          {p.status === 'cancelled' && (
                            <Badge variant="destructive" className="text-xs font-medium">
                              Cancelled
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(p.created_at)}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {p.notes || '—'}
                        </TableCell>

                        <TableCell className="text-right">
                          {isPendingPayout ? (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                              disabled={isPending}
                              onClick={() => {
                                setSettlePayoutId(p.id);
                                setSettlePayoutAmount(p.amount);
                                setSettlePayoutTechName(p.technician?.full_name ?? 'Technician');
                              }}
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              Settle Payout
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Settled</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* KYC Rejection Reason Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRejectKycSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Reject Partner Verification
              </DialogTitle>
              <DialogDescription>
                Provide a reason why {rejectTechName}&apos;s KYC is being rejected. This reason will be dispatched to their HandyMan mobile app so they can re-upload proper documents.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <textarea
                  id="rejection-reason"
                  rows={3}
                  required
                  placeholder="e.g. ID photo is blurry, please upload clear Aadhaar card front & back."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-input bg-transparent px-3 py-2 shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground w-full">Quick templates:</span>
                {[
                  'Document photo is blurry/unreadable',
                  'Document name does not match profile name',
                  'ID document is expired',
                  'Please upload government-approved ID proof',
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setRejectReason(template)}
                    className="text-[11px] bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/50 text-foreground transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending || !rejectReason.trim()} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KYC Document Viewer Modal */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-500" />
              {docIdType} — {docTechName}
            </DialogTitle>
            <DialogDescription>
              {docIdNumber ? `ID Number: ${docIdNumber}` : 'Submitted identity document from HandyMan partner app'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {docLoading ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                <span className="text-xs">Fetching signed document preview from storage...</span>
              </div>
            ) : docUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl border overflow-hidden bg-muted/30 max-h-[400px] flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={docUrl}
                    alt={`${docTechName} ID`}
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-xs"
                    onError={(e) => {
                      // Fallback if it's a PDF or unrenderable image
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>Authorized securely via Supabase Storage bucket (`kyc-documents`)</span>
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    Open original in new tab <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-destructive">
                Failed to load document preview.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Payout Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(settlePayoutId)}
        onOpenChange={(open) => !open && setSettlePayoutId(null)}
        title="Mark Partner Withdrawal as Settled?"
        description={`Confirm you have transferred ${formatCurrency(settlePayoutAmount)} to ${settlePayoutTechName}. This will mark the request as paid and send a push notification to their HandyMan app.`}
        confirmLabel="Confirm Settle"
        variant="default"
        onConfirm={handleSettlePayoutConfirm}
      />

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
                <p className="text-[11px] text-muted-foreground">The technician will use this password to sign in to HandyMan app.</p>
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
    </div>
  );
}
