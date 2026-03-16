'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerApi, discountApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle, XCircle, HelpCircle, Percent } from 'lucide-react';

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

// ─── Discount Settings Card ───────────────────────────────────────────────────
function DiscountSettingsCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ['discount-settings'],
    queryFn: () => discountApi.get().then((r) => r.data.data),
    onSuccess: (data) => {
      setForm({
        recovery_discount_percent:    String(data.recovery_discount_percent    ?? 5),
        reactivation_discount_percent: String(data.reactivation_discount_percent ?? 10),
      });
    },
  });

  const mutation = useMutation({
    mutationFn: () => discountApi.update({
      recovery_discount_percent:    Number(form.recovery_discount_percent),
      reactivation_discount_percent: Number(form.reactivation_discount_percent),
    }),
    onSuccess: () => {
      toast.success('Discount settings saved.');
      qc.invalidateQueries({ queryKey: ['discount-settings'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save.'),
  });

  function validate(val) {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 && n <= 50;
  }

  const isValid = form && validate(form.recovery_discount_percent) && validate(form.reactivation_discount_percent);

  if (isLoading || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4" />Recovery Discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Recovery Discounts
        </CardTitle>
        <CardDescription>
          Control the automatic discount offered to members during renewal recovery and win-back campaigns.
          Set to 0 to disable discounts entirely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="recovery_pct" className="text-xs">
              Recovery Discount (%)
            </Label>
            <div className="relative">
              <Input
                id="recovery_pct"
                type="number"
                min="0"
                max="50"
                step="1"
                value={form.recovery_discount_percent}
                onChange={(e) => setForm((p) => ({ ...p, recovery_discount_percent: e.target.value }))}
                disabled={mutation.isPending}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied at recovery Step 2 (Day +4 follow-up). Range: 0–50%.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reactivation_pct" className="text-xs">
              Win-back Discount (%)
            </Label>
            <div className="relative">
              <Input
                id="reactivation_pct"
                type="number"
                min="0"
                max="50"
                step="1"
                value={form.reactivation_discount_percent}
                onChange={(e) => setForm((p) => ({ ...p, reactivation_discount_percent: e.target.value }))}
                disabled={mutation.isPending}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Offered to churned members in win-back campaigns. Range: 0–50%.
            </p>
          </div>
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          size="sm"
        >
          {mutation.isPending ? 'Saving…' : 'Save discount settings'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

      <DiscountSettingsCard />
    </div>
  );
}
