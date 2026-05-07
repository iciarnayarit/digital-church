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

type CondRow = { id: string; name: string };

function newCondRow(): CondRow {
  return { id: crypto.randomUUID(), name: '' };
}

export default function InventarioNuevaCondicionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<CondRow[]>([]);
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
          conditions?: { key: string; label: string; builtin?: boolean }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudieron cargar las condiciones.');
        }
        if (cancelled) return;
        const custom = (json.conditions ?? []).filter((c) => !c.builtin);
        setRows(
          custom.length > 0
            ? custom.map((c) => ({ id: c.key, name: c.label }))
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
    setRows((r) => [...r, newCondRow()]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/taxonomy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          kind: 'condition',
          rows: rows.map((row) => ({ id: row.id, name: row.name })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudieron guardar las condiciones.');
      }
      toast({
        title: 'Condiciones guardadas',
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
        title="Condiciones de inventario"
        description={
          loadState === 'ready'
            ? 'Defina condiciones adicionales para el estado físico del recurso.'
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
              <CardTitle>Condiciones adicionales</CardTitle>
              <CardDescription>
                Cada fila es una condición disponible al añadir recursos al inventario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay condiciones personalizadas aún. Use «Añadir condición» para crear la primera.
                </p>
              ) : null}
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`cond-${row.id}`}>Nombre de la condición</Label>
                      <Input
                        id={`cond-${row.id}`}
                        value={row.name}
                        onChange={(e) => updateRow(index, e.target.value)}
                        placeholder="Ej. Regular"
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="Eliminar condición"
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
                Añadir condición
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
                  {saving ? 'Guardando…' : 'Guardar condiciones'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
