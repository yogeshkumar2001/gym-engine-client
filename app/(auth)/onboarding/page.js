'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STEPS = ['WhatsApp', 'Razorpay', 'Google Sheet'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // WhatsApp
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    // Razorpay
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: '',
    // Google Sheet
    google_sheet_id: '',
    google_sheet_tab: '',
    google_service_account_json: '',
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    try {
      // Parse service account JSON to validate it
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(form.google_service_account_json);
      } catch {
        toast.error('Google service account JSON is invalid.');
        setLoading(false);
        return;
      }

      const gymId = parseInt(Cookies.get('gym_id') || '0', 10);
      const onboardingToken = Cookies.get('onboarding_token') || '';

      if (!gymId || !onboardingToken) {
        toast.error('Session expired. Please register again.');
        router.replace('/register');
        return;
      }

      const res = await authApi.submitCredentials({
        gym_id: gymId,
        onboarding_token: onboardingToken,
        whatsapp_phone_number_id: form.whatsapp_phone_number_id.trim(),
        whatsapp_access_token: form.whatsapp_access_token.trim(),
        razorpay_key_id: form.razorpay_key_id.trim(),
        razorpay_key_secret: form.razorpay_key_secret.trim(),
        razorpay_webhook_secret: form.razorpay_webhook_secret.trim(),
        google_sheet_id: form.google_sheet_id.trim(),
        google_sheet_tab: form.google_sheet_tab.trim(),
        google_service_account_json: serviceAccount,
      });

      if (!res.data?.success) {
        toast.error(res.data?.message || 'Failed to save credentials. Please try again.');
        return;
      }

      Cookies.remove('onboarding_token');
      toast.success('Credentials saved! Your gym is now active.');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <Badge key={s} variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}>
                {i + 1}. {s}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-xl font-bold">Connect {STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'WhatsApp Business API credentials for sending messages to members.'}
            {step === 1 && 'Razorpay credentials for generating payment links.'}
            {step === 2 && 'Google Sheet where your member data lives.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_phone_number_id">Phone Number ID</Label>
                  <Input
                    id="whatsapp_phone_number_id"
                    name="whatsapp_phone_number_id"
                    placeholder="From Meta Business dashboard"
                    value={form.whatsapp_phone_number_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_access_token">Access Token</Label>
                  <Input
                    id="whatsapp_access_token"
                    name="whatsapp_access_token"
                    type="password"
                    placeholder="EAAxxxxxxxx..."
                    value={form.whatsapp_access_token}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="razorpay_key_id">Key ID</Label>
                  <Input
                    id="razorpay_key_id"
                    name="razorpay_key_id"
                    placeholder="rzp_live_xxxx"
                    value={form.razorpay_key_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razorpay_key_secret">Key Secret</Label>
                  <Input
                    id="razorpay_key_secret"
                    name="razorpay_key_secret"
                    type="password"
                    placeholder="••••••••••"
                    value={form.razorpay_key_secret}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razorpay_webhook_secret">Webhook Secret</Label>
                  <Input
                    id="razorpay_webhook_secret"
                    name="razorpay_webhook_secret"
                    type="password"
                    placeholder="••••••••••"
                    value={form.razorpay_webhook_secret}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="google_sheet_id">Google Sheet ID</Label>
                  <Input
                    id="google_sheet_id"
                    name="google_sheet_id"
                    placeholder="From the sheet URL"
                    value={form.google_sheet_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_sheet_tab">Tab name</Label>
                  <Input
                    id="google_sheet_tab"
                    name="google_sheet_tab"
                    placeholder="Members"
                    value={form.google_sheet_tab}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_service_account_json">Service Account JSON</Label>
                  <textarea
                    id="google_service_account_json"
                    name="google_service_account_json"
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder='{"type":"service_account",...}'
                    value={form.google_service_account_json}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading}>
                {step < STEPS.length - 1 ? 'Next' : loading ? 'Saving…' : 'Finish setup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
