'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  RotateCcw,
  FileText,
  TrendingUp,
  BarChart2,
  Settings,
  ToggleRight,
  LogOut,
  Dumbbell,
  Upload,
  CalendarCheck,
  Crown,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/members',    label: 'Members',     icon: Users },
  { href: '/import',     label: 'Import',      icon: Upload },
  { href: '/plans',      label: 'Plans',       icon: ClipboardList },
  { href: '/renewals',   label: 'Renewals',    icon: RotateCcw },
  { href: '/invoices',   label: 'Invoices',    icon: FileText },
  { href: '/leads',      label: 'Lead Funnel', icon: TrendingUp },
  { href: '/analytics',  label: 'Analytics',   icon: BarChart2 },
  { href: '/attendance', label: 'Attendance',  icon: CalendarCheck },
  { href: '/subscription',       label: 'Subscription', icon: Crown },
  { href: '/settings',          label: 'Settings',    icon: Settings },
  { href: '/settings/services', label: 'Services',    icon: ToggleRight },
];

export default function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const gymIds = useAuthStore((s) => s.gymIds);
  const activeGymId = useAuthStore((s) => s.activeGymId);
  const switchGym = useAuthStore((s) => s.switchGym);

  const isMultiGym = Array.isArray(gymIds) && gymIds.length > 1;

  const { data: gymsData } = useQuery({
    queryKey: ['my-gyms'],
    queryFn: () => ownerApi.myGyms().then((r) => r.data.data),
    enabled: isMultiGym,
    staleTime: 5 * 60 * 1000,
  });

  function handleLogout() {
    logout();
    toast.success('Logged out.');
    router.replace('/login');
  }

  function handleGymSwitch(gymId) {
    switchGym(parseInt(gymId, 10));
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-4">
        <Dumbbell className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg tracking-tight">GymEngine</span>
      </div>

      {/* Gym switcher — only shown when owner has access to multiple gyms */}
      {isMultiGym && (
        <div className="px-1 mb-4">
          <Select
            value={String(activeGymId)}
            onValueChange={handleGymSwitch}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue placeholder="Select gym" />
            </SelectTrigger>
            <SelectContent>
              {(gymsData ?? gymIds.map((id) => ({ id, name: `Gym ${id}` }))).map((gym) => (
                <SelectItem key={gym.id} value={String(gym.id)} className="text-xs">
                  {gym.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              (href === '/settings' ? pathname === href : pathname.startsWith(href))
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
