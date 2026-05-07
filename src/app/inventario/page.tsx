'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Wrench,
  Layers,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  type CategoryOption,
  conditionRowMeta,
  INVENTORY_DEFAULT_CATEGORY_LABEL,
  INVENTORY_DEFAULT_CATEGORY_VALUE,
  LOCATION_LINK_CLASS,
  statusRowMeta,
  type ResourceRow,
} from '@/lib/inventory';
import type { ChurchLocation } from '@/lib/church-locations';

const LOCATION_DIST_TONES = [
  'bg-blue-600',
  'bg-orange-500',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-cyan-600',
] as const;

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadInventoryTableCsv(rows: ResourceRow[]) {
  const headers = [
    'Nombre del recurso',
    'Categoría',
    'Ubicación (área)',
    'Cantidad',
    'Condición',
    'Estado',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        csvEscapeCell(r.name),
        csvEscapeCell(r.category),
        csvEscapeCell(r.location),
        String(r.quantity),
        csvEscapeCell(conditionRowMeta(r.condition, r.conditionDisplayLabel).label),
        csvEscapeCell(statusRowMeta(r.status, r.statusDisplayLabel).label),
      ].join(',')
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatAuditInventoryDescription(
  iso: string | null,
  load: 'loading' | 'ready' | 'error'
): string {
  if (load === 'loading') return 'Cargando la fecha de última actividad…';
  if (load === 'error') return 'No se pudo obtener la fecha de última actividad.';
  if (!iso) {
    return 'Aún no hay registros en el inventario. Añada recursos para iniciar el seguimiento digital.';
  }
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 0) {
    return `Última actividad registrada: ${dateStr}. Mantenga actualizado el inventario digital.`;
  }
  if (days === 0) {
    return `La última actualización del inventario fue hoy (${dateStr}). Mantenga actualizado el inventario digital.`;
  }
  if (days === 1) {
    return `La última actualización del inventario fue ayer (${dateStr}). Mantenga actualizado el inventario digital.`;
  }
  return `La última actualización del inventario fue el ${dateStr} (hace ${days} días). Mantenga actualizado el inventario digital.`;
}

/** Progreso visual según antigüedad de la última actividad (más reciente = mayor). */
function auditProgressFromLastActivity(iso: string | null): number {
  if (!iso) return 0;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days <= 7) return 100;
  if (days <= 14) return 85;
  if (days <= 30) return 65;
  if (days <= 60) return 45;
  if (days <= 90) return 30;
  return 15;
}

