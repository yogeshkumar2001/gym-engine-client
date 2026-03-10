'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '@/lib/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const SOURCES = ['walk_in', 'referral', 'instagram', 'google'];

const EMPTY = { name: '', phone: '', source: '' };

export default function AddLeadDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const mutation = useMutation({
    mutationFn: () => leadApi.create({ name: form.name.trim(), phone: form.phone.trim(), source: form.source || undefined }),
    onSuccess: () => {
      toast.success('Lead added.');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-funnel'] });
      setForm(EMPTY);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add lead.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name</Label>
            <Input
              id="lead-name"
              placeholder="Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone</Label>
            <Input
              id="lead-phone"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Source <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="How did they find you?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
