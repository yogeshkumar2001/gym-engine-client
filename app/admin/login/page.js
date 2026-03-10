'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Cookies from 'js-cookie';

export default function AdminLoginPage() {
  const router = useRouter();
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    // Temporarily set cookie so adminApi can use it
    Cookies.set('admin_key', key.trim(), { expires: 1 });
    try {
      await adminApi.globalHealth();
      setAdmin(key.trim());
      toast.success('Admin access granted.');
      router.replace('/admin/dashboard');
    } catch (err) {
      Cookies.remove('admin_key');
      toast.error(err.response?.status === 403 ? 'Invalid admin key.' : 'Cannot reach server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <Card className="w-full max-w-sm bg-gray-800 border-gray-700 text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold text-white">Admin Access</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your admin API key to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key" className="text-gray-200">Admin Key</Label>
              <Input
                id="key"
                type="password"
                placeholder="sk-admin-xxxxxxxx"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                disabled={loading}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Enter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
