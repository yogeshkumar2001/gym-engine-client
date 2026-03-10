'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  RotateCcw,
  FileText,
  TrendingUp,
  BarChart2,
  Settings,
  LogOut,
  Dumbbell,
} from 'lucide-react';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/members',    label: 'Members',     icon: Users },
  { href: '/plans',      label: 'Plans',       icon: ClipboardList },
  { href: '/renewals',   label: 'Renewals',    icon: RotateCcw },
  { href: '/invoices',   label: 'Invoices',    icon: FileText },
  { href: '/leads',      label: 'Lead Funnel', icon: TrendingUp },
  { href: '/analytics',  label: 'Analytics',   icon: BarChart2 },
  { href: '/settings',   label: 'Settings',    icon: Settings },
];

export default function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    toast.success('Logged out.');
    router.replace('/login');
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <Dumbbell className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">GymEngine</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator className="my-3" />

      <Button
        variant="ghost"
        className="justify-start gap-3 text-muted-foreground hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </aside>
  );
}
