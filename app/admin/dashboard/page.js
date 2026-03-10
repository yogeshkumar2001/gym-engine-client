'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import {
  Building2, CheckCircle, AlertTriangle, XCircle, IndianRupee,
  RotateCcw, MessageCircleOff, Clock, ShieldAlert,
} from 'lucide-react';

const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtT = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function AdminDashboardPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['admin-global-health'],
    queryFn: () => adminApi.globalHealth().then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError)   return <ErrorState message="Could not load global health. Check admin key." />;

  const d = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Global Health</h2>
        <span className="text-xs text-gray-500">
          Updated {fmtT(new Date(dataUpdatedAt).toISOString())}
        </span>
      </div>

      {/* Gym counts */}
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Gyms</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Gyms"  value={d.totalGyms}       icon={Building2} />
          <StatCard title="Active"      value={d.activeGyms}      icon={CheckCircle}  accent="green" />
          <StatCard title="Error"       value={d.errorGyms}       icon={XCircle}      accent="red" />
          <StatCard title="Onboarding"  value={d.onboardingGyms}  icon={Clock} />
        </div>
      </section>

      {/* Alerts */}
      {(d.gymsWithErrorsLast24h > 0 || d.gymsWithInvalidCredentials > 0 || d.stuckRenewalsCount > 0) && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Alerts</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {d.gymsWithErrorsLast24h > 0 && (
              <Card className="bg-red-950 border-red-800">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" /> Gyms errored (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{d.gymsWithErrorsLast24h}</p>
                </CardContent>
              </Card>
            )}
            {d.gymsWithInvalidCredentials > 0 && (
              <Card className="bg-yellow-950 border-yellow-800">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-yellow-400 flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3" /> Invalid credentials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{d.gymsWithInvalidCredentials}</p>
                </CardContent>
              </Card>
            )}
            {d.stuckRenewalsCount > 0 && (
              <Card className="bg-orange-950 border-orange-800">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-orange-400 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Stuck renewals (&gt;10 min)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-white">{d.stuckRenewalsCount}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Today */}
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Today</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Revenue Today"  value={fmt(d.totalRevenueToday)} icon={IndianRupee} accent="green" />
          <StatCard title="Renewals Paid"  value={d.totalPaidToday}         icon={RotateCcw} />
        </div>
      </section>

      {/* Renewal pipeline */}
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Renewal pipeline</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Link Generated"  value={d.totalLinkGenerated} />
          <StatCard title="Pending"         value={d.totalPendingRenewals} />
          <StatCard title="Dead"            value={d.totalDeadRenewals}   icon={XCircle}          accent="red" />
          <StatCard title="WA Failed"       value={d.totalFailedWhatsApp} icon={MessageCircleOff} accent="red" />
        </div>
      </section>

      <p className="text-xs text-gray-600">
        Last credential health cron: {fmtT(d.lastHealthCheckRunAt)}
      </p>
    </div>
  );
}
