'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadApi } from '@/lib/api';
import FunnelStats from '@/components/leads/FunnelStats';
import LeadsTable from '@/components/leads/LeadsTable';
import AddLeadDialog from '@/components/leads/AddLeadDialog';
import UpdateStageDialog from '@/components/leads/UpdateStageDialog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorState from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export default function LeadsPage() {
  const [activeStage, setActiveStage] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState(null); // lead being moved

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leads', activeStage],
    queryFn: () =>
      leadApi.list({
        stage: activeStage || undefined,
        limit: 200,
      }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Lead Funnel</h2>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add lead
        </Button>
      </div>

      {/* Funnel stats — clicking a stage sets the table filter */}
      <FunnelStats onStageClick={setActiveStage} activeStage={activeStage} />

      {/* Active filter badge */}
      {activeStage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Showing stage:
          <span className="font-medium text-foreground capitalize">
            {activeStage.replace('_', ' ')}
          </span>
          <button
            className="underline text-xs"
            onClick={() => setActiveStage(null)}
          >
            clear
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Failed to load leads." />}
      {data && data.leads?.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No leads found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &quot;Add lead&quot; to start tracking prospects.
          </p>
        </div>
      )}
      {data && data.leads?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">{data.total} leads</p>
          <LeadsTable
            leads={data.leads}
            onStage={(lead) => setStageTarget(lead)}
          />
        </div>
      )}

      {/* Add lead dialog */}
      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Move stage dialog */}
      <UpdateStageDialog
        lead={stageTarget}
        open={!!stageTarget}
        onOpenChange={(v) => { if (!v) setStageTarget(null); }}
      />
    </div>
  );
}
