'use client';

import { useQuery } from '@tanstack/react-query';
import { leadApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';

const STAGE_META = {
  walk_in:   { label: 'Walk-ins',  color: '#3b82f6', bg: '#eff6ff' },
  trial:     { label: 'Trials',    color: '#f59e0b', bg: '#fffbeb' },
  converted: { label: 'Converted', color: '#22c55e', bg: '#f0fdf4' },
  lost:      { label: 'Lost',      color: '#ef4444', bg: '#fef2f2' },
};

export default function FunnelStats({ onStageClick, activeStage }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['lead-funnel'],
    queryFn: () => leadApi.funnel().then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingSpinner className="h-20" />;
  if (isError) return <ErrorState message="Could not load funnel stats." />;

  const counts = data?.by_stage || {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(STAGE_META).map(([stage, meta]) => {
          const isActive = activeStage === stage;
          return (
            <button
              key={stage}
              onClick={() => onStageClick(isActive ? null : stage)}
              className="text-left rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
              style={{
                background: isActive ? meta.color : meta.bg,
                borderColor: meta.color,
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: isActive ? '#fff' : meta.color }}
              >
                {meta.label}
              </p>
              <p
                className="text-3xl font-bold mt-1"
                style={{ color: isActive ? '#fff' : '#1e293b' }}
              >
                {counts[stage] ?? 0}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground px-1">
        <span>
          Total: <strong className="text-foreground">{data?.total_leads ?? 0}</strong>
        </span>
        <span>
          Conversion rate:{' '}
          <strong className="text-foreground">
            {Math.round((data?.conversion_rate || 0) * 100)}%
          </strong>
        </span>
        <span>
          Trial → Converted:{' '}
          <strong className="text-foreground">
            {Math.round((data?.trial_to_conversion_rate || 0) * 100)}%
          </strong>
        </span>
      </div>
    </div>
  );
}