export default function InventarioPage() {
  const { toast } = useToast();
  const [church, setChurch] = React.useState('all');
  const [churches, setChurches] = React.useState<ChurchLocation[]>([]);
  const [churchesLoad, setChurchesLoad] = React.useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [category, setCategory] = React.useState('all');
  const [location, setLocation] = React.useState('all');
  const [condition, setCondition] = React.useState('all');
  const [view, setView] = React.useState<'list' | 'grid'>('list');
  const [fromApi, setFromApi] = React.useState<ResourceRow[]>([]);
  const [inventoryLoad, setInventoryLoad] = React.useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [lastInventoryActivityAt, setLastInventoryActivityAt] = React.useState<string | null>(null);
  const [resourceCategories, setResourceCategories] = React.useState<CategoryOption[]>([]);
  const [customCategories, setCustomCategories] = React.useState<
    { value: string; label: string; optionId: number }[]
  >([]);

  const categoryFilterOptions = React.useMemo((): CategoryOption[] => {
    const custom = customCategories.map((c) => ({
      id: c.optionId,
      value: c.value,
      label: c.label,
    }));
    const base = [...resourceCategories, ...custom];
    const hasUncat = base.some((c) => c.value === INVENTORY_DEFAULT_CATEGORY_VALUE);
    if (hasUncat) return base;
    return [
      {
        id: 0,
        value: INVENTORY_DEFAULT_CATEGORY_VALUE,
        label: INVENTORY_DEFAULT_CATEGORY_LABEL,
      },
      ...base,
    ];
  }, [resourceCategories, customCategories]);

  const itemsInSelectedChurch = React.useMemo(() => {
    if (church === 'all') return fromApi;
    return fromApi.filter((r) => r.churchId === church);
  }, [fromApi, church]);

  const locationFilterOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of itemsInSelectedChurch) {
      if (!map.has(r.locationFilter)) {
        map.set(r.locationFilter, r.location);
      }
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'es', { sensitivity: 'base' })
    );
  }, [itemsInSelectedChurch]);

  React.useEffect(() => {
    if (location === 'all') return;
    const ok = itemsInSelectedChurch.some((r) => r.locationFilter === location);
    if (!ok) setLocation('all');
  }, [church, itemsInSelectedChurch, location]);

  React.useEffect(() => {
    let cancelled = false;
    const loadChurches = async () => {
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
        if (!cancelled) {
          if (res.ok) {
            setChurches(json.churches ?? []);
            setChurchesLoad('ready');
          } else {
            setChurches([]);
            setChurchesLoad('error');
          }
        }
      } catch {
        if (!cancelled) {
          setChurches([]);
          setChurchesLoad('error');
        }
      }
    };
    void loadChurches();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadResource = async () => {
      try {
        const res = await fetch('/api/resource', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          categories?: CategoryOption[];
        };
        if (!cancelled && res.ok) {
          setResourceCategories(json.categories ?? []);
        }
      } catch {
        if (!cancelled) setResourceCategories([]);
      }
    };
    void loadResource();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const loadCats = async () => {
      try {
        const res = await fetch('/api/inventory/categories', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          categories?: typeof customCategories;
        };
        if (!cancelled && res.ok) {
          setCustomCategories(json.categories ?? []);
        }
      } catch {
        if (!cancelled) setCustomCategories([]);
      }
    };
    void loadCats();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setInventoryLoad('loading');
      try {
        const res = await fetch('/api/inventory', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          items?: ResourceRow[];
          lastInventoryActivityAt?: string | null;
        };
        if (!cancelled) {
          if (res.ok) {
            setFromApi(json.items ?? []);
            setLastInventoryActivityAt(
              typeof json.lastInventoryActivityAt === 'string'
                ? json.lastInventoryActivityAt
                : null
            );
            setInventoryLoad('ready');
          } else {
            setFromApi([]);
            setLastInventoryActivityAt(null);
            setInventoryLoad('error');
          }
        }
      } catch {
        if (!cancelled) {
          setFromApi([]);
          setLastInventoryActivityAt(null);
          setInventoryLoad('error');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allResources = fromApi;

  const filtered = React.useMemo(() => {
    return allResources.filter((r) => {
      if (church !== 'all') {
        if (!r.churchId || r.churchId !== church) return false;
      }
      if (category !== 'all' && r.categoryFilter !== category) return false;
      if (location !== 'all' && r.locationFilter !== location) return false;
      if (condition !== 'all' && r.condition !== condition) return false;
      return true;
    });
  }, [allResources, church, category, location, condition]);

  const scopedInventoryCount =
    church === 'all' ? allResources.length : itemsInSelectedChurch.length;

  /** KPIs y distribución: datos de la colección `inventory` (ámbito = todo o templo), sin filtros de tabla. */
  const inventoryScopeForKpis = React.useMemo(
    () => (church === 'all' ? allResources : itemsInSelectedChurch),
    [church, allResources, itemsInSelectedChurch]
  );

  const distinctLocationCount = React.useMemo(
    () => new Set(inventoryScopeForKpis.map((r) => r.locationFilter)).size,
    [inventoryScopeForKpis]
  );

  const maintenanceRowCount = React.useMemo(
    () => inventoryScopeForKpis.filter((r) => r.status === 'maintenance').length,
    [inventoryScopeForKpis]
  );

  const maintenanceQuantitySum = React.useMemo(
    () =>
      inventoryScopeForKpis
        .filter((r) => r.status === 'maintenance')
        .reduce((s, r) => s + r.quantity, 0),
    [inventoryScopeForKpis]
  );

  const topLocation = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of inventoryScopeForKpis) {
      counts.set(r.location, (counts.get(r.location) ?? 0) + r.quantity);
    }
    let bestName = '';
    let bestQty = 0;
    for (const [name, qty] of counts) {
      if (qty > bestQty) {
        bestName = name;
        bestQty = qty;
      }
    }
    return bestName ? { name: bestName, qty: bestQty } : null;
  }, [inventoryScopeForKpis]);

  const availabilityPct = React.useMemo(() => {
    const totalQty = inventoryScopeForKpis.reduce((s, r) => s + r.quantity, 0);
    if (totalQty <= 0) return 0;
    const availQty = inventoryScopeForKpis
      .filter((r) => r.status === 'available')
      .reduce((s, r) => s + r.quantity, 0);
    return Math.round((availQty / totalQty) * 100);
  }, [inventoryScopeForKpis]);

  const locationDistribution = React.useMemo(() => {
    const byFilter = new Map<
      string,
      { name: string; itemCount: number; totalQty: number }
    >();
    for (const r of inventoryScopeForKpis) {
      const cur = byFilter.get(r.locationFilter) ?? {
        name: r.location,
        itemCount: 0,
        totalQty: 0,
      };
      cur.itemCount += 1;
      cur.totalQty += r.quantity;
      byFilter.set(r.locationFilter, cur);
    }
    const rows = Array.from(byFilter.entries())
      .map(([locationFilter, z]) => ({ locationFilter, ...z }))
      .sort((a, b) => b.totalQty - a.totalQty);
    const sumQty = rows.reduce((s, z) => s + z.totalQty, 0);
    return rows.map((z, i) => ({
      ...z,
      pct: sumQty > 0 ? Math.round((z.totalQty / sumQty) * 100) : 0,
      tone: LOCATION_DIST_TONES[i % LOCATION_DIST_TONES.length],
      code: String(i + 1).padStart(2, '0'),
    }));
  }, [inventoryScopeForKpis]);

  const formatInt = (n: number) =>
    new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n);

  const handleExportCsv = React.useCallback(() => {
    if (inventoryLoad !== 'ready') {
      toast({
        title: 'Espere',
        description: 'El inventario aún se está cargando.',
        variant: 'destructive',
      });
      return;
    }
    if (filtered.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay filas en la vista actual para exportar.',
        variant: 'destructive',
      });
      return;
    }
    downloadInventoryTableCsv(filtered);
    toast({
      title: 'CSV descargado',
      description: `Se exportaron ${formatInt(filtered.length)} filas.`,
    });
  }, [filtered, inventoryLoad, toast]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title="Gestión de inventario"
        description="Administre, rastree y audite los bienes de la comunidad en todos los ministerios."
      >
        <Button type="button" className="shrink-0 gap-2" asChild>
          <Link href="/inventario/nuevo">
            <Plus className="h-4 w-4" />
            Añadir recurso nuevo
          </Link>
        </Button>
      </AppHeader>

      <main className="flex-1 space-y-6 bg-muted/30 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {inventoryLoad === 'ready' && inventoryScopeForKpis.length > 0
                    ? `${formatInt(
                        inventoryScopeForKpis.reduce((s, r) => s + r.quantity, 0)
                      )} uds.`
                    : null}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total de recursos</p>
                <p className="text-3xl font-bold tracking-tight">
                  {inventoryLoad === 'loading' ? '…' : formatInt(inventoryScopeForKpis.length)}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Wrench className="h-5 w-5" />
                </div>
                {maintenanceQuantitySum > 0 ? (
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    {formatInt(maintenanceQuantitySum)} uds.
                  </span>
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">En mantenimiento</p>
                <p className="text-3xl font-bold tracking-tight">
                  {inventoryLoad === 'loading' ? '…' : formatInt(maintenanceRowCount)}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="rounded-lg bg-purple-100 p-2 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <MapPin className="h-5 w-5" />
                </div>
                {distinctLocationCount > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {distinctLocationCount}{' '}
                    {distinctLocationCount === 1 ? 'zona' : 'zonas'}
                  </span>
                ) : null}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Ubicación principal (por cantidad)</p>
                <p className="text-xl font-bold tracking-tight sm:text-2xl">
                  {inventoryLoad === 'loading'
                    ? '…'
                    : topLocation
                      ? topLocation.name
                      : '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-emerald-700">
                  {inventoryLoad === 'loading' ? '…' : `${availabilityPct} %`}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Disponibilidad (por cantidad)</p>
                <p className="text-3xl font-bold tracking-tight">
                  {inventoryLoad === 'loading' || inventoryScopeForKpis.length === 0
                    ? '—'
                    : availabilityPct >= 70
                      ? 'Alta'
                      : availabilityPct >= 40
                        ? 'Media'
                        : 'Baja'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={church}
                    onValueChange={(v) => {
                      setChurch(v);
                      setLocation('all');
                    }}
                    disabled={churchesLoad !== 'ready'}
                  >
                    <SelectTrigger className="w-[min(100%,220px)] min-w-[180px]">
                      <SelectValue placeholder="Templo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los templos</SelectItem>
                      {[...churches]
                        .sort((a, b) =>
                          a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                        )
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[min(100%,220px)] min-w-[180px]">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categoryFilterOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-[min(100%,220px)] min-w-[180px]">
                      <SelectValue placeholder="Ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ubicaciones</SelectItem>
                      {locationFilterOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Condición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Condición</SelectItem>
                      <SelectItem value="excellent">Excelente</SelectItem>
                      <SelectItem value="good">Bueno</SelectItem>
                      <SelectItem value="repair">Requiere reparación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-md border bg-background p-0.5">
                    <Button
                      type="button"
                      variant={view === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Vista cuadrícula"
                      onClick={() => setView('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={view === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Vista lista"
                      onClick={() => setView('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-primary"
                    type="button"
                    onClick={handleExportCsv}
                    disabled={inventoryLoad !== 'ready' || filtered.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>

              {view === 'list' ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Recurso
                        </TableHead>
                        <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Ubicación (área)
                        </TableHead>
                        <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Cantidad
                        </TableHead>
                        <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Condición
                        </TableHead>
                        <TableHead className="font-semibold uppercase tracking-wide text-muted-foreground">
                          Estado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryLoad === 'loading' ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Cargando inventario…
                          </TableCell>
                        </TableRow>
                      ) : inventoryLoad === 'error' ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-destructive">
                            No se pudo cargar el inventario. Inténtelo de nuevo más tarde.
                          </TableCell>
                        </TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            {allResources.length === 0
                              ? 'No hay recursos en la colección inventory. Use «Añadir recurso nuevo» para crear el primero.'
                              : church !== 'all' && itemsInSelectedChurch.length === 0
                                ? 'No hay recursos registrados para este templo.'
                                : 'Ningún recurso coincide con los filtros.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="font-medium">{r.name}</div>
                              <div className="text-sm text-muted-foreground">{r.category}</div>
                            </TableCell>
                            <TableCell>
                              {r.locationPill ? (
                                <Badge
                                  variant="outline"
                                  className="border-orange-200 bg-orange-50 text-orange-800"
                                >
                                  {r.location}
                                </Badge>
                              ) : (
                                <span
                                  className={cn(
                                    'font-medium',
                                    LOCATION_LINK_CLASS[r.locationTone]
                                  )}
                                >
                                  {r.location}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{formatInt(r.quantity)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'h-2 w-2 shrink-0 rounded-full',
                                    conditionRowMeta(r.condition, r.conditionDisplayLabel).dot
                                  )}
                                />
                                <span className="text-sm">
                                  {conditionRowMeta(r.condition, r.conditionDisplayLabel).label}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'font-normal',
                                  statusRowMeta(r.status, r.statusDisplayLabel).className
                                )}
                              >
                                {statusRowMeta(r.status, r.statusDisplayLabel).label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : inventoryLoad === 'loading' ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Cargando inventario…
                </p>
              ) : inventoryLoad === 'error' ? (
                <p className="py-12 text-center text-sm text-destructive">
                  No se pudo cargar el inventario.
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {allResources.length === 0
                    ? 'No hay recursos en la colección inventory.'
                    : church !== 'all' && itemsInSelectedChurch.length === 0
                      ? 'No hay recursos registrados para este templo.'
                      : 'Ningún recurso coincide con los filtros.'}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((r) => (
                    <Card key={r.id} className="border shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{r.name}</CardTitle>
                        <CardDescription>{r.category}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Ubicación</span>
                          <span className="font-medium text-right">{r.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cantidad</span>
                          <span>{formatInt(r.quantity)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                conditionRowMeta(r.condition, r.conditionDisplayLabel).dot
                              )}
                            />
                            {conditionRowMeta(r.condition, r.conditionDisplayLabel).label}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-normal',
                              statusRowMeta(r.status, r.statusDisplayLabel).className
                            )}
                          >
                            {statusRowMeta(r.status, r.statusDisplayLabel).label}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                {inventoryLoad === 'ready' ? (
                  filtered.length === scopedInventoryCount &&
                  category === 'all' &&
                  location === 'all' &&
                  condition === 'all' ? (
                    <p>
                      {formatInt(filtered.length)} recursos
                      {church === 'all' ? ' en inventario' : ' en el templo seleccionado'}
                    </p>
                  ) : (
                    <p>
                      {formatInt(filtered.length)} coinciden con los filtros (
                      {formatInt(scopedInventoryCount)}
                      {church === 'all' ? ' en inventario' : ' en este templo'})
                    </p>
                  )
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>Distribución por ubicación</CardTitle>
                <CardDescription>
                  Resumen de ítems rastreados por zona principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {inventoryLoad !== 'ready' ? (
                    <p className="col-span-full text-sm text-muted-foreground">Cargando…</p>
                  ) : locationDistribution.length === 0 ? (
                    <p className="col-span-full text-sm text-muted-foreground">
                      Sin datos de ubicación en el inventario.
                    </p>
                  ) : (
                    locationDistribution.map((z) => (
                      <div
                        key={z.locationFilter}
                        className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white',
                            z.tone
                          )}
                        >
                          {z.code}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{z.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatInt(z.itemCount)} filas · {formatInt(z.totalQty)} unidades
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{z.pct}%</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-primary text-primary-foreground shadow-md">
              <CardHeader>
                <CardTitle className="text-primary-foreground">Auditoría de inventario</CardTitle>
                <CardDescription className="text-primary-foreground/90">
                  {formatAuditInventoryDescription(lastInventoryActivityAt, inventoryLoad)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Progreso de auditoría</span>
                    <span className="font-semibold">
                      {inventoryLoad === 'loading'
                        ? '…'
                        : `${auditProgressFromLastActivity(lastInventoryActivityAt)} %`}
                    </span>
                  </div>
                  <Progress
                    value={auditProgressFromLastActivity(lastInventoryActivityAt)}
                    className="h-2 bg-primary-foreground/25"
                    indicatorClassName="bg-primary-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link href="/inventario/nuevo">Iniciar auditoría mensual</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
