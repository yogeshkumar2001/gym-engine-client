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
import { IndianRupee, Users, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

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

// ── Retention Section ─────────────────────────────────────────────────────────
// Heatmap cell: white → green gradient based on pct (0–100)
function heatColor(pct) {
  if (pct === 0) return 'bg-muted text-muted-foreground';
  if (pct >= 75) return 'bg-green-600 text-white';
  if (pct >= 50) return 'bg-green-400 text-white';
  if (pct >= 25) return 'bg-green-200 text-green-900';
  return 'bg-green-50 text-green-800';
}

function RetentionSection() {
  const { data: cohortData, isLoading: cohortLoading, isError: cohortError } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => ownerAnalyticsApi.cohorts().then((r) => r.data.data),
  });

  const { data: retentionData, isLoading: retLoading, isError: retError } = useQuery({
    queryKey: ['retention'],
    queryFn: () => ownerAnalyticsApi.retention().then((r) => r.data.data),
  });

  const retentionChartData = retentionData?.curve?.map((pt) => ({
    name: `Mo ${pt.month}`,
    rate: Math.round(pt.retention_rate * 100),
    count: pt.retained_count,
  }));

  // Determine how many month columns to show (trim trailing zero-only columns)
  const maxMonthCol = (() => {
    if (!cohortData || cohortData.length === 0) return 6;
    let max = 0;
    for (const cohort of cohortData) {
      for (const m of cohort.months) {
        if (m.count > 0 && m.month > max) max = m.month;
      }
    }
    return Math.max(max, 3);
  })();

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5" /> Retention Analysis
      </h3>

      {/* Retention curve chart */}
      {(retLoading) && <LoadingSpinner />}
      {retError && <ErrorState message="Failed to load retention curve." />}
      {retentionData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Retention Curve — % of members who renewed by each month milestone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mb-4 text-sm text-muted-foreground">
              <span>Total members: <strong className="text-foreground">{retentionData.total_members}</strong></span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={retentionChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v, name) => name === 'rate' ? `${v}%` : v} />
                <Legend />
                <Line type="monotone" dataKey="rate" name="Retention %" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="count" name="Members retained" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cohort heatmap */}
      {cohortLoading && <LoadingSpinner />}
      {cohortError && <ErrorState message="Failed to load cohort data." />}
      {cohortData && cohortData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Cohort Heatmap — % of cohort members who renewed each month
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-3 font-medium text-muted-foreground whitespace-nowrap">Cohort</th>
                  <th className="py-1 px-1 text-center font-medium text-muted-foreground">Size</th>
                  {Array.from({ length: maxMonthCol + 1 }, (_, i) => (
                    <th key={i} className="py-1 px-1 text-center font-medium text-muted-foreground">
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr key={cohort.cohort_month} className="border-t border-border/40">
                    <td className="py-1 pr-3 font-mono text-muted-foreground whitespace-nowrap">{cohort.cohort_month}</td>
                    <td className="py-1 px-1 text-center">{cohort.size}</td>
                    {cohort.months.slice(0, maxMonthCol + 1).map((m) => (
                      <td key={m.month} className={`py-1 px-1 text-center rounded ${heatColor(m.pct)}`}>
                        {m.pct > 0 ? `${m.pct}%` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">M0 = join month · M1 = first renewal month · darker green = higher retention</p>
          </CardContent>
        </Card>
      )}
      {cohortData && cohortData.length === 0 && (
        <p className="text-sm text-muted-foreground">No member data available yet.</p>
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
      <RetentionSection />
    </div>
  );
}
