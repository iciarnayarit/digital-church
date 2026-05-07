'use client';

import * as React from 'react';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { FundraisingCampaignDoc, FundraisingStatus } from '@/lib/fundraising-seed';

type ChurchItem = { id: string; name: string };

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

function statusLabel(s: FundraisingStatus) {
  if (s === 'Active') return 'Activo';
  if (s === 'Completed') return 'Completado';
  if (s === 'Upcoming') return 'Próximo';
  return 'Borrador';
}

export default function NewFundraisingCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = React.useState(false);
  const [churches, setChurches] = React.useState<ChurchItem[]>([]);
  const [selectedChurchId, setSelectedChurchId] = React.useState('');
  const [churchesState, setChurchesState] = React.useState<'loading' | 'ready' | 'error'>('loading');

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<FundraisingStatus>('Draft');
  const [raised, setRaised] = React.useState('');
  const [goal, setGoal] = React.useState('');
  const [dateLabel, setDateLabel] = React.useState('');
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);

  const raisedNum = Number(raised.replace(/,/g, ''));
  const goalNum = goal.trim() === '' ? null : Number(goal.replace(/,/g, ''));

  const previewProgress =
    goalNum != null && Number.isFinite(goalNum) && goalNum > 0 && Number.isFinite(raisedNum) && raisedNum >= 0
      ? Math.round((raisedNum / goalNum) * 100)
      : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const onPickDate = (d: Date | undefined) => {
    setEndDate(d);
    if (d) {
      setDateLabel(format(d, "d 'de' LLL, yyyy", { locale: es }));
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setChurchesState('loading');
      try {
        const res = await fetch('/api/churches?sessionChurchScope=true', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as { churches?: ChurchItem[] };
        if (!res.ok) throw new Error('No se pudieron cargar los templos.');
        if (cancelled) return;
        const rows = (json.churches ?? []).sort((a, b) => a.name.localeCompare(b.name, 'es'));
        setChurches(rows);
        setSelectedChurchId((prev) => prev || rows[0]?.id || '');
        setChurchesState('ready');
      } catch {
        if (!cancelled) {
          setChurches([]);
          setChurchesState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const raisedParsed = raised.trim() === '' ? 0 : Number(raised.replace(/,/g, ''));
    const goalParsed = goal.trim() === '' ? null : Number(goal.replace(/,/g, ''));

    if (!name.trim()) {
      toast({ title: 'Revise el formulario', description: 'El título es obligatorio.', variant: 'destructive' });
      return;
    }
    if (!selectedChurchId.trim()) {
      toast({
        title: 'Revise el formulario',
        description: 'Seleccione el templo al que pertenece la campaña.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(raisedParsed) || raisedParsed < 0) {
      toast({
        title: 'Revise el formulario',
        description: 'El monto recaudado no es válido.',
        variant: 'destructive',
      });
      return;
    }
    if (goalParsed !== null && (!Number.isFinite(goalParsed) || goalParsed < 0)) {
      toast({ title: 'Revise el formulario', description: 'La meta no es válida.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/fundraising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          raised: raisedParsed,
          goal: goalParsed,
          date: dateLabel.trim(),
          churchId: selectedChurchId.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        campaign?: FundraisingCampaignDoc;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo crear la campaña.');
      }
      toast({ title: 'Campaña creada', description: 'La nueva campaña se guardó correctamente.' });
      router.push('/donations/fundraising');
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error al crear',
        description: err instanceof Error ? err.message : 'Inténtelo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const listHref = '/donations/fundraising';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title="Crear campaña"
        description="Defina título, descripción, estado, montos y fecha. El identificador se genera a partir del título."
      >
        <Button variant="outline" type="button" asChild>
          <Link href={listHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </AppHeader>

      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Vista previa</CardTitle>
                <CardDescription>Así se verá el resumen en la tarjeta de la lista.</CardDescription>
              </div>
              <Badge variant="outline" className={cn('shrink-0', statusColors[status])}>
                {statusLabel(status)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{name || 'Sin título'}</p>
                <p className="text-sm text-muted-foreground">{description || 'Sin descripción'}</p>
              </div>
              {status !== 'Draft' && goalNum != null && goalNum > 0 ? (
                <>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-xl font-bold">
                      {Number.isFinite(raisedNum) ? formatCurrency(raisedNum) : '—'}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {formatCurrency(goalNum)}</span>
                  </div>
                  <Progress
                    value={Math.min(100, previewProgress)}
                    className="h-2"
                    indicatorClassName={progressIndicator[status]}
                  />
                  <p className="text-sm font-medium">{previewProgress}% Recaudado</p>
                </>
              ) : null}
              {dateLabel.trim() ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span>Termina {dateLabel}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos de la campaña</CardTitle>
              <CardDescription>Al guardar se crea el registro en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-campaign-name">Título de la campaña</Label>
                <Input
                  id="new-campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Fondo para la construcción…"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-campaign-description">Descripción</Label>
                <Textarea
                  id="new-campaign-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Breve descripción para donantes y equipo."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-campaign-church">Templo</Label>
                <Select
                  value={selectedChurchId}
                  onValueChange={setSelectedChurchId}
                  disabled={churchesState !== 'ready' || churches.length === 0}
                >
                  <SelectTrigger id="new-campaign-church" className="w-full">
                    <SelectValue
                      placeholder={
                        churchesState === 'loading'
                          ? 'Cargando templos…'
                          : churchesState === 'error'
                            ? 'Error al cargar templos'
                            : 'Seleccione un templo'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se guarda con la campaña. El usuario en sesión queda registrado automáticamente en el
                  servidor (Clerk y miembro del directorio si aplica).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as FundraisingStatus)}>
                  <SelectTrigger className="w-full sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Activo</SelectItem>
                    <SelectItem value="Upcoming">Próximo</SelectItem>
                    <SelectItem value="Completed">Completado</SelectItem>
                    <SelectItem value="Draft">Borrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-campaign-raised">Monto recaudado (MXN)</Label>
                  <Input
                    id="new-campaign-raised"
                    inputMode="decimal"
                    value={raised}
                    onChange={(e) => setRaised(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede dejarlo en blanco para comenzar en cero; el porcentaje depende de la meta.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-campaign-goal">Meta (MXN)</Label>
                  <Input
                    id="new-campaign-goal"
                    inputMode="decimal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha de término</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start sm:w-auto">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: es }) : 'Elegir en calendario'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={onPickDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <Input
                    className="sm:flex-1"
                    value={dateLabel}
                    onChange={(e) => setDateLabel(e.target.value)}
                    placeholder="Ej. 31 de oct, 2024"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  El calendario rellena el texto en español; también puede editarlo a mano.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {saving ? (
              <Button type="button" variant="outline" disabled>
                Cancelar
              </Button>
            ) : (
              <Button type="button" variant="outline" asChild>
                <Link href={listHref}>Cancelar</Link>
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Creando…' : 'Crear campaña'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
