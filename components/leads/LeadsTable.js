'use client';

import dynamic from 'next/dynamic';

const TabulatorTable = dynamic(() => import('@/components/shared/TabulatorTable'), { ssr: false });

const STAGE_COLORS = {
  walk_in:   { bg: '#3b82f6', text: '#1e3a5f' },
  trial:     { bg: '#f59e0b', text: '#78350f' },
  converted: { bg: '#22c55e', text: '#14532d' },
  lost:      { bg: '#ef4444', text: '#7f1d1d' },
};

function stageCell(cell) {
  const v = cell.getValue();
  const c = STAGE_COLORS[v] || { bg: '#e2e8f0', text: '#64748b' };
  const label = v.replace('_', ' ');
  return `<span style="
    display:inline-block;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600;
    background:${c.bg}20;color:${c.text};border:1px solid ${c.bg}60;text-transform:capitalize
  ">${label}</span>`;
}

function dateCell(cell) {
  const v = cell.getValue();
  if (!v) return '<span style="color:#94a3b8">—</span>';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function actionCell(onStage) {
  return (cell) => {
    const row = cell.getRow().getData();
    if (row.stage === 'converted' || row.stage === 'lost') {
      return `<span style="color:#94a3b8;font-size:12px">Terminal</span>`;
    }
    const btn = document.createElement('button');
    btn.textContent = 'Move stage';
    btn.style.cssText = `
      font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;
      background:#f1f5f9;border:1px solid #cbd5e1;color:#334155;
    `;
    btn.addEventListener('click', () => onStage(row));
    return btn;
  };
}

export default function LeadsTable({ leads, onStage }) {
  const columns = [
    { title: 'Name',       field: 'name',        sorter: 'string', minWidth: 140 },
    { title: 'Phone',      field: 'phone',        sorter: 'string', minWidth: 120 },
    { title: 'Source',     field: 'source',       sorter: 'string',
      formatter: (c) => c.getValue() || '<span style="color:#94a3b8">—</span>' },
    { title: 'Stage',      field: 'stage',        formatter: stageCell, hozAlign: 'center' },
    { title: 'Trial Start', field: 'trial_start', formatter: dateCell, sorter: 'date' },
    { title: 'Trial End',  field: 'trial_end',    formatter: dateCell, sorter: 'date' },
    { title: 'Lost Reason', field: 'lost_reason',
      formatter: (c) => c.getValue() || '<span style="color:#94a3b8">—</span>' },
    { title: 'Added',      field: 'created_at',   formatter: dateCell, sorter: 'date' },
    {
      title: 'Action',
      field: '_action',
      formatter: actionCell(onStage),
      hozAlign: 'center',
      headerSort: false,
      width: 110,
    },
  ];

  return <TabulatorTable columns={columns} data={leads} height="520px" />;
}
