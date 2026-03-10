'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import queryClient from '@/lib/queryClient';
import { useEffect } from 'react';
import useAuthStore from '@/store/authStore';

function AuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return null;
}

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInit />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
