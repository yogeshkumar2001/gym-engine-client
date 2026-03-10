'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { memberApi, planApi, ownerApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users, UserCheck, UserX, Clock,
  Plus, Download, RefreshCw, ChevronDown, Pencil, Trash2,
} from 'lucide-react';

// ─── Tabulator (client only) ──────────────────────────────────────────────────
const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function toDateInput(isoString) {
  if (!isoString) return today();
  return new Date(isoString).toISOString().split('T')[0];
}

function computeExpiryPreview(joinDate, durationDays) {
  if (!joinDate || !durationDays) return null;
  const d = new Date(joinDate);
  d.setDate(d.getDate() + parseInt(durationDays, 10));
  return fmtDate(d);
}

// ─── Export helpers ───────────────────────────────────────────────────────────
const EXPORT_FIELDS  = ['name', 'phone', 'plan_name', 'plan_amount', 'plan_duration_days', 'join_date', 'expiry_date'];
const EXPORT_HEADERS = ['Name', 'Phone', 'Plan Name', 'Plan Amount', 'Plan Duration (days)', 'Join Date', 'Expiry Date'];

function fieldVal(member, field) {
  const v = member[field];
  if (field === 'join_date' || field === 'expiry_date') return v ? fmtDate(v) : '';
  return v ?? '';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function exportData(format) {
  const res = await memberApi.list({ limit: 1000 });
  const members = res.data.data.members;

  if (format === 'csv') {
    const rows = [EXPORT_HEADERS, ...members.map((m) =>
      EXPORT_FIELDS.map((f) => `"${String(fieldVal(m, f)).replace(/"/g, '""')}"`)
    )];
    downloadBlob(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }), 'members.csv');
  } else {
    const rows = members.map((m) =>
      `<tr>${EXPORT_FIELDS.map((f) => `<td>${fieldVal(m, f)}</td>`).join('')}</tr>`
    ).join('');
    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${EXPORT_HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr>${rows}</table></body></html>`;
    downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), 'members.xls');
  }
}

// ─── Filters ──────────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'All',           value: 'all' },
  { label: 'Active',        value: 'active' },
  { label: 'Expiring Soon', value: 'expiring_soon' },
  { label: 'Expired',       value: 'expired' },
];

// ─── Member Form (shared by Add + Edit) ──────────────────────────────────────
const EMPTY_FORM = { name: '', phone: '', plan_name: '', plan_amount: '', plan_duration_days: 30, join_date: today() };

function MemberForm({ form, setForm, loading }) {
  const expiry = computeExpiryPreview(form.join_date, form.plan_duration_days);

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} required disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-phone">Phone</Label>
          <Input id="m-phone" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} required disabled={loading} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="m-plan-name">Plan Name</Label>
          <Input id="m-plan-name" placeholder="3 Month" value={form.plan_name} onChange={set('plan_name')} required disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-amount">Plan Amount (₹)</Label>
          <Input id="m-amount" type="number" min="0" step="0.01" placeholder="4000" value={form.plan_amount} onChange={set('plan_amount')} required disabled={loading} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="m-duration">Duration (days)</Label>
          <Input id="m-duration" type="number" min="1" placeholder="90" value={form.plan_duration_days} onChange={set('plan_duration_days')} required disabled={loading} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-join">Join Date</Label>
          <Input id="m-join" type="date" value={form.join_date} onChange={set('join_date')} required disabled={loading} />
        </div>
      </div>
      {expiry && (
        <p className="text-xs text-muted-foreground">
          Expiry date: <span className="font-medium text-foreground">{expiry}</span>
        </p>
      )}
    </div>
  );
}

// ─── Add Member Dialog ────────────────────────────────────────────────────────
function AddMemberDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  // Load active plans for the dropdown
  const { data: plansData } = useQuery({
    queryKey: ['plans', '', 'active', ''],
    queryFn: () => planApi.list({ status: 'active' }).then((r) => r.data.data),
    enabled: open,
  });
  const plans = plansData?.plans ?? [];

  function handlePlanSelect(planId) {
    const plan = plans.find((p) => String(p.id) === planId);
    if (!plan) return;
    setForm((prev) => ({
      ...prev,
      plan_name:          plan.name,
      plan_amount:        plan.price,
      plan_duration_days: plan.duration_days,
    }));
  }

  const mutation = useMutation({
    mutationFn: () => memberApi.create({
      name: form.name.trim(),
      phone: form.phone.trim(),
      plan_name: form.plan_name.trim(),
      plan_amount: parseFloat(form.plan_amount),
      plan_duration_days: parseInt(form.plan_duration_days, 10),
      join_date: form.join_date,
    }),
    onSuccess: () => {
      toast.success('Member added.');
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members-summary'] });
      setForm(EMPTY_FORM);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add member.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <div className="space-y-4 py-2">
            {/* Plan picker — auto-fills plan fields */}
            {plans.length > 0 && (
              <div className="space-y-2">
                <Label>Select Plan <span className="text-muted-foreground text-xs">(auto-fills fields below)</span></Label>
                <Select onValueChange={handlePlanSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} — {fmtAmount(p.price)} · {p.duration_days} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <MemberForm form={form} setForm={setForm} loading={mutation.isPending} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Member Dialog ───────────────────────────────────────────────────────
function EditMemberDialog({ member, open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  // Sync form when member changes
  useState(() => {
    if (member) {
      setForm({
        name: member.name ?? '',
        phone: member.phone ?? '',
        plan_name: member.plan_name ?? '',
        plan_amount: member.plan_amount ?? '',
        plan_duration_days: member.plan_duration_days ?? 30,
        join_date: toDateInput(member.join_date),
      });
    }
  });

  // Reset form each time a different member is opened
  const memberId = member?.id;
  useMemo(() => {
    if (member) {
      setForm({
        name: member.name ?? '',
        phone: member.phone ?? '',
        plan_name: member.plan_name ?? '',
        plan_amount: member.plan_amount ?? '',
        plan_duration_days: member.plan_duration_days ?? 30,
        join_date: toDateInput(member.join_date),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const mutation = useMutation({
    mutationFn: () => memberApi.update(member.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      plan_name: form.plan_name.trim(),
      plan_amount: parseFloat(form.plan_amount),
      plan_duration_days: parseInt(form.plan_duration_days, 10),
      join_date: form.join_date,
    }),
    onSuccess: () => {
      toast.success('Member updated.');
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members-summary'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update member.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <MemberForm form={form} setForm={setForm} loading={mutation.isPending} />
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ member, open, onOpenChange }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => memberApi.remove(member.id),
    onSuccess: () => {
      toast.success(`${member.name} removed.`);
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['members-summary'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Remove <span className="font-semibold text-foreground">{member?.name}</span>?
          Their renewal history is preserved.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline Editable Cell ─────────────────────────────────────────────────────
function EditableCell({ value, type = 'text', memberId, field, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);

  function startEdit() {
    setVal(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function save() {
    setEditing(false);
    if (val === value) return;
    try {
      await memberApi.update(memberId, { [field]: type === 'number' ? parseFloat(val) : val });
      onSaved?.();
      toast.success('Updated.');
    } catch {
      toast.error('Update failed.');
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-full text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors group"
      title="Click to edit"
    >
      {field === 'plan_amount' ? fmtAmount(value) : (value || '—')}
      <Pencil className="inline h-3 w-3 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Expiry badge ─────────────────────────────────────────────────────────────
function ExpiryBadge({ expiryDate }) {
  const now = new Date();
  const exp = new Date(expiryDate);
  const days = Math.ceil((exp - now) / 86400000);

  if (days < 0) {
    return <span className="text-red-500 font-medium">{fmtDate(expiryDate)}</span>;
  }
  if (days <= 7) {
    return <span className="text-orange-500 font-medium">{fmtDate(expiryDate)} <span className="text-xs">({days}d)</span></span>;
  }
  return <span>{fmtDate(expiryDate)}</span>;
}

// ─── Members Page ─────────────────────────────────────────────────────────────
export default function MembersPage() {
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [addOpen, setAddOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ['members-summary'],
    queryFn: () => memberApi.summary().then((r) => r.data.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['members', filter, search],
    queryFn: () =>
      memberApi.list({
        filter: filter === 'all' ? undefined : filter,
        search: search || undefined,
        limit: 200,
      }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const syncMutation = useMutation({
    mutationFn: () => ownerApi.sync(),
    onSuccess: () => {
      toast.success('Sync started. Member list will refresh shortly.');
      qc.invalidateQueries({ queryKey: ['owner-health'] });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['members'] });
        qc.invalidateQueries({ queryKey: ['members-summary'] });
      }, 4000);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Sync failed.'),
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport(format) {
    try {
      await exportData(format);
      toast.success('Export ready!');
    } catch {
      toast.error('Export failed.');
    }
  }

  const invalidateMembers = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['members'] });
    qc.invalidateQueries({ queryKey: ['members-summary'] });
  }, [qc]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Total Members"  value={summary?.total          ?? '—'} icon={Users}      />
        <StatCard title="Active"         value={summary?.active         ?? '—'} icon={UserCheck}  accent="green" />
        <StatCard title="Expiring Soon"  value={summary?.expiring_soon  ?? '—'} icon={Clock}      accent="orange" />
        <StatCard title="Expired"        value={summary?.expired        ?? '—'} icon={UserX}      accent="red" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {/* Filter pills */}
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-3 w-3 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add member
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Export Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load members." />}

      {data && data.members.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No members found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a member manually or click Sync to pull from Google Sheets.
          </p>
        </div>
      )}

      {data && data.members.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <span className="text-xs text-muted-foreground">{data.total} members</span>
            <span className="text-xs text-muted-foreground">Click Plan Name or Amount to edit inline</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan Name</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Join Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Expiry Date</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{m.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.phone}</td>
                  <td className="px-4 py-2.5">
                    <EditableCell
                      value={m.plan_name}
                      type="text"
                      memberId={m.id}
                      field="plan_name"
                      onSaved={invalidateMembers}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <EditableCell
                      value={m.plan_amount}
                      type="number"
                      memberId={m.id}
                      field="plan_amount"
                      onSaved={invalidateMembers}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{m.plan_duration_days}d</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(m.join_date)}</td>
                  <td className="px-4 py-2.5">
                    <ExpiryBadge expiryDate={m.expiry_date} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setEditTarget(m)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(m)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      {editTarget && (
        <EditMemberDialog
          member={editTarget}
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          member={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}
