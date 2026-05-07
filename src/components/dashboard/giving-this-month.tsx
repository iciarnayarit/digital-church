'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardStats } from '@/lib/dashboard-stats';
import { formatPctChange } from '@/lib/dashboard-stats';
import { HandCoins, TrendingDown, TrendingUp } from 'lucide-react';

interface GivingThisMonthProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export function GivingThisMonth({ stats, loading }: GivingThisMonthProps) {
  const value = stats?.giving.total ?? 0;
  const pct = stats?.giving.changePct ?? null;
  const positive = pct != null && pct >= 0;
  const trendCls =
    pct == null ? 'text-muted-foreground' : positive ? 'text-green-600' : 'text-red-600';
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
        <CardTitle className="text-sm font-medium">Ofrendas</CardTitle>
        <div className="rounded-md bg-primary/10 p-1.5 text-primary sm:p-2">
          <HandCoins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-[1.9rem] font-semibold tracking-tight sm:text-3xl">
          {loading
            ? '…'
            : `$${value.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`}
        </div>
        <p className={`mt-1 inline-flex items-center gap-1 text-xs ${trendCls}`}>
          {pct != null ? <TrendIcon className="h-3.5 w-3.5" /> : null}
          {formatPctChange(pct)} vs periodo anterior
        </p>
      </CardContent>
    </Card>
  );
}
