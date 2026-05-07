
'use client';
import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TotalMembers } from '@/components/dashboard/total-members';
import { WeeklyAttendance } from '@/components/dashboard/weekly-attendance';
import { GivingThisMonth } from '@/components/dashboard/giving-this-month';
import { GivingTrends } from '@/components/dashboard/giving-trends';
import { MemberDemographics } from '@/components/dashboard/member-demographics';
import { UpcomingEvents } from '@/components/dashboard/upcoming-events';
import { PrayerRequests } from '@/components/dashboard/prayer-requests';
import { TotalGroups } from '@/components/dashboard/total-groups';
import { TotalMinistries } from '@/components/dashboard/total-ministries';
import { TotalVolunteers } from '@/components/dashboard/total-volunteers';
import { UpcomingEventsCard } from '@/components/dashboard/upcoming-events-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { MemberGrowthChart } from '@/components/dashboard/member-growth-chart';
import { AppHeader } from '@/components/app-header';
import { Badge } from '@/components/ui/badge';
import type { DashboardStats } from '@/lib/dashboard-stats';

export type TimeRange = 'this-week' | 'this-month' | 'this-quarter' | 'this-year';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('this-week');
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [canSeeAllDashboardLinks, setCanSeeAllDashboardLinks] = React.useState(false);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange);
  };

  React.useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    void (async () => {
      try {
        const res = await fetch(`/api/dashboard?range=${encodeURIComponent(timeRange)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json()) as DashboardStats & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Error al cargar el panel');
        }
        if (!cancelled) {
          setStats(data as DashboardStats);
          setLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as { staffRole?: string | null };
        if (cancelled) return;
        const role = String(data.staffRole ?? '').trim().toLowerCase();
        setCanSeeAllDashboardLinks(role === 'super administrador');
      } catch {
        if (!cancelled) setCanSeeAllDashboardLinks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Panel"
        description="Un resumen de las actividades y estadísticas clave de la iglesia."
      >
        <Tabs
          defaultValue="this-week"
          className="hidden sm:block"
          value={timeRange}
          onValueChange={handleTimeRangeChange}
        >
          <TabsList>
            <TabsTrigger value="this-week">Esta Semana</TabsTrigger>
            <TabsTrigger value="this-month">Este Mes</TabsTrigger>
            <TabsTrigger value="this-quarter">Este Trimestre</TabsTrigger>
            <TabsTrigger value="this-year">Este Año</TabsTrigger>
          </TabsList>
        </Tabs>
        <ThemeToggle />
      </AppHeader>
      <main className="flex-1 bg-gradient-to-b from-muted/20 to-background p-3 sm:p-8">
        <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
          <div className="sm:hidden">
            <Tabs className="w-full" value={timeRange} onValueChange={handleTimeRangeChange}>
              <TabsList className="grid h-10 w-full grid-cols-4 p-1">
                <TabsTrigger className="text-xs" value="this-week">Semana</TabsTrigger>
                <TabsTrigger className="text-xs" value="this-month">Mes</TabsTrigger>
                <TabsTrigger className="text-xs" value="this-quarter">Trim.</TabsTrigger>
                <TabsTrigger className="text-xs" value="this-year">Año</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen general
              </h2>
              <Badge variant="secondary">
                {loadState === 'loading'
                  ? 'Cargando…'
                  : loadState === 'error'
                    ? 'Actualizando los datos del panel...'
                    : ''}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <TotalMembers stats={stats} loading={loadState === 'loading'} />
              <WeeklyAttendance
                stats={stats}
                loading={loadState === 'loading'}
                timeRange={timeRange}
              />
              <GivingThisMonth stats={stats} loading={loadState === 'loading'} />
              <UpcomingEventsCard stats={stats} loading={loadState === 'loading'} />
            </div>
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
              <TotalGroups stats={stats} loading={loadState === 'loading'} />
              <TotalMinistries stats={stats} loading={loadState === 'loading'} />
              <TotalVolunteers stats={stats} loading={loadState === 'loading'} />
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tendencias
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GivingTrends stats={stats} loading={loadState === 'loading'} timeRange={timeRange} />
              <MemberGrowthChart
                stats={stats}
                loading={loadState === 'loading'}
                timeRange={timeRange}
              />
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Actividad reciente
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <MemberDemographics stats={stats} loading={loadState === 'loading'} />
              </div>
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 gap-6">
                  <UpcomingEvents
                    stats={stats}
                    loading={loadState === 'loading'}
                    showViewAllLink={canSeeAllDashboardLinks}
                  />
                  <PrayerRequests
                    stats={stats}
                    loading={loadState === 'loading'}
                    showViewAllLink={canSeeAllDashboardLinks}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
