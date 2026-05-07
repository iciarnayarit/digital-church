'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardStats } from '@/lib/dashboard-stats';
import { Calendar } from 'lucide-react';

interface UpcomingEventsCardProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export function UpcomingEventsCard({ stats, loading }: UpcomingEventsCardProps) {
  const totalEvents = stats?.eventsThisMonth ?? 0;

  return (
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
        <CardTitle className="text-sm font-medium">Próximos Eventos</CardTitle>
        <div className="rounded-md bg-primary/10 p-1.5 text-primary sm:p-2">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-[1.9rem] font-semibold tracking-tight sm:text-3xl">
          {loading ? '…' : totalEvents.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Eventos programados este mes</p>
      </CardContent>
    </Card>
  );
}
