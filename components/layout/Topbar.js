'use client';

import useAuthStore from '@/store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Topbar({ title }) {
  const role  = useAuthStore((s) => s.role);
  const gymId = useAuthStore((s) => s.gymId);

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {role === 'admin' ? 'Admin' : `Gym #${gymId}`}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {role === 'admin' ? 'A' : 'G'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
