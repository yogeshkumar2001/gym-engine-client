'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

function CredBadge({ valid }) {
  if (valid === null || valid === undefined)
    return <Badge variant="outline" className="gap-1"><HelpCircle className="h-3 w-3" />Unchecked</Badge>;
  if (valid)
    return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Valid</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Invalid</Badge>;
}

function CredentialSection({ title, description, fields, values, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {fields.map(({ key, label, placeholder, secret }) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={key} className="text-xs">{label}</Label>
          <Input
            id={key}
            name={key}
            type={secret ? 'password' : 'text'}
            placeholder={placeholder}
            value={values[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            autoComplete="off"
          />
        </div>
      ))}
    </div>
  );
}

const SECTIONS = [
  {
    key: 'razorpay',
    title: 'Razorpay',
    description: 'Used to generate payment links for renewals.',
    validKey: 'razorpay_valid',
    fields: [
      { key: 'razorpay_key_id',         label: 'Key ID',         placeholder: 'rzp_live_xxxx' },
      { key: 'razorpay_key_secret',      label: 'Key Secret',     placeholder: '••••••••', secret: true },
      { key: 'razorpay_webhook_secret',  label: 'Webhook Secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp Business',
    description: 'Used to send renewal reminders and summaries.',
    validKey: 'whatsapp_valid',
    fields: [
      { key: 'whatsapp_phone_number_id', label: 'Phone Number ID', placeholder: '1234567890' },
      { key: 'whatsapp_access_token',    label: 'Access Token',    placeholder: 'EAAxxxxxxx', secret: true },
    ],
  },
  {
    key: 'sheet',
    title: 'Google Sheet',
    description: 'The sheet that contains your member data.',
    validKey: 'sheet_valid',
    fields: [
      { key: 'google_sheet_id', label: 'Sheet ID', placeholder: 'From the sheet URL' },
    ],
  },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({});

  const { data: health } = useQuery({
    queryKey: ['owner-health'],
    queryFn: () => ownerApi.health().then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: () => ownerApi.updateCredentials(form),
    onSuccess: (res) => {
      toast.success(`Updated: ${res.data.data.updated.join(', ')}`);
      setForm({});
      qc.invalidateQueries({ queryKey: ['owner-health'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed.'),
  });

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const hasChanges = Object.values(form).some((v) => v && v.trim());

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Update any integration credentials. Leave a field blank to keep the existing value.
            Validity is re-checked overnight.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{section.title}</p>
                <CredBadge valid={health?.[section.validKey]} />
              </div>
              <p className="text-xs text-muted-foreground">{section.description}</p>
              {section.fields.map(({ key, label, placeholder, secret }) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key} className="text-xs">{label}</Label>
                  <Input
                    id={key}
                    name={key}
                    type={secret ? 'password' : 'text'}
                    placeholder={placeholder}
                    value={form[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          ))}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!hasChanges || mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? 'Saving…' : 'Save credentials'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
