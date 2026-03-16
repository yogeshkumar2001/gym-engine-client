'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, User, ShieldCheck, CalendarDays, Phone,
  CreditCard, Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(v) {
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function statusColor(status) {
  if (status === 'active')  return 'bg-green-100 text-green-700';
  if (status === 'expired') return 'bg-red-100 text-red-700';
  if (status === 'churned') return 'bg-gray-100 text-gray-600';
  return 'bg-yellow-100 text-yellow-700';
}

function renewalStatusBadge(status) {
  const map = {
    paid:              'bg-green-100 text-green-700',
    link_generated:    'bg-blue-100 text-blue-700',
    pending:           'bg-yellow-100 text-yellow-700',
    processing_link:   'bg-purple-100 text-purple-700',
    failed:            'bg-red-100 text-red-700',
    dead:              'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="max-w-5xl mx-auto flex gap-6">
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Separator />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-5">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="bg-white rounded-xl border p-6 space-y-3">
            <Skeleton className="h-5 w-40" />
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MemberProfilePage() {
  const { memberId } = useParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['member', memberId],
    queryFn:  () => memberApi.get(memberId).then((r) => r.data.data),
    enabled:  !!memberId,
  });

  const member   = data;
  const renewals = useMemo(() => (member?.renewals ?? []), [member]);

  // ── Identity form state ──────────────────────────────────────────────────
  const [identity, setIdentity] = useState(null);

  // Initialise form once member loads (run only when member changes)
  const memberId_ = member?.id;
  useMemo(() => {
    if (!member) return;
    setIdentity({
      photo_url:      member.photo_url      ?? '',
      id_proof_type:  member.id_proof_type  ?? '',
      id_proof_number: member.id_proof_number ?? '',
      id_proof_url:   member.id_proof_url   ?? '',
    });
  }, [memberId_]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (data) => memberApi.updateProfile(memberId, data),
    onSuccess: () => {
      toast.success('Profile updated successfully.');
      qc.invalidateQueries({ queryKey: ['member', memberId] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile.'),
  });

  function handleSave(e) {
    e.preventDefault();
    if (!identity) return;

    // Client validation: if id_proof_number is set, id_proof_type is required
    if (identity.id_proof_number && !identity.id_proof_type) {
      toast.error('Please select an ID proof type when providing an ID number.');
      return;
    }

    // Strip empty strings → undefined so backend ignores them
    const payload = {};
    if (identity.photo_url)       payload.photo_url       = identity.photo_url;
    if (identity.id_proof_type)   payload.id_proof_type   = identity.id_proof_type;
    if (identity.id_proof_number) payload.id_proof_number = identity.id_proof_number;
    if (identity.id_proof_url)    payload.id_proof_url    = identity.id_proof_url;

    mutation.mutate(payload);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading || !identity) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/members')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="mt-10 text-center text-red-500">
          {error.response?.data?.message || 'Failed to load member.'}
        </p>
      </div>
    );
  }

  const isExpired = member.expiry_date && new Date(member.expiry_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/members')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Members
      </Button>

      <div className="max-w-5xl mx-auto flex gap-6 items-start">
        {/* ── Left panel — Member summary ─────────────────────────────────── */}
        <div className="w-72 shrink-0 sticky top-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 mb-5">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{initials(member.name)}</span>
                </div>
              )}
              <h2 className="font-semibold text-base text-center leading-tight">{member.name}</h2>
              <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor(member.status)}`}>
                {member.status}
              </span>
            </div>

            <Separator className="mb-4" />

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">{member.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{member.plan_name}</p>
                  <p className="text-xs">{fmtAmount(member.plan_amount)} · {member.plan_duration_days}d</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium text-foreground">{fmtDate(member.join_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-foreground'}`}>
                    {fmtDate(member.expiry_date)}
                  </p>
                  {isExpired && <p className="text-xs text-red-500">Expired</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-5">

          {/* Identity section */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Identity & Documents</h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Photo URL */}
              <div className="space-y-1.5">
                <Label htmlFor="photo_url">Profile Photo URL</Label>
                {member.photo_url ? (
                  <Input
                    id="photo_url"
                    value={identity.photo_url}
                    onChange={(e) => setIdentity((p) => ({ ...p, photo_url: e.target.value }))}
                    placeholder="https://..."
                    disabled={mutation.isPending}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Input
                      id="photo_url"
                      value={identity.photo_url}
                      onChange={(e) => setIdentity((p) => ({ ...p, photo_url: e.target.value }))}
                      placeholder="https://..."
                      disabled={mutation.isPending}
                    />
                    {!identity.photo_url && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Not Added</span>
                    )}
                  </div>
                )}
              </div>

              {/* ID proof type */}
              <div className="space-y-1.5">
                <Label htmlFor="id_proof_type">ID Proof Type</Label>
                <Select
                  value={identity.id_proof_type}
                  onValueChange={(v) => setIdentity((p) => ({ ...p, id_proof_type: v }))}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="id_proof_type">
                    <SelectValue placeholder={member.id_proof_type ? undefined : 'Not Added — select to add'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhar">Aadhaar</SelectItem>
                    <SelectItem value="pan">PAN</SelectItem>
                    <SelectItem value="voter">Voter ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ID proof number */}
              <div className="space-y-1.5">
                <Label htmlFor="id_proof_number">ID Proof Number</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="id_proof_number"
                    value={identity.id_proof_number}
                    onChange={(e) => setIdentity((p) => ({ ...p, id_proof_number: e.target.value }))}
                    placeholder={member.id_proof_number || 'Not Added'}
                    disabled={mutation.isPending}
                  />
                  {!member.id_proof_number && !identity.id_proof_number && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Not Added</span>
                  )}
                </div>
              </div>

              {/* Document URL */}
              <div className="space-y-1.5">
                <Label htmlFor="id_proof_url">Document URL</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="id_proof_url"
                    value={identity.id_proof_url}
                    onChange={(e) => setIdentity((p) => ({ ...p, id_proof_url: e.target.value }))}
                    placeholder="https://..."
                    disabled={mutation.isPending}
                  />
                  {!member.id_proof_url && !identity.id_proof_url && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Not Added</span>
                  )}
                </div>
                {member.id_proof_url && (
                  <a
                    href={member.id_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View current document →
                  </a>
                )}
              </div>

              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save Identity'}
              </Button>
            </form>
          </div>

          {/* Membership summary */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Membership Overview</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-5">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
                <p className="font-medium">{member.plan_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Fee</p>
                <p className="font-medium">{fmtAmount(member.plan_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                <p className="font-medium">{member.plan_duration_days} days</p>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Renewal history */}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Renewal History
            </h4>

            {renewals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No renewals recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {renewals.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {r.status === 'paid'   && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {r.status === 'failed' && <XCircle      className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {r.status === 'dead'   && <XCircle      className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                      {!['paid','failed','dead'].includes(r.status) && (
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                      )}
                      <span className="text-muted-foreground text-xs">{fmtDate(r.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{fmtAmount(r.amount)}</span>
                      {r.payment_method && (
                        <span className="text-xs text-muted-foreground capitalize">{r.payment_method}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${renewalStatusBadge(r.status)}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
