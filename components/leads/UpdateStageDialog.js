'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Valid forward transitions per current stage
const NEXT_STAGES = {
  walk_in: ['trial', 'converted', 'lost'],
  trial:   ['converted', 'lost'],
};

const STAGE_LABELS = {
  walk_in: 'Walk-in',
  trial: 'Trial',
  converted: 'Converted',
  lost: 'Lost',
};

export default function UpdateStageDialog({ lead, open, onOpenChange }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState('');
  const [trialStart, setTrialStart] = useState('');
  const [trialEnd, setTrialEnd] = useState('');
  const [lostReason, setLostReason] = useState('');

  // Reset form whenever the lead changes
  useEffect(() => {
    setStage('');
    setTrialStart('');
    setTrialEnd('');
    setLostReason('');
  }, [lead?.id]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { stage };
      if (stage === 'trial') {
        if (trialStart) payload.trial_start = trialStart;
        if (trialEnd)   payload.trial_end   = trialEnd;
      }
      if (stage === 'lost' && lostReason) {
        payload.lost_reason = lostReason;
      }
      return leadApi.updateStage(lead.id, payload);
    },
    onSuccess: () => {
      toast.success(`Lead moved to ${STAGE_LABELS[stage]}.`);
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-funnel'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Stage update failed.'),
  });

  if (!lead) return null;

  const options = NEXT_STAGES[lead.stage] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move lead stage</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{lead.name}</span>
            {' '}is currently{' '}
            <Badge variant="secondary">{STAGE_LABELS[lead.stage]}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>New stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select next stage…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {stage === 'trial' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="trial-start">Trial start</Label>
                <Input
                  id="trial-start"
                  type="date"
                  value={trialStart}
                  onChange={(e) => setTrialStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trial-end">Trial end</Label>
                <Input
                  id="trial-end"
                  type="date"
                  value={trialEnd}
                  onChange={(e) => setTrialEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {stage === 'converted' && (
            <p className="text-sm text-muted-foreground rounded-md bg-green-50 border border-green-200 px-3 py-2">
              Lead will be marked converted and conversion time recorded automatically.
            </p>
          )}

          {stage === 'lost' && (
            <div className="space-y-2">
              <Label htmlFor="lost-reason">
                Lost reason <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="lost-reason"
                placeholder="e.g. Too expensive, chose competitor…"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!stage || mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Update stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
