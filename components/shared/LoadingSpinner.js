import { cn } from '@/lib/utils';

export default function LoadingSpinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center h-32', className)}>
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
