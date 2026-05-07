'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Search, Calendar, Pencil, Eye, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { FundraisingCampaignDetailDialog } from '@/components/fundraising-campaign-detail-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { FundraisingCampaignDoc, FundraisingStatus } from '@/lib/fundraising-seed';

const statusColors: Record<FundraisingStatus, string> = {
  Active: 'bg-green-100 text-green-800 border-green-200',
  Completed: 'bg-blue-100 text-blue-800 border-blue-200',
  Upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Draft: 'bg-gray-100 text-gray-800 border-gray-200',
};

const progressIndicator: Record<FundraisingStatus, string> = {
  Active: 'bg-blue-500',
  Completed: 'bg-green-500',
  Upcoming: 'bg-gray-400',
  Draft: 'bg-muted-foreground',
};

const statusFilterValue = (s: FundraisingStatus) =>
  s === 'Active'
    ? 'active'
    : s === 'Completed'
      ? 'completed'
      : s === 'Upcoming'
        ? 'upcoming'
        : 'draft';

/** Vista por defecto: solo campañas en curso o anunciadas, no borradores ni completadas. */
const DEFAULT_STATUS_FILTER = 'active-upcoming';

function viewerCreatedCampaign(
  c: FundraisingCampaignDoc,
  memberId: string | null,
  clerkUserId: string | null
): boolean {
  const byMember = String(c.createdByMemberId ?? '').trim();
  if (byMember && memberId && byMember === memberId) return true;
  const byClerk = String(c.createdByClerkUserId ?? '').trim();
  if (byClerk && clerkUserId && byClerk === clerkUserId) return true;
  return false;
}

