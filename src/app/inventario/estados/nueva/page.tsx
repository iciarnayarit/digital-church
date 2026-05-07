'use client';

import * as React from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const backHref = '/inventario/nuevo';

type EstadoRow = { id: string; name: string };

function newEstadoRow(): EstadoRow {
  return { id: crypto.randomUUID(), name: '' };
}

export default function InventarioNuevoEstadoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<EstadoRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState('loading');
      setLoadError(null);
      try {
        const res = await fetch('/api/inventory/taxonomy', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          statuses?: { key: string; label: string; builtin?: boolean }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudieron cargar los estados.');
        }
        if (cancelled) return;
        const custom = (json.statuses ?? []).filter((s) => !s.builtin);
        setRows(
          custom.length > 0
            ? custom.map((s) => ({ id: s.key, name: s.label }))
            : []
        );
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        setLoadState('error');
        setLoadError(e instanceof Error ? e.message : 'Error al cargar.');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRow = (index: number, name: string) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, name } : row)));
  };

  const removeRow = (index: number) => {
    setRows((r) => r.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((r) => [...r, newEstadoRow()]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/taxonomy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          kind: 'status',
          rows: rows.map((row) => ({ id: row.id, name: row.name })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudieron guardar los estados.');
      }
      toast({
        title: 'Estados guardados',
        description: 'Las opciones personalizadas quedaron en la base de datos.',
      });
      router.push(backHref);
      router.refresh();
    } catch (e) {
      toast({
        title: 'Error al guardar',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title="Estados de inventario"
        description={
          loadState === 'ready'
            ? 'Defina estados adicionales para la disponibilidad o uso del recurso.'
            : 'Cargando…'
        }
      >
        <Button variant="outline" type="button" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </AppHeader>

      <main className="flex-1 bg-muted/30 p-4 sm:p-8">
        {loadState === 'error' ? (
          <p className="text-center text-sm text-destructive">{loadError}</p>
        ) : null}

        {loadState === 'loading' ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : null}

        {loadState === 'ready' ? (
          <Card className="mx-auto max-w-xl shadow-sm">
            <CardHeader>
              <CardTitle>Estados adicionales</CardTitle>
              <CardDescription>
                Cada fila es un estado disponible al añadir recursos al inventario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay estados personalizados aún. Use «Añadir estado» para crear el primero.
                </p>
              ) : null}
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`est-${row.id}`}>Nombre del estado</Label>
                      <Input
                        id={`est-${row.id}`}
                        value={row.name}
                        onChange={(e) => updateRow(index, e.target.value)}
                        placeholder="Ej. Reservado"
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="Eliminar estado"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={addRow}
              >
                <Plus className="h-4 w-4" />
                Añadir estado
              </Button>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                {saving ? (
                  <Button type="button" variant="outline" disabled>
                    Cancelar
                  </Button>
                ) : (
                  <Button type="button" variant="outline" asChild>
                    <Link href={backHref}>Cancelar</Link>
                  </Button>
                )}
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar estados'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
