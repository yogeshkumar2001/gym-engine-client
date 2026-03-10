'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { ownerAnalyticsApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { IndianRupee, Users, TrendingUp, AlertTriangle } from 'lucide-react';

const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (n) => `${Math.round((n || 0) * 100)}%`;

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

// ── LTV member table columns ─────────────────────────────────────────────────
const LTV_COLUMNS = [
  { title: 'Name',         field: 'name',              sorter: 'string', minWidth: 140 },
  { title: 'Phone',        field: 'phone',             sorter: 'string', minWidth: 120 },
  { title: 'Plan',         field: 'plan_name',         sorter: 'string' },
  { title: 'Status',       field: 'status',            sorter: 'string' },
  { title: 'Total Paid',   field: 'total_paid',        sorter: 'number', hozAlign: 'right',
    formatter: (c) => fmt(c.getValue()) },
  { title: 'Payments',     field: 'payment_count',     sorter: 'number', hozAlign: 'center' },
  { title: 'Retention (mo)', field: 'retention_months', sorter: 'number', hozAlign: 'center' },
];

// ── Plan report table columns ────────────────────────────────────────────────
const PLAN_COLUMNS = [
  { title: 'Plan',         field: 'plan_name',           sorter: 'string', minWidth: 160 },
  { title: 'Members',      field: 'member_count',        sorter: 'number', hozAlign: 'center' },
  { title: 'Avg Amount',   field: 'avg_plan_amount',     sorter: 'number', hozAlign: 'right',
    formatter: (c) => fmt(c.getValue()) },
  { title: 'Avg LTV',      field: 'avg_ltv',             sorter: 'number', hozAlign: 'right',
    formatter: (c) => fmt(c.getValue()) },
  { title: 'Avg Retention (mo)', field: 'avg_retention_months', sorter: 'number', hozAlign: 'center' },
  { title: 'Total Revenue', field: 'total_revenue',      sorter: 'number', hozAlign: 'right',
    formatter: (c) => fmt(c.getValue()) },
];

// ── Forecast section ─────────────────────────────────────────────────────────
function ForecastSection() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast', days],
    queryFn: () => ownerAnalyticsApi.forecast(days).then((r) => r.data.data),
  });

  const chartData = data
    ? [
        { name: 'Confirmed',     value: data.confirmed_revenue,       fill: '#22c55e' },
        { name: 'From Pending',  value: data.expected_from_pending,    fill: '#3b82f6' },
        { name: 'From Upcoming', value: data.expected_from_upcoming,   fill: '#a855f7' },
        { name: 'At Risk',       value: data.at_risk_revenue,          fill: '#ef4444' },
      ]
    : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Revenue Forecast</h3>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load forecast." />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Expected" value={fmt(data.total_expected_revenue)} icon={IndianRupee} accent="green" />
            <StatCard title="Confirmed (MTD)" value={fmt(data.confirmed_revenue)} sub={`${data.confirmed_count} paid`} />
            <StatCard title="Conversion Rate" value={pct(data.conversion_rate)} sub={`${data.historical_sample_size} samples`} icon={TrendingUp} />
            <StatCard title="At-Risk Revenue" value={fmt(data.at_risk_revenue)} icon={AlertTriangle} accent="red" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pipeline Breakdown ({days}-day window)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

// ── LTV section ───────────────────────────────────────────────────────────────
function LtvSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ltv'],
    queryFn: () => ownerAnalyticsApi.ltvReport().then((r) => r.data.data),
  });

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Member LTV Report</h3>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load LTV report." />}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Members"          value={data.total_members}              icon={Users} />
            <StatCard title="Paying Members"         value={data.members_with_payments} />
            <StatCard title="Lifetime Revenue"       value={fmt(data.total_lifetime_revenue)} icon={IndianRupee} accent="green" />
            <StatCard title="Avg LTV"                value={fmt(data.avg_member_ltv)}         sub={`Avg retention: ${data.avg_retention_months} mo`} />
          </div>
          <TabulatorTable columns={LTV_COLUMNS} data={data.members} height="420px" />
        </>
      )}
    </section>
  );
}

// ── Plan profitability section ────────────────────────────────────────────────
function PlansSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => ownerAnalyticsApi.planReport().then((r) => r.data.data),
  });

  const chartData = data?.plans?.map((p) => ({
    name: p.plan_name,
    revenue: p.total_revenue,
    members: p.member_count,
  }));

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Plan Profitability</h3>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load plan report." />}
      {data && (
        <>
          {chartData && chartData.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => name === 'revenue' ? fmt(v) : v} />
                    <Legend />
                    <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="r" dataKey="members" name="Members" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <TabulatorTable columns={PLAN_COLUMNS} data={data.plans} height="300px" />
        </>
      )}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
      <ForecastSection />
      <LtvSection />
      <PlansSection />
    </div>
  );
}
