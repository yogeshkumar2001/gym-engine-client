'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SubscriptionDialog({ gymId, gymName, open, onOpenChange }) {
  const qc = useQueryClient();
  const [date, setDate] = useState('');
  const [unlimited, setUnlimited] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateSubscription(gymId, {
        subscription_expires_at: unlimited ? null : new Date(date).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Subscription updated.');
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      qc.invalidateQueries({ queryKey: ['admin-gym-health', gymId] });
      onOpenChange(false);
      setDate('');
      setUnlimited(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed.'),
  });

  const canSubmit = unlimited || (date && !isNaN(new Date(date).getTime()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update subscription</DialogTitle>
          <DialogDescription>{gymName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
            />
            <span className="text-sm">Set as unlimited (no expiry)</span>
          </label>

          {!unlimited && (
            <div className="space-y-2">
              <Label htmlFor="sub-date">Expiry date</Label>
              <Input
                id="sub-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
