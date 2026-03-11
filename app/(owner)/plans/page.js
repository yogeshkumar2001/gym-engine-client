'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { planApi } from '@/lib/api';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ClipboardList, Users, TrendingUp, Star, Plus, RefreshCw,
} from 'lucide-react';

// Tabulator — client only
const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

function fmtRevenue(v) {
  if (v == null) return '—';
  return v >= 1000
    ? `₹${(v / 1000).toFixed(1)}k`
    : `₹${Number(v).toLocaleString('en-IN')}`;
}

const EMPTY_FORM = { name: '', duration_days: '', price: '', status: 'active' };

// ─── Plan Form (shared by Add + Edit) ────────────────────────────────────────
function PlanForm({ form, setForm, loading }) {
  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="p-name">Plan Name</Label>
        <Input
          id="p-name"
          placeholder="3 Month"
          value={form.name}
          onChange={set('name')}
          required
          disabled={loading}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="p-duration">Duration (days)</Label>
          <Input
            id="p-duration"
            type="number"
            min="1"
            placeholder="90"
            value={form.duration_days}
            onChange={set('duration_days')}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-price">Price (₹)</Label>
          <Input
            id="p-price"
            type="number"
            min="0"
            step="0.01"
            placeholder="4000"
            value={form.price}
            onChange={set('price')}
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={form.status}
          onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Add Plan Dialog ──────────────────────────────────────────────────────────
function AddPlanDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () => planApi.create({
      name:          form.name.trim(),
      duration_days: parseInt(form.duration_days, 10),
      price:         parseFloat(form.price),
      status:        form.status,
    }),
    onSuccess: () => {
      toast.success('Plan created.');
      qc.refetchQueries({ queryKey: ['plans'] });
      qc.refetchQueries({ queryKey: ['plans-summary'] });
      setForm(EMPTY_FORM);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create plan.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <PlanForm form={form} setForm={setForm} loading={mutation.isPending} />
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Plan Dialog ─────────────────────────────────────────────────────────
function EditPlanDialog({ plan, open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const planId = plan?.id;
  useMemo(() => {
    if (plan) {
      setForm({
        name:          plan.name ?? '',
        duration_days: plan.duration_days ?? '',
        price:         plan.price ?? '',
        status:        plan.status ?? 'active',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const mutation = useMutation({
    mutationFn: () => planApi.update(plan.id, {
      name:          form.name.trim(),
      duration_days: parseInt(form.duration_days, 10),
      price:         parseFloat(form.price),
      status:        form.status,
    }),
    onSuccess: () => {
      toast.success('Plan updated.');
      qc.refetchQueries({ queryKey: ['plans'] });
      qc.refetchQueries({ queryKey: ['plans-summary'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update plan.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
          <PlanForm form={form} setForm={setForm} loading={mutation.isPending} />
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

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeletePlanDialog({ plan, open, onOpenChange }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => planApi.remove(plan.id),
    onSuccess: (res) => {
      const msg = res.data?.data?.inactivated
        ? `"${plan.name}" has members — marked as inactive.`
        : `"${plan.name}" deleted.`;
      toast.success(msg);
      qc.refetchQueries({ queryKey: ['plans'] });
      qc.refetchQueries({ queryKey: ['plans-summary'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete plan</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{plan?.name}</span>?
          </p>
          {plan?.active_members > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
              This plan has <strong>{plan.active_members}</strong> active member(s).
              It will be marked <strong>inactive</strong> instead of deleted.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Deleting…' : plan?.active_members > 0 ? 'Mark inactive' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plans Page ───────────────────────────────────────────────────────────────
export default function PlansPage() {
  const qc                          = useQueryClient();
  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [delTarget, setDelTarget]   = useState(null);

  // Stable refs so Tabulator action formatters always call latest setters
  const editRef = useRef(setEditTarget);
  const delRef  = useRef(setDelTarget);
  editRef.current = setEditTarget;
  delRef.current  = setDelTarget;

  // ── Seed mutation ─────────────────────────────────────────────────────────
  const seedMutation = useMutation({
    mutationFn: () => planApi.seed(),
    onSuccess: (res) => {
      const { created, skipped } = res.data.data;
      if (created === 0) {
        toast.info(skipped > 0 ? 'All member plans already exist.' : 'No member plans found to seed.');
      } else {
        toast.success(
          `${created} plan(s) seeded from member data.${skipped > 0 ? ` (${skipped} already existed)` : ''}`,
        );
      }
      qc.refetchQueries({ queryKey: ['plans'] });
      qc.refetchQueries({ queryKey: ['plans-summary'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Seed failed.'),
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ['plans-summary'],
    queryFn: () => planApi.summary().then((r) => r.data.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => planApi.list().then((r) => r.data.data),
  });

  // ── Tabulator column defs ─────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      title: 'Plan Name',
      field: 'name',
      minWidth: 160,
      sorter: 'string',
      headerFilter: 'input',
      headerFilterPlaceholder: 'Filter name…',
    },
    {
      title: 'Price',
      field: 'price',
      minWidth: 110,
      sorter: 'number',
      hozAlign: 'right',
      headerHozAlign: 'right',
      headerFilter: 'number',
      headerFilterPlaceholder: '≥ price',
      headerFilterFunc: '>=',
      formatter: (cell) => fmtAmount(cell.getValue()),
    },
    {
      title: 'Duration (days)',
      field: 'duration_days',
      minWidth: 130,
      sorter: 'number',
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerFilter: 'number',
      headerFilterPlaceholder: '≥ days',
      headerFilterFunc: '>=',
    },
    {
      title: 'Active Members',
      field: 'active_members',
      minWidth: 130,
      sorter: 'number',
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerFilter: 'number',
      headerFilterPlaceholder: '≥ members',
      headerFilterFunc: '>=',
    },
    {
      title: 'Revenue',
      field: 'revenue_generated',
      minWidth: 120,
      sorter: 'number',
      hozAlign: 'right',
      headerHozAlign: 'right',
      headerFilter: false,
      formatter: (cell) => fmtRevenue(cell.getValue()),
    },
    {
      title: 'Status',
      field: 'status',
      minWidth: 110,
      sorter: 'string',
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerFilter: 'select',
      headerFilterParams: {
        values: { '': 'All', active: 'Active', inactive: 'Inactive' },
        clearable: true,
      },
      formatter: (cell) => {
        const v = cell.getValue();
        const isActive = v === 'active';
        const span = document.createElement('span');
        span.textContent = v;
        span.style.cssText = `
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
          background: ${isActive ? '#dcfce7' : '#f3f4f6'};
          color: ${isActive ? '#166534' : '#6b7280'};
        `;
        return span;
      },
    },
    {
      title: 'Actions',
      field: 'id',
      minWidth: 110,
      hozAlign: 'center',
      headerHozAlign: 'center',
      headerSort: false,
      headerFilter: false,
      formatter: (cell) => {
        const row  = cell.getRow().getData();
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:4px;justify-content:center;align-items:center;';

        const editBtn = document.createElement('button');
        editBtn.title = 'Edit';
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit`;
        editBtn.style.cssText = `
          display:inline-flex;align-items:center;gap:3px;padding:3px 8px;
          border:1px solid #e2e8f0;border-radius:6px;font-size:11px;
          background:#fff;cursor:pointer;color:#374151;
        `;
        editBtn.onmouseenter = () => { editBtn.style.background = '#f8fafc'; };
        editBtn.onmouseleave = () => { editBtn.style.background = '#fff'; };
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editRef.current(row);
        });

        const delBtn = document.createElement('button');
        delBtn.title = 'Delete';
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
        delBtn.style.cssText = `
          display:inline-flex;align-items:center;padding:3px 6px;
          border:1px solid #fecaca;border-radius:6px;font-size:11px;
          background:#fff;cursor:pointer;color:#ef4444;
        `;
        delBtn.onmouseenter = () => { delBtn.style.background = '#fef2f2'; };
        delBtn.onmouseleave = () => { delBtn.style.background = '#fff'; };
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          delRef.current(row);
        });

        wrap.appendChild(editBtn);
        wrap.appendChild(delBtn);
        return wrap;
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const tableData = data?.plans ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Total Plans"
          value={summary?.total ?? '—'}
          icon={ClipboardList}
        />
        <StatCard
          title="Active Plans"
          value={summary?.active ?? '—'}
          icon={Users}
          accent="green"
        />
        <StatCard
          title="Most Popular"
          value={summary?.most_popular?.name ?? '—'}
          sub={summary?.most_popular ? `${summary.most_popular.active_members} active members` : undefined}
          icon={Star}
          accent="blue"
        />
        <StatCard
          title="Highest Revenue"
          value={summary?.highest_revenue?.name ?? '—'}
          sub={summary?.highest_revenue ? fmtAmount(summary.highest_revenue.revenue_generated) : undefined}
          icon={TrendingUp}
          accent="purple"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {tableData.length > 0 ? `${tableData.length} plan${tableData.length !== 1 ? 's' : ''}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            title="Auto-create plans from existing member data"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
            {seedMutation.isPending ? 'Seeding…' : 'Seed from members'}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add plan
          </Button>
        </div>
      </div>

      {/* States */}
      {isLoading && <LoadingSpinner />}
      {isError   && <ErrorState message="Failed to load plans." />}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="rounded-lg border overflow-hidden">
          <TabulatorTable
            columns={columns}
            data={tableData}
            height="520px"
            options={{
              placeholder: tableData.length === 0
                ? 'No plans yet. Click "Add plan" or "Seed from members".'
                : 'No matching plans.',
            }}
          />
        </div>
      )}

      {/* Dialogs */}
      <AddPlanDialog open={addOpen} onOpenChange={setAddOpen} />
      {editTarget && (
        <EditPlanDialog
          plan={editTarget}
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        />
      )}
      {delTarget && (
        <DeletePlanDialog
          plan={delTarget}
          open={!!delTarget}
          onOpenChange={(v) => { if (!v) setDelTarget(null); }}
        />
      )}
    </div>
  );
}
