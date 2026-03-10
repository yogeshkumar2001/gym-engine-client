'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardList, Users, TrendingUp, Star, Plus, Pencil, Trash2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

const SORT_OPTIONS = [
  { label: 'Default',        value: '' },
  { label: 'Price',          value: 'price' },
  { label: 'Duration',       value: 'duration_days' },
  { label: 'Revenue',        value: 'revenue_generated' },
  { label: 'Active Members', value: 'active_members' },
];

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
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['plans-summary'] });
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
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['plans-summary'] });
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
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['plans-summary'] });
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
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [sort, setSort]             = useState('');
  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [delTarget, setDelTarget]   = useState(null);

  const { data: summary } = useQuery({
    queryKey: ['plans-summary'],
    queryFn: () => planApi.summary().then((r) => r.data.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['plans', search, status, sort],
    queryFn: () =>
      planApi.list({
        search:  search  || undefined,
        status:  status  || undefined,
        sort:    sort    || undefined,
      }).then((r) => r.data.data),
    keepPreviousData: true,
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search plan name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
          />
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort || 'default'} onValueChange={(v) => setSort(v === 'default' ? '' : v)}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value || 'default'} value={o.value || 'default'}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add plan
        </Button>
      </div>

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {isError   && <ErrorState message="Failed to load plans." />}

      {data && data.plans.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No plans yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add plan&quot; to create your first membership plan.
          </p>
        </div>
      )}

      {data && data.plans.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plan Name</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Duration</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Price</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Active Members</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Revenue Generated</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.plans.map((p) => (
                <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{p.duration_days} days</td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmtAmount(p.price)}</td>
                  <td className="px-4 py-2.5 text-center">{p.active_members}</td>
                  <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                    {fmtAmount(p.revenue_generated)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setEditTarget(p)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-500 hover:text-red-600"
                        onClick={() => setDelTarget(p)}
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