export default function FundraisingPage() {
  const [campaigns, setCampaigns] = React.useState<FundraisingCampaignDoc[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState(DEFAULT_STATUS_FILTER);
  const [detailCampaign, setDetailCampaign] = React.useState<FundraisingCampaignDoc | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [canCreateCampaign, setCanCreateCampaign] = React.useState(true);
  const [viewerMemberId, setViewerMemberId] = React.useState<string | null>(null);
  const [viewerClerkUserId, setViewerClerkUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          staffRole?: string | null;
          memberId?: string | null;
          clerkUserId?: string | null;
        };
        if (cancelled) return;
        const role = String(data.staffRole ?? '').trim().toLowerCase();
        setCanCreateCampaign(role !== 'congregante');
        setViewerMemberId(
          typeof data.memberId === 'string' && data.memberId.trim() ? data.memberId.trim() : null
        );
        setViewerClerkUserId(
          typeof data.clerkUserId === 'string' && data.clerkUserId.trim()
            ? data.clerkUserId.trim()
            : null
        );
      } catch {
        if (!cancelled) {
          setCanCreateCampaign(true);
          setViewerMemberId(null);
          setViewerClerkUserId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState('loading');
      setLoadError(null);
      try {
        const res = await fetch('/api/fundraising', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          campaigns?: FundraisingCampaignDoc[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudieron cargar las campañas.');
        }
        if (cancelled) return;
        setCampaigns(json.campaigns ?? []);
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        setCampaigns([]);
        setLoadState('error');
        setLoadError(e instanceof Error ? e.message : 'Error al cargar.');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const normalizedQuery = search.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter === DEFAULT_STATUS_FILTER) {
        if (c.status !== 'Active' && c.status !== 'Upcoming') {
          return false;
        }
      } else if (statusFilter !== 'all' && statusFilterValue(c.status) !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const blob = `${c.name} ${c.description}`.toLowerCase();
      return blob.includes(normalizedQuery);
    });
  }, [campaigns, normalizedQuery, statusFilter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title="Campañas de Recaudación de Fondos"
        description="Cree y gestione sus campañas de recaudación de fondos."
      >
        {canCreateCampaign ? (
          <Button type="button" asChild>
            <Link href="/donations/fundraising/new">
              <Megaphone className="mr-2 h-4 w-4" /> Crear Campaña
            </Link>
          </Button>
        ) : null}
      </AppHeader>
      <main className="flex-1 space-y-6 bg-muted/20 p-4 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar campañas..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loadState === 'loading'}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loadState === 'loading'}>
            <SelectTrigger className="w-full min-w-[200px] sm:w-[220px]">
              <SelectValue placeholder="Estado de la campaña" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_STATUS_FILTER}>Activas y próximas</SelectItem>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="upcoming">Próximo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadState === 'error' ? (
          <p className="text-center text-sm text-destructive">{loadError}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loadState === 'loading'
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={`sk-${i}`} className="flex flex-col">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-4 w-40" />
                  </CardFooter>
                </Card>
              ))
            : filtered.map((campaign) => (
                <Card key={campaign.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge variant="outline" className={cn('shrink-0', statusColors[campaign.status])}>
                        {campaign.status === 'Active'
                          ? 'Activo'
                          : campaign.status === 'Completed'
                            ? 'Completado'
                            : campaign.status === 'Upcoming'
                              ? 'Próximo'
                              : 'Borrador'}
                      </Badge>
                    </div>
                    <CardDescription>{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {campaign.status !== 'Draft' && campaign.goal != null && (
                      <>
                        <div className="mb-1 flex items-end justify-between">
                          <span className="text-xl font-bold">{formatCurrency(campaign.raised)}</span>
                          <span className="text-sm text-muted-foreground">
                            / {formatCurrency(campaign.goal)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, campaign.progress)}
                          className="h-2"
                          indicatorClassName={progressIndicator[campaign.status]}
                        />
                        <p
                          className={cn(
                            'mt-1 text-sm font-medium',
                            campaign.progress > 100 ? 'text-green-600' : 'text-foreground'
                          )}
                        >
                          {campaign.progress}% Recaudado{' '}
                          {campaign.progress > 100 ? '— ¡Meta superada!' : ''}
                        </p>
                      </>
                    )}
                    {campaign.status === 'Draft' && (
                      <div className="py-8 text-center">
                        <p className="font-semibold text-muted-foreground">No iniciado</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col items-start justify-between gap-4 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                    {campaign.status !== 'Draft' && campaign.date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>
                          {campaign.status === 'Completed'
                            ? 'Finalizó'
                            : campaign.status === 'Upcoming'
                              ? 'Comienza'
                              : 'Termina'}{' '}
                          {campaign.date}
                        </span>
                      </div>
                    ) : null}
                    {campaign.status === 'Draft' && (
                      <Button variant="outline" size="sm" type="button">
                        <Calendar className="mr-2 h-4 w-4" />
                        Establecer fechas
                      </Button>
                    )}

                    {campaign.status === 'Completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 self-end text-muted-foreground hover:text-foreground sm:self-center"
                        asChild
                      >
                        <Link
                          href={`/donations/fundraising/${campaign.id}/report`}
                          aria-label="Ver informe de la campaña"
                        >
                          <FileBarChart className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {(campaign.status === 'Active' || campaign.status === 'Upcoming') && (
                      <div className="flex shrink-0 items-center gap-0.5 self-end sm:self-center">
                        {viewerCreatedCampaign(campaign, viewerMemberId, viewerClerkUserId) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link
                              href={`/donations/fundraising/${campaign.id}/edit`}
                              aria-label="Editar campaña"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="Ver detalles de la campaña"
                          onClick={() => {
                            setDetailCampaign(campaign);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {campaign.status === 'Draft' &&
                    viewerCreatedCampaign(campaign, viewerMemberId, viewerClerkUserId) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 self-end text-muted-foreground hover:text-foreground sm:self-center"
                        asChild
                      >
                        <Link
                          href={`/donations/fundraising/${campaign.id}/edit`}
                          aria-label="Editar borrador"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </CardFooter>
                </Card>
              ))}
        </div>

        {loadState === 'ready' && filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {campaigns.length === 0
              ? 'No hay campañas registradas para su templo.'
              : statusFilter === DEFAULT_STATUS_FILTER
                ? 'No hay campañas activas ni próximas. Pruebe «Todos los estados» o ajuste la búsqueda.'
                : 'No hay campañas que coincidan con la búsqueda o el filtro.'}
          </p>
        ) : null}

        <FundraisingCampaignDetailDialog
          campaign={detailCampaign}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </main>
    </div>
  );
}
