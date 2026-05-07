import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardStats } from '@/lib/dashboard-stats';

interface UpcomingEventsProps {
  stats: DashboardStats | null;
  loading: boolean;
  showViewAllLink?: boolean;
}

export function UpcomingEvents({ stats, loading, showViewAllLink = false }: UpcomingEventsProps) {
  const upcomingEvents = stats?.upcomingEvents ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Próximos Eventos</CardTitle>
        {showViewAllLink ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/events">Ver Todos</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos próximos.</p>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-md bg-secondary p-2">
                  <span className="text-xs font-bold text-primary">
                    {event.dateParts.month.toUpperCase()}
                  </span>
                  <span className="text-2xl font-bold">{event.dateParts.day}</span>
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="text-sm font-semibold">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {event.time} - {event.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
