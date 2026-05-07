'use client';

import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import type { ChurchInventoryArea, ChurchLocation } from '@/lib/church-locations';

const NONE = '__none__';

export default function InventarioNuevoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [churches, setChurches] = React.useState<ChurchLocation[]>([]);
  const [churchesLoad, setChurchesLoad] = React.useState<'loading' | 'ready' | 'error'>('loading');

  const [name, setName] = React.useState('');
  const [churchId, setChurchId] = React.useState('');
  const [areaId, setAreaId] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [condition, setCondition] = React.useState('excellent');
  const [status, setStatus] = React.useState('available');
  const [conditionOptions, setConditionOptions] = React.useState<{ key: string; label: string }[]>(
    []
  );
  const [statusOptions, setStatusOptions] = React.useState<{ key: string; label: string }[]>([]);
  const [taxonomyLoad, setTaxonomyLoad] = React.useState<'loading' | 'ready' | 'error'>('loading');

  const preselectFromQuery = searchParams.get('iglesia')?.trim() ?? '';
  const preselectCondicion = searchParams.get('condicion')?.trim() ?? '';
  const preselectEstado = searchParams.get('estado')?.trim() ?? '';
  const appliedQueryRef = React.useRef(false);
  const appliedTaxonomyQueryRef = React.useRef(false);

  const [templeAreas, setTempleAreas] = React.useState<ChurchInventoryArea[]>([]);
  const [templeAreasLoad, setTempleAreasLoad] = React.useState<'idle' | 'loading' | 'ready'>(
    'idle'
  );

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setChurchesLoad('loading');
      try {
        const res = await fetch('/api/churches?sessionChurchScope=1', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          churches?: ChurchLocation[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudieron cargar los templos.');
        }
        if (!cancelled) {
          setChurches(json.churches ?? []);
          setChurchesLoad('ready');
        }
      } catch {
        if (!cancelled) {
          setChurches([]);
          setChurchesLoad('error');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTaxonomyLoad('loading');
      try {
        const res = await fetch('/api/inventory/taxonomy', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          conditions?: { key: string; label: string }[];
          statuses?: { key: string; label: string }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudo cargar condiciones y estados.');
        }
        if (cancelled) return;
        setConditionOptions(json.conditions ?? []);
        setStatusOptions(json.statuses ?? []);
        setTaxonomyLoad('ready');
      } catch {
        if (!cancelled) {
          setConditionOptions([]);
          setStatusOptions([]);
          setTaxonomyLoad('error');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (taxonomyLoad !== 'ready' || appliedTaxonomyQueryRef.current) return;
    appliedTaxonomyQueryRef.current = true;
    if (preselectCondicion && conditionOptions.some((o) => o.key === preselectCondicion)) {
      setCondition(preselectCondicion);
    }
    if (preselectEstado && statusOptions.some((o) => o.key === preselectEstado)) {
      setStatus(preselectEstado);
    }
  }, [taxonomyLoad, preselectCondicion, preselectEstado, conditionOptions, statusOptions]);

  React.useEffect(() => {
    if (taxonomyLoad !== 'ready') return;
    if (condition && !conditionOptions.some((o) => o.key === condition)) {
      setCondition(conditionOptions[0]?.key ?? 'excellent');
    }
  }, [taxonomyLoad, conditionOptions, condition]);

  React.useEffect(() => {
    if (taxonomyLoad !== 'ready') return;
    if (status && !statusOptions.some((o) => o.key === status)) {
      setStatus(statusOptions[0]?.key ?? 'available');
    }
  }, [taxonomyLoad, statusOptions, status]);

  React.useEffect(() => {
    if (appliedQueryRef.current || !preselectFromQuery || churchesLoad !== 'ready') return;
    const exists = churches.some((c) => c.id === preselectFromQuery);
    if (exists) {
      setChurchId(preselectFromQuery);
      setAreaId('');
      appliedQueryRef.current = true;
    }
  }, [preselectFromQuery, churches, churchesLoad]);

  React.useEffect(() => {
    if (!churchId) {
      setTempleAreas([]);
      setTempleAreasLoad('idle');
      return;
    }
    const church = churches.find((c) => c.id === churchId);
    let cancelled = false;
    setTempleAreasLoad('loading');
    const load = async () => {
      try {
        const res = await fetch(
          `/api/inventory/church-areas?churchId=${encodeURIComponent(churchId)}`,
          { cache: 'no-store', headers: { Accept: 'application/json' } }
        );
        const j = (await res.json().catch(() => ({}))) as {
          exists?: boolean;
          areas?: ChurchInventoryArea[];
        };
        if (cancelled) return;
        if (res.ok && j.exists) {
          setTempleAreas(j.areas ?? []);
        } else {
          setTempleAreas(church?.inventoryAreas ?? []);
        }
        setTempleAreasLoad('ready');
      } catch {
        if (!cancelled) {
          setTempleAreas(church?.inventoryAreas ?? []);
          setTempleAreasLoad('ready');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [churchId, churches]);

  React.useEffect(() => {
    if (!areaId) return;
    if (!templeAreas.some((a) => a.id === areaId)) {
      setAreaId('');
    }
  }, [templeAreas, areaId]);

  const areas = templeAreas;
  const canShowAreaAgregarLink =
    Boolean(churchId) && templeAreasLoad === 'ready';

  const listHref = '/inventario';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(quantity.replace(/,/g, ''));
    if (!name.trim()) {
      toast({
        title: 'Revise el formulario',
        description: 'Indique el nombre del recurso.',
        variant: 'destructive',
      });
      return;
    }
    if (!churchId) {
      toast({
        title: 'Revise el formulario',
        description: 'Seleccione un templo.',
        variant: 'destructive',
      });
      return;
    }
    if (!areaId) {
      toast({
        title: 'Revise el formulario',
        description:
          areas.length === 0
            ? 'Agregue al menos un área para este templo antes de guardar.'
            : 'Seleccione una ubicación (área).',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(q) || q < 0 || !Number.isInteger(q)) {
      toast({
        title: 'Revise el formulario',
        description: 'La cantidad debe ser un número entero mayor o igual a 0.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          churchId,
          areaId,
          quantity: q,
          condition,
          status,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { item?: unknown; error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo guardar el recurso.');
      }
      toast({ title: 'Recurso añadido', description: 'El ítem se guardó en el inventario.' });
      router.push(listHref);
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Inténtelo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title="Añadir recurso nuevo"
        description="Elija templo y área interna, cantidad, condición y estado."
      >
        <Button variant="outline" type="button" asChild>
          <Link href={listHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </AppHeader>

      <main className="flex-1 bg-muted/30 p-4 sm:p-8">
        {churchesLoad === 'error' ? (
          <p className="mb-4 text-center text-sm text-destructive">
            No se pudieron cargar los templos. Revise la conexión o vuelva a intentar.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Datos del recurso</CardTitle>
              <CardDescription>
                Los templos vienen de <span className="font-medium">churches</span>; las áreas guardadas
                están en <span className="font-medium">inventory</span> (documento por templo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inv-name">Nombre del recurso</Label>
                <Input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sillas plegables negras"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label>Templo</Label>
                <Select
                  value={churchId || NONE}
                  onValueChange={(v) => {
                    setChurchId(v === NONE ? '' : v);
                    setAreaId('');
                  }}
                  disabled={churchesLoad !== 'ready'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione templo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Seleccione templo</SelectItem>
                    {churches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación (área)</Label>
                <Select
                  value={areaId || NONE}
                  onValueChange={(v) => setAreaId(v === NONE ? '' : v)}
                  disabled={
                    !churchId ||
                    templeAreasLoad === 'loading' ||
                    areas.length === 0
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !churchId
                          ? 'Primero elija templo'
                          : templeAreasLoad === 'loading'
                            ? 'Cargando áreas…'
                            : areas.length === 0
                              ? 'Sin áreas definidas'
                              : 'Seleccione área'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Seleccione área</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canShowAreaAgregarLink ? (
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href={`/inventario/areas/${encodeURIComponent(churchId)}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Agregar
                    </Link>
                    {areas.length > 0
                      ? ' otra área para este templo si no aparece en la lista.'
                      : ' áreas a este templo antes de elegir ubicación.'}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-qty">Cantidad</Label>
                <Input
                  id="inv-qty"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Condición</Label>
                  <Select
                    value={condition}
                    onValueChange={(v) => setCondition(v)}
                    disabled={taxonomyLoad !== 'ready' || conditionOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          taxonomyLoad === 'loading'
                            ? 'Cargando…'
                            : taxonomyLoad === 'error'
                              ? 'Error al cargar'
                              : 'Seleccione'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href="/inventario/condiciones/nueva"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Agregar
                    </Link>{' '}
                    otra condición si no está en la lista.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v)}
                    disabled={taxonomyLoad !== 'ready' || statusOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          taxonomyLoad === 'loading'
                            ? 'Cargando…'
                            : taxonomyLoad === 'error'
                              ? 'Error al cargar'
                              : 'Seleccione'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href="/inventario/estados/nueva"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Agregar
                    </Link>{' '}
                    otro estado si no está en la lista.
                  </p>
                </div>
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
            <Button
              type="submit"
              disabled={
                saving ||
                churchesLoad !== 'ready' ||
                taxonomyLoad !== 'ready' ||
                (Boolean(churchId) && templeAreasLoad === 'loading')
              }
            >
              {saving ? 'Guardando…' : 'Guardar recurso'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
