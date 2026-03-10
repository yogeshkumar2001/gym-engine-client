'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const setOwner = useAuthStore((s) => s.setOwner);

  const [form, setForm] = useState({
    gym_name: '',
    owner_name: '',
    phone: '',
    pin: '',
    email:'',
    confirm_pin: '',
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(form.pin)) {
      toast.error('PIN must be 4–6 digits.');
      return;
    }
    if (form.pin !== form.confirm_pin) {
      toast.error('PINs do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        gym_name: form.gym_name.trim(),
        owner_name: form.owner_name.trim(),
        phone: form.phone.trim(),
        pin: form.pin,
      });
      const { token, gym_id, onboarding_token } = data.data;
      setOwner(token, gym_id);
      Cookies.set('onboarding_token', onboarding_token, { expires: 1, sameSite: 'strict' });
      toast.success('Gym registered! Connect your credentials next.');
      router.replace('/onboarding');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Register your gym</CardTitle>
          <CardDescription>Create your gym account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gym_name">Gym name</Label>
              <Input
                id="gym_name"
                name="gym_name"
                placeholder="Fitness First"
                value={form.gym_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Your name</Label>
              <Input
                id="owner_name"
                name="owner_name"
                placeholder="Rahul Sharma"
                value={form.owner_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number (WhatsApp)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="9876543210"
                value={form.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 digits)</Label>
                <Input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  maxLength={6}
                  value={form.pin}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_pin">Confirm PIN</Label>
                <Input
                  id="confirm_pin"
                  name="confirm_pin"
                  type="password"
                  placeholder="••••"
                  maxLength={4}
                  value={form.confirm_pin}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
