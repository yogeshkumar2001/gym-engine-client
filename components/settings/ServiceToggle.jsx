'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A single service toggle row.
 *
 * Props:
 *   id          — unique string for the switch element
 *   label       — short name shown prominently
 *   description — one-line explanation of what the service does
 *   checked     — current boolean state
 *   onChange    — (newValue: boolean) => void
 *   disabled    — when true, switch is greyed out and non-interactive
 */
export default function ServiceToggle({ id, label, description, checked, onChange, disabled }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-4',
        disabled && 'opacity-50'
      )}
    >
      <div className="space-y-0.5">
        <Label htmlFor={id} className={cn('text-sm font-medium', disabled && 'cursor-not-allowed')}>
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
