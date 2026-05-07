'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '@/lib/dashboard-stats';

interface PrayerRequestsProps {
  stats: DashboardStats | null;
  loading: boolean;
  showViewAllLink?: boolean;
}

export function PrayerRequests({
  stats,
  loading,
  showViewAllLink = false,
}: PrayerRequestsProps) {
  const requests = stats?.prayerRequests ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Peticiones de Oración Recientes</CardTitle>
        {showViewAllLink ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/prayer">Ver Todas</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay peticiones recientes.</p>
        ) : (
          <div className="space-y-2">
            {requests.slice(0, 3).map((req) => (
              <div key={req.id} className="rounded-lg bg-secondary p-3">
                <p className="text-sm font-semibold text-foreground">{req.request}</p>
                <p className="mt-1 text-xs text-muted-foreground">{req.submitted}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
