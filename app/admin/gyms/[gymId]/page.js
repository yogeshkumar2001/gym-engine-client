'use client';

import { useState } from 'react';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import SubscriptionDialog from '@/components/admin/SubscriptionDialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, IndianRupee, RotateCcw, AlertTriangle, CheckCircle,
  XCircle, Users, TrendingUp, Calendar,
} from 'lucide-react';

const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct  = (n) => `${Math.round((n || 0) * 100)}%`;
const fmtD = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Credential validity badge ─────────────────────────────────────────────────
function CredBadge({ label, valid }) {
  if (valid === null) return <Badge variant="outline">{label}: unchecked</Badge>;
  return (
    <Badge variant={valid ? 'default' : 'destructive'}>
      {label}: {valid ? 'valid' : 'invalid'}
    </Badge>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ gymId, gymName }) {
  const [subOpen, setSubOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-gym-health', gymId],
    queryFn: () => adminApi.gymDeepHealth(gymId).then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Failed to load gym health." />;

  const { gym, renewalBreakdown, todayStats, stuckRenewalsCount, failedWhatsAppCount, retryStats, credentialStatus } = data;

  const renewalChartData = Object.entries(renewalBreakdown).map(([status, count]) => ({
    name: status.replace('_', ' '),
    count,
  }));

  const subExpiresAt = gym.subscription_expires_at;
  const subExpired   = subExpiresAt && new Date(subExpiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Gym summary bar */}
      <div className="flex flex-wrap items-center gap-3">
        <CredBadge label="Razorpay" valid={credentialStatus.razorpayValid} />
        <CredBadge label="WhatsApp" valid={credentialStatus.whatsappValid} />
        <CredBadge label="Sheet"    valid={credentialStatus.sheetValid} />
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-3 w-3" />
          Sub expires:{' '}
          <span className={subExpired ? 'text-red-400 font-semibold' : 'text-white'}>
            {subExpiresAt ? fmtD(subExpiresAt) : 'Unlimited'}
          </span>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSubOpen(true)}>
            Edit
          </Button>
        </div>
      </div>

      {/* Today */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Revenue Today"  value={fmt(todayStats.revenueRecovered)} icon={IndianRupee} accent="green" />
        <StatCard title="Renewals Paid"  value={todayStats.renewalsPaid}          icon={RotateCcw} />
        <StatCard title="WA Reminders"   value={todayStats.remindersSent} />
      </div>

      {/* Alerts */}
      {(stuckRenewalsCount > 0 || failedWhatsAppCount > 0 || retryStats.maxRetryReached > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard title="Stuck Renewals"  value={stuckRenewalsCount}         icon={AlertTriangle} accent="red" />
          <StatCard title="WA Failed"       value={failedWhatsAppCount}         icon={AlertTriangle} accent="red" />
          <StatCard title="Max Retry Hit"   value={retryStats.maxRetryReached}  sub={`Avg ${retryStats.avgRetryCount} retries`} icon={AlertTriangle} accent="yellow" />
        </div>
      )}

      {/* Last error */}
      {gym.last_error_message && (
        <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          Last error: {gym.last_error_message}
        </div>
      )}

      {/* Renewal breakdown chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm text-gray-300">Renewal breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={renewalChartData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#f9fafb' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <SubscriptionDialog
        gymId={gymId}
        gymName={gymName}
        open={subOpen}
        onOpenChange={setSubOpen}
      />
    </div>
  );
}

// ── Forecast tab ──────────────────────────────────────────────────────────────
function ForecastTab({ gymId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-forecast', gymId],
    queryFn: () => adminApi.forecast(gymId).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Failed to load forecast." />;

  const f = data;
  const chartData = [
    { name: 'Confirmed',     value: f.confirmed_revenue },
    { name: 'From Pending',  value: f.expected_from_pending },
    { name: 'From Upcoming', value: f.expected_from_upcoming },
    { name: 'At Risk',       value: f.at_risk_revenue },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Expected"  value={fmt(f.total_expected_revenue)} icon={IndianRupee} accent="green" />
        <StatCard title="Confirmed MTD"   value={fmt(f.confirmed_revenue)}      sub={`${f.confirmed_count} paid`} />
        <StatCard title="Conversion Rate" value={pct(f.conversion_rate)}        icon={TrendingUp} />
        <StatCard title="At-Risk Revenue" value={fmt(f.at_risk_revenue)}        icon={AlertTriangle} accent="red" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Pending Renewals"  value={f.pending_renewal_count} sub={fmt(f.pending_renewal_value)} icon={RotateCcw} />
        <StatCard title="Upcoming Members"  value={f.upcoming_members_count} sub={`${fmt(f.upcoming_members_value)} pipeline`} icon={Users} />
      </div>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={42}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', color: '#f9fafb' }} formatter={(v) => fmt(v)} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Recovery tab ──────────────────────────────────────────────────────────────
function RecoveryTab({ gymId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-recovery', gymId],
    queryFn: () => adminApi.recoveryStats(gymId).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Failed to load recovery stats." />;

  const r = data;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Expired Unpaid"    value={r.expired_unpaid_members}  icon={XCircle} accent="red" />
      <StatCard title="In Recovery"       value={r.in_recovery_count}       icon={RotateCcw} />
      <StatCard title="Recovered"         value={r.recovered_count}         sub={fmt(r.recovered_revenue)} icon={CheckCircle} accent="green" />
      <StatCard title="Recovery Rate"     value={pct(r.recovery_rate)} />
      <StatCard title="Step 1 (active)"   value={r.recovery_step_breakdown.step_1} />
      <StatCard title="Step 2 (discount)" value={r.recovery_step_breakdown.step_2} />
      <StatCard title="Discounts Used"    value={r.discount_applied_count} />
      <StatCard title="Revenue Recovered" value={fmt(r.recovered_revenue)} icon={IndianRupee} accent="green" />
    </div>
  );
}

// ── Reactivation tab ──────────────────────────────────────────────────────────
function ReactivationTab({ gymId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-reactivation', gymId],
    queryFn: () => adminApi.reactivationStats(gymId).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Failed to load reactivation stats." />;

  const d = data;
  const campaigns = d.campaigns_by_status || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Churned Members"    value={d.churned_members} icon={Users} />
        <StatCard title="Campaigns Sent"     value={campaigns.sent || 0} />
        <StatCard title="Converted"          value={campaigns.converted || 0} icon={CheckCircle} accent="green" />
        <StatCard title="Conversion Rate"    value={pct(d.reactivation_conversion_rate)} icon={TrendingUp} />
      </div>
      <StatCard title="Reactivated Revenue"  value={fmt(d.reactivated_revenue)} icon={IndianRupee} accent="green" />
    </div>
  );
}

// ── Leads tab ─────────────────────────────────────────────────────────────────
function LeadsTab({ gymId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-leads', gymId],
    queryFn: () => adminApi.leadStats(gymId).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Failed to load lead stats." />;

  const d = data;
  const counts = d.by_stage || {};
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Total Leads"     value={d.total_leads} icon={Users} />
      <StatCard title="Walk-ins"        value={counts.walk_in || 0} />
      <StatCard title="Trials"          value={counts.trial || 0} />
      <StatCard title="Converted"       value={counts.converted || 0} icon={CheckCircle} accent="green" />
      <StatCard title="Lost"            value={counts.lost || 0}      icon={XCircle} accent="red" />
      <StatCard title="Conversion Rate" value={pct(d.conversion_rate)} icon={TrendingUp} />
      <StatCard title="Trial → Converted" value={pct(d.trial_to_conversion_rate)} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GymDetailPage({ params }) {
  const { gymId } = use(params);
  const id = parseInt(gymId, 10);

  // Fetch gym name for the header and subscription dialog
  const { data: gymsList } = useQuery({
    queryKey: ['admin-gyms'],
    queryFn: () => adminApi.listGyms().then((r) => r.data.data),
  });
  const gymName = gymsList?.gyms?.find((g) => g.id === id)?.name || `Gym #${id}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/gyms"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-xl font-bold text-white">{gymName}</h2>
        <span className="text-xs text-gray-500">ID #{id}</span>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          {['overview', 'forecast', 'recovery', 'reactivation', 'leads'].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700 capitalize"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab gymId={id} gymName={gymName} />
        </TabsContent>
        <TabsContent value="forecast">
          <ForecastTab gymId={id} />
        </TabsContent>
        <TabsContent value="recovery">
          <RecoveryTab gymId={id} />
        </TabsContent>
        <TabsContent value="reactivation">
          <ReactivationTab gymId={id} />
        </TabsContent>
        <TabsContent value="leads">
          <LeadsTab gymId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
