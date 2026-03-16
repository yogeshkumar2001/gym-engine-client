'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, memberApi } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CalendarCheck, Users, CalendarDays, Search, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function duration(inAt, outAt) {
  if (!outAt) return 'Active';
  const mins = Math.round((new Date(outAt) - new Date(inAt)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Check-in widget ───────────────────────────────────────────────────────────
function CheckInWidget({ onSuccess }) {
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['member-search', search],
    queryFn: () => memberApi.list({ search, limit: 8 }).then((r) => r.data.data?.members ?? []),
    enabled: search.trim().length >= 2,
  });

  const checkInMutation = useMutation({
    mutationFn: (memberId) => attendanceApi.checkIn(memberId),
    onSuccess: (res) => {
      const name = res.data.data?.member?.name || 'Member';
      toast.success(`${name} checked in.`);
      setSearch('');
      setSelectedMember(null);
      setShowDropdown(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Check-in failed.'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (memberId) => attendanceApi.checkOut(memberId),
    onSuccess: (res) => {
      const name = res.data.data?.member?.name || 'Member';
      toast.success(`${name} checked out.`);
      setSearch('');
      setSelectedMember(null);
      setShowDropdown(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Check-out failed.'),
  });

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4" /> Quick Check-in / Check-out
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative max-w-sm">
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedMember(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />

          {showDropdown && search.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto">
              {isFetching && (
                <p className="text-xs text-muted-foreground px-3 py-2">Searching…</p>
              )}
              {!isFetching && (!searchResults || searchResults.length === 0) && (
                <p className="text-xs text-muted-foreground px-3 py-2">No members found.</p>
              )}
              {searchResults?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                  onMouseDown={() => {
                    setSelectedMember(m);
                    setSearch(m.name);
                    setShowDropdown(false);
                  }}
                >
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMember && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium">{selectedMember.name}</span>
            <span className="text-xs text-muted-foreground">{selectedMember.phone}</span>
            <Button
              size="sm"
              onClick={() => checkInMutation.mutate(selectedMember.id)}
              disabled={isPending}
              className="gap-1"
            >
              <LogIn className="h-3.5 w-3.5" />
              Check In
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkOutMutation.mutate(selectedMember.id)}
              disabled={isPending}
              className="gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              Check Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Peak hours chart ──────────────────────────────────────────────────────────
function PeakHoursChart({ peakHours }) {
  if (!peakHours || peakHours.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  // Fill all hours 5am–11pm with 0 as baseline
  const hourMap = new Map(peakHours.map((h) => [h.hour, h.count]));
  const chartData = Array.from({ length: 19 }, (_, i) => {
    const hour = i + 5;
    return {
      label: hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
      count: hourMap.get(hour) || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" name="Check-ins" fill="#3b82f6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(todayISO());

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => attendanceApi.stats().then((r) => r.data.data),
  });

  const { data: listData, isLoading: listLoading, isError: listError } = useQuery({
    queryKey: ['attendance-list', dateFilter],
    queryFn: () => attendanceApi.list({ date: dateFilter, limit: 100 }).then((r) => r.data.data),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['attendance-stats'] });
    qc.invalidateQueries({ queryKey: ['attendance-list', dateFilter] });
  }

  const records = listData?.records ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Today" value={stats?.today_count ?? 0} icon={CalendarCheck} accent="green" />
          <StatCard title="This Week" value={stats?.week_count ?? 0} icon={CalendarDays} />
          <StatCard title="This Month" value={stats?.month_count ?? 0} icon={Users} />
        </div>
      )}

      {/* Check-in widget */}
      <CheckInWidget onSuccess={invalidate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance log */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Daily Log</h3>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">{listData?.total ?? 0} records</span>
          </div>

          {listLoading && <LoadingSpinner />}
          {listError && <ErrorState message="Failed to load attendance log." />}

          {!listLoading && records.length === 0 && (
            <p className="text-sm text-muted-foreground">No check-ins for this date.</p>
          )}

          <div className="space-y-1.5">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {r.member?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{r.member?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.member?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{fmtTime(r.checked_in_at)}</span>
                  <span>→</span>
                  <span>{fmtTime(r.checked_out_at)}</span>
                  <Badge variant={r.checked_out_at ? 'outline' : 'default'} className="text-xs">
                    {duration(r.checked_in_at, r.checked_out_at)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: peak hours + top members */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Peak Hours (last 30 days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {statsLoading ? <LoadingSpinner /> : <PeakHoursChart peakHours={stats?.peak_hours} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Members this Month</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {statsLoading && <LoadingSpinner />}
              {stats?.top_members?.length === 0 && (
                <p className="text-xs text-muted-foreground">No visits this month.</p>
              )}
              {stats?.top_members?.map((m, i) => (
                <div key={m.member_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <Badge variant="secondary">{m.visit_count} visits</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
