'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { adminApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';

const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

const STATUS_COLORS = {
  active:     '#22c55e',
  onboarding: '#3b82f6',
  error:      '#ef4444',
  suspended:  '#94a3b8',
};

function statusCell(cell) {
  const v = cell.getValue();
  const c = STATUS_COLORS[v] || '#94a3b8';
  return `<span style="
    display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;
    background:${c}20;color:${c};border:1px solid ${c}40;text-transform:capitalize
  ">${v}</span>`;
}

function credCell(cell) {
  const v = cell.getValue();
  if (v === null)  return '<span style="color:#6b7280">—</span>';
  if (v === true)  return '<span style="color:#22c55e">✓</span>';
  return '<span style="color:#ef4444">✗</span>';
}

function dateCell(cell) {
  const v = cell.getValue();
  if (!v) return '<span style="color:#6b7280">—</span>';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function subCell(cell) {
  const v = cell.getValue();
  if (!v) return '<span style="color:#22c55e;font-size:11px">Unlimited</span>';
  const past = new Date(v) < new Date();
  const color = past ? '#ef4444' : '#f59e0b';
  return `<span style="color:${color};font-size:11px">${new Date(v).toLocaleDateString('en-IN')}</span>`;
}

export default function GymsPage() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-gyms'],
    queryFn: () => adminApi.listGyms().then((r) => r.data.data),
  });

  const columns = [
    { title: 'ID',      field: 'id',     sorter: 'number', width: 60, hozAlign: 'center' },
    { title: 'Name',    field: 'name',   sorter: 'string', minWidth: 160 },
    { title: 'Owner Phone', field: 'owner_phone', sorter: 'string', minWidth: 130 },
    { title: 'Status',  field: 'status', formatter: statusCell, hozAlign: 'center', width: 110 },
    { title: 'Razorpay', field: 'razorpay_valid', formatter: credCell, hozAlign: 'center', width: 90 },
    { title: 'WhatsApp', field: 'whatsapp_valid', formatter: credCell, hozAlign: 'center', width: 90 },
    { title: 'Sheet',    field: 'sheet_valid',    formatter: credCell, hozAlign: 'center', width: 70 },
    { title: 'Subscription', field: 'subscription_expires_at', formatter: subCell, minWidth: 120 },
    { title: 'Last Health', field: 'last_health_check_at', formatter: dateCell, sorter: 'date', minWidth: 120 },
    {
      title: 'Detail',
      field: '_detail',
      headerSort: false,
      width: 80,
      hozAlign: 'center',
      formatter: (cell) => {
        const btn = document.createElement('button');
        btn.textContent = 'View →';
        btn.style.cssText = `
          font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;
          background:#1d4ed8;border:none;color:#fff;
        `;
        btn.addEventListener('click', () => {
          router.push(`/admin/gyms/${cell.getRow().getData().id}`);
        });
        return btn;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">All Gyms</h2>
        {data && <span className="text-sm text-gray-400">{data.total} gyms</span>}
      </div>

      {isLoading && <LoadingSpinner />}
      {isError   && <ErrorState message="Failed to load gyms." />}
      {data && (
        <TabulatorTable
          columns={columns}
          data={data.gyms}
          height="620px"
          options={{
            rowClick: (_e, row) => router.push(`/admin/gyms/${row.getData().id}`),
          }}
        />
      )}
    </div>
  );
}
