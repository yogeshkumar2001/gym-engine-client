'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { renewalApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

const STATUS_OPTIONS = ['all', 'link_generated', 'paid', 'failed', 'dead', 'pending', 'processing_link'];

const STATUS_COLORS = {
  paid:             { bg: '#22c55e', text: '#166534' },
  link_generated:   { bg: '#3b82f6', text: '#1e3a5f' },
  failed:           { bg: '#ef4444', text: '#7f1d1d' },
  dead:             { bg: '#94a3b8', text: '#334155' },
  pending:          { bg: '#f59e0b', text: '#78350f' },
  processing_link:  { bg: '#a855f7', text: '#3b0764' },
};

function statusCell(cell) {
  const v = cell.getValue();
  const c = STATUS_COLORS[v] || { bg: '#e2e8f0', text: '#64748b' };
  return `<span style="
    display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;
    background:${c.bg}20;color:${c.text};border:1px solid ${c.bg}40
  ">${v.replace('_', ' ')}</span>`;
}

function dateCell(cell) {
  const v = cell.getValue();
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function rupeeCell(cell) {
  const v = cell.getValue();
  return v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
}

function memberName(cell) {
  return cell.getRow().getData().member?.name || '—';
}

function memberPhone(cell) {
  return cell.getRow().getData().member?.phone || '—';
}

function planName(cell) {
  return cell.getRow().getData().member?.plan_name || '—';
}

const COLUMNS = [
  { title: 'Member',       field: 'member',       formatter: memberName,  sorter: 'string', minWidth: 140 },
  { title: 'Phone',        field: '_phone',        formatter: memberPhone, minWidth: 120 },
  { title: 'Plan',         field: '_plan',         formatter: planName },
  { title: 'Amount',       field: 'amount',        formatter: rupeeCell,   sorter: 'number', hozAlign: 'right' },
  { title: 'Status',       field: 'status',        formatter: statusCell,  hozAlign: 'center' },
  { title: 'WhatsApp',     field: 'whatsapp_status', sorter: 'string' },
  { title: 'Retries',      field: 'retry_count',   sorter: 'number',       hozAlign: 'center' },
  { title: 'Created',      field: 'created_at',    formatter: dateCell,    sorter: 'date' },
  { title: 'Updated',      field: 'updated_at',    formatter: dateCell,    sorter: 'date' },
];

export default function RenewalsPage() {
  const [status, setStatus] = useState('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['renewals', status],
    queryFn: () =>
      renewalApi.list({
        status: status === 'all' ? undefined : status,
        limit: 200,
      }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Renewals</h2>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} total</span>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load renewals." />}
      {data && data.renewals.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No renewals found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Renewals are auto-created when members approach their expiry date.
          </p>
        </div>
      )}
      {data && data.renewals.length > 0 && (
        <TabulatorTable
          columns={COLUMNS}
          data={data.renewals}
          height="600px"
        />
      )}
    </div>
  );
}
