'use client';

import { useQuery } from '@tanstack/react-query';
import { ownerApi, ownerAnalyticsApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import {
  Users, RotateCcw, IndianRupee, AlertTriangle, CheckCircle, Clock, ShieldAlert,
} from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function StatusBadge({ status }) {
  const map = {
    active:     { label: 'Active',     variant: 'default' },
    onboarding: { label: 'Onboarding', variant: 'secondary' },
    error:      { label: 'Error',      variant: 'destructive' },
    suspended:  { label: 'Suspended',  variant: 'outline' },
  };
  const cfg = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function DashboardPage() {
  const healthQ = useQuery({
    queryKey: ['owner-health'],
    queryFn: () => ownerApi.health().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const forecastQ = useQuery({
    queryKey: ['owner-forecast', 30],
    queryFn: () => ownerAnalyticsApi.forecast(30).then((r) => r.data.data),
  });

  if (healthQ.isLoading || forecastQ.isLoading) return <LoadingSpinner />;
  if (healthQ.isError) return <ErrorState message="Could not load dashboard data." />;

  const h = healthQ.data || {};
  const f = forecastQ.data || {};
  const renewals = h.renewals || {};

  const totalRenewals = Object.values(renewals).reduce((s, n) => s + n, 0);

  // Bar chart data for renewal pipeline
  const chartData = [
    { name: 'Confirmed', value: f.confirmed_revenue || 0, fill: '#22c55e' },
    { name: 'From Pending', value: f.expected_from_pending || 0, fill: '#3b82f6' },
    { name: 'From Upcoming', value: f.expected_from_upcoming || 0, fill: '#a855f7' },
    { name: 'At Risk', value: f.at_risk_revenue || 0, fill: '#ef4444' },
  ];

  const credIssues = [
    h.razorpay_valid === false && 'Razorpay',
    h.whatsapp_valid === false && 'WhatsApp',
    h.sheet_valid === false && 'Google Sheet',
  ].filter(Boolean);

  const daysUntilExpiry = h.subscription_expires_at
    ? Math.ceil((new Date(h.subscription_expires_at) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <StatusBadge status={h.status} />
      </div>

      {credIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Credential issue detected for: <strong>{credIssues.join(', ')}</strong>.{' '}
            <Link href="/settings" className="underline underline-offset-2">
              Update in Settings
            </Link>
          </span>
        </div>
      )}

      {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
        <div className="flex items-start gap-3 rounded-md border border-orange-500/40 bg-orange-500/5 px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {daysUntilExpiry <= 0
              ? 'Your subscription has expired. Renewal reminders and automation are paused.'
              : `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew to avoid interruption.`}
          </span>
        </div>
      )}

      {h.last_sync_error && (
        <div className="flex items-start gap-3 rounded-md border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Last sync failed: {h.last_sync_error}</span>
        </div>
      )}

      {h.last_synced_at && (
        <p className="text-xs text-muted-foreground">
          Last synced:{' '}
          {new Date(h.last_synced_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          {h.last_sync_member_count != null && ` · ${h.last_sync_member_count} members`}
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={fmt(h.today_revenue)}
          icon={IndianRupee}
          accent="green"
        />
        <StatCard
          title="Active Renewals"
          value={renewals['link_generated'] ?? 0}
          sub="awaiting payment"
          icon={Clock}
        />
        <StatCard
          title="Paid Renewals"
          value={renewals['paid'] ?? 0}
          sub="all time"
          icon={CheckCircle}
          accent="green"
        />
        <StatCard
          title="Failed / Dead"
          value={(renewals['failed'] || 0) + (renewals['dead'] || 0)}
          sub="need attention"
          icon={AlertTriangle}
          accent="red"
        />
      </div>

      {/* Revenue pipeline chart */}
      {forecastQ.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              30-day Revenue Pipeline
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Total expected: {fmt(f.total_expected_revenue)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Forecast quick stats */}
      {forecastQ.data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Renewals"
            value={f.pending_renewal_count}
            sub={fmt(f.pending_renewal_value) + ' pending value'}
            icon={RotateCcw}
          />
          <StatCard
            title="Upcoming Members"
            value={f.upcoming_members_count}
            sub="expiring in 30 days"
            icon={Users}
          />
          <StatCard
            title="Conversion Rate"
            value={`${Math.round((f.conversion_rate || 0) * 100)}%`}
            sub={`${f.historical_sample_size} sample renewals`}
          />
          <StatCard
            title="At-Risk Revenue"
            value={fmt(f.at_risk_revenue)}
            sub="may not convert"
            icon={AlertTriangle}
            accent="yellow"
          />
        </div>
      )}

      {h.last_error_message && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Last error: {h.last_error_message}
        </div>
      )}
    </div>
  );
}
