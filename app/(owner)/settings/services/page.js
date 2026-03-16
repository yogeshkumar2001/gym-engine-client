'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerServicesApi } from '@/lib/api';
import ServiceToggle from '@/components/settings/ServiceToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const SERVICE_META = [
  {
    key: 'payments',
    label: 'Razorpay Payments',
    description: 'Automatically generate payment links and process online renewals.',
  },
  {
    key: 'invoice',
    label: 'Invoice Generation',
    description: 'Generate and send PDF invoices on every successful payment.',
    dependsOn: 'payments',
  },
  {
    key: 'whatsapp_reminders',
    label: 'WhatsApp Reminders',
    description: 'Send renewal reminders to members 3 days before their membership expires.',
  },
  {
    key: 'whatsapp_summary',
    label: 'WhatsApp Daily Summary',
    description: 'Send a daily revenue and renewal summary to the gym owner.',
  },
  {
    key: 'google_sheet_sync',
    label: 'Google Sheet Sync',
    description: 'Automatically sync member data from your connected Google Sheet.',
  },
  {
    key: 'offers',
    label: 'Promotional Offers',
    description: 'Enable special offer messaging for leads and lapsed members.',
  },
];

function ServicesSkeleton() {
  return (
    <div className="space-y-3">
      {SERVICE_META.map((s) => (
        <Skeleton key={s.key} className="h-[72px] w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();

  const { data: remoteServices, isLoading } = useQuery({
    queryKey: ['owner-services'],
    queryFn: () => ownerServicesApi.getServices().then((r) => r.data.data),
  });

  // Local state — only committed on Save
  const [local, setLocal] = useState(null);

  // Sync from server on first load (or after invalidate)
  useEffect(() => {
    if (remoteServices && !local) {
      setLocal(remoteServices);
    }
  }, [remoteServices]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () => ownerServicesApi.updateServices(local),
    onSuccess: (res) => {
      toast.success('Automation settings saved.');
      qc.invalidateQueries({ queryKey: ['owner-services'] });
      setLocal(res.data.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save settings.'),
  });

  function handleToggle(key, value) {
    setLocal((prev) => {
      const next = { ...prev, [key]: value };
      // If payments is turned off, also disable invoice (depends on payments)
      if (key === 'payments' && !value) {
        next.invoice = false;
      }
      return next;
    });
  }

  const hasChanges =
    local && remoteServices
      ? Object.keys(local).some((k) => local[k] !== remoteServices[k])
      : false;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Automation Services</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Enable or disable automation features for your gym. Changes only apply after saving.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Toggles</CardTitle>
          <CardDescription>
            Disabling a service stops the associated automation immediately on the next scheduled run.
            Disabling Payments will also disable Invoice generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading || !local ? (
            <ServicesSkeleton />
          ) : (
            SERVICE_META.map((meta) => {
              const isDisabled = meta.dependsOn ? !local[meta.dependsOn] : false;
              return (
                <ServiceToggle
                  key={meta.key}
                  id={meta.key}
                  label={meta.label}
                  description={meta.description}
                  checked={local[meta.key] ?? false}
                  onChange={(val) => handleToggle(meta.key, val)}
                  disabled={isDisabled}
                />
              );
            })
          )}

          <Button
            className="w-full mt-2"
            onClick={() => mutation.mutate()}
            disabled={!hasChanges || mutation.isPending || isLoading}
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
