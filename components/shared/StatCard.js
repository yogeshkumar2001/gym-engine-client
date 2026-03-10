import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, sub, icon: Icon, accent }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <Icon
            className={cn('h-4 w-4', accent ? `text-${accent}-500` : 'text-muted-foreground')}
          />
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
