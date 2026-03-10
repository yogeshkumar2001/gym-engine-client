'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Building2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Global Health', icon: Globe },
  { href: '/admin/gyms',      label: 'Gyms',          icon: Building2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    toast.success('Admin session ended.');
    router.replace('/admin/login');
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-gray-900 text-white px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <ShieldCheck className="h-6 w-6 text-blue-400" />
        <span className="font-bold text-lg tracking-tight">Admin Panel</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator className="my-3 bg-gray-700" />

      <Button
        variant="ghost"
        className="justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-gray-800"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </aside>
  );
}
