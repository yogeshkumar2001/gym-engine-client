'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Crown } from 'lucide-react';

// ── Tier config (mirrors backend TIER_LIMITS) ─────────────────────────────────
const TIERS = [
  {
    key: 'starter',
    label: 'Starter',
    price: '₹999/mo',
    limit: 100,
    features: {
      'Up to 100 members':           true,
      'WhatsApp renewal reminders':  true,
      'Recovery engine (4-step)':    true,
      'Manual cash/UPI payments':    true,
      'Daily summary reports':       true,
      'Lead funnel tracking':        true,
      'Analytics & forecasting':     false,
      'Cohort retention analysis':   false,
      'Attendance tracking':         false,
      'Google Sheet sync':           false,
    },
  },
  {
    key: 'growth',
    label: 'Growth',
    price: '₹1,999/mo',
    limit: 300,
    features: {
      'Up to 300 members':           true,
      'WhatsApp renewal reminders':  true,
      'Recovery engine (4-step)':    true,
      'Manual cash/UPI payments':    true,
      'Daily summary reports':       true,
      'Lead funnel tracking':        true,
      'Analytics & forecasting':     true,
      'Cohort retention analysis':   true,
      'Attendance tracking':         true,
      'Google Sheet sync':           true,
    },
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '₹3,499/mo',
    limit: 1000,
    features: {
      'Up to 1,000 members':         true,
      'WhatsApp renewal reminders':  true,
      'Recovery engine (4-step)':    true,
      'Manual cash/UPI payments':    true,
      'Daily summary reports':       true,
      'Lead funnel tracking':        true,
      'Analytics & forecasting':     true,
      'Cohort retention analysis':   true,
      'Attendance tracking':         true,
      'Google Sheet sync':           true,
    },
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    limit: null,
    features: {
      'Unlimited members':           true,
      'WhatsApp renewal reminders':  true,
      'Recovery engine (4-step)':    true,
      'Manual cash/UPI payments':    true,
      'Daily summary reports':       true,
      'Lead funnel tracking':        true,
      'Analytics & forecasting':     true,
      'Cohort retention analysis':   true,
      'Attendance tracking':         true,
      'Google Sheet sync':           true,
    },
  },
];

const ALL_FEATURES = [
  'Up to 100 members',
  'Up to 300 members',
  'Up to 1,000 members',
  'Unlimited members',
  'WhatsApp renewal reminders',
  'Recovery engine (4-step)',
  'Manual cash/UPI payments',
  'Daily summary reports',
  'Lead funnel tracking',
  'Analytics & forecasting',
  'Cohort retention analysis',
  'Attendance tracking',
  'Google Sheet sync',
];

const TIER_ORDER = { starter: 0, growth: 1, pro: 2, enterprise: 3 };

function tierBadgeVariant(tier) {
  return { starter: 'secondary', growth: 'default', pro: 'default', enterprise: 'default' }[tier] || 'outline';
}

function tierBadgeClass(tier) {
  return {
    starter:    '',
    growth:     'bg-blue-600',
    pro:        'bg-purple-600',
    enterprise: 'bg-amber-500',
  }[tier] || '';
}

// ── Usage bar ─────────────────────────────────────────────────────────────────
function UsageBar({ current, limit }) {
  const pct = limit ? Math.min(Math.round((current / limit) * 100), 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{current} members used</span>
        <span>{limit ? `${limit} limit` : 'Unlimited'}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{pct}% of limit used</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.get().then((r) => r.data.data),
  });

  const currentTierIndex = TIER_ORDER[data?.subscription_tier] ?? 0;

  const expiresAt = data?.subscription_expires_at
    ? new Date(data.subscription_expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="space-y-8 max-w-5xl">
      <h2 className="text-2xl font-bold tracking-tight">Subscription</h2>

      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge
                  variant={tierBadgeVariant(data?.subscription_tier)}
                  className={`text-sm px-3 py-1 ${tierBadgeClass(data?.subscription_tier)}`}
                >
                  {data?.subscription_tier?.charAt(0).toUpperCase() + data?.subscription_tier?.slice(1)}
                </Badge>
                {expiresAt && (
                  <span className="text-sm text-muted-foreground">
                    Renews / expires: <strong>{expiresAt}</strong>
                  </span>
                )}
                {!expiresAt && (
                  <span className="text-xs text-muted-foreground">No expiry set</span>
                )}
              </div>

              <UsageBar current={data?.member_count ?? 0} limit={data?.member_limit} />

              {data?.member_count >= data?.member_limit && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  Member limit reached. New members cannot be added until you upgrade your plan.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Feature matrix */}
      <div>
        <h3 className="font-semibold mb-4">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 pr-6 font-medium text-muted-foreground w-52">Feature</th>
                {TIERS.map((tier) => (
                  <th key={tier.key} className="py-3 px-4 text-center font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Badge
                        variant={tierBadgeVariant(tier.key)}
                        className={`${tierBadgeClass(tier.key)} ${data?.subscription_tier === tier.key ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                      >
                        {tier.label}
                      </Badge>
                      <span className="text-xs font-normal text-muted-foreground">{tier.price}</span>
                      {data?.subscription_tier === tier.key && (
                        <span className="text-xs text-primary font-semibold">Current</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_FEATURES.map((feature) => (
                <tr key={feature} className="border-t border-border/50">
                  <td className="py-2.5 pr-6 text-muted-foreground">{feature}</td>
                  {TIERS.map((tier) => (
                    <td key={tier.key} className="py-2.5 px-4 text-center">
                      {tier.features[feature]
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade CTA */}
      {data && currentTierIndex < TIERS.length - 1 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Ready to upgrade?</CardTitle>
            <CardDescription>
              Contact us to upgrade your plan and unlock more members and features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="mailto:support@gymengine.in?subject=Upgrade Request"
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Crown className="h-4 w-4" />
              Request Upgrade
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
