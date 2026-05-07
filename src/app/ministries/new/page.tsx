'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, { message: 'El nombre del ministerio es requerido.' }),
  description: z.string().max(8000),
  churchId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type PastorChurchOption = { id: string; name: string };

type MinistryCatalogOption = { id: string; name: string };

const MINISTRY_NEW_FORM_ID = 'ministry-new-form';

/** Valor del ítem «Nuevo» en el combo (no colisiona con ids de Mongo). */
const MINISTRY_CATALOG_NEW_ID = '__ministry_catalog_new__';

export default function NewMinistryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [pastorChurches, setPastorChurches] = React.useState<PastorChurchOption[]>([]);
  const [churchesLoad, setChurchesLoad] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [ministryCatalog, setMinistryCatalog] = React.useState<MinistryCatalogOption[]>([]);
  const [catalogLoad, setCatalogLoad] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [selectedCatalogMinistryId, setSelectedCatalogMinistryId] = React.useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      churchId: '',
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setChurchesLoad('loading');
      try {
        const res = await fetch('/api/churches/created-by-me', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          churches?: { id: string; name: string }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar sus templos.');
        }
        if (!cancelled) {
          const rows = (data.churches ?? []).map((c) => ({
            id: String(c.id ?? '').trim(),
            name: String(c.name ?? '').trim() || 'Sin nombre',
          }));
          setPastorChurches(rows.filter((c) => c.id));
          setChurchesLoad('ready');
        }
      } catch {
        if (!cancelled) {
          setPastorChurches([]);
          setChurchesLoad('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoad('loading');
      try {
        const res = await fetch('/api/ministries/catalog', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          ministries?: { id?: string; name?: string }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar los ministerios.');
        }
        if (!cancelled) {
          const rows = (data.ministries ?? []).map((m) => ({
            id: String(m.id ?? '').trim(),
            name: String(m.name ?? '').trim() || 'Sin nombre',
          }));
          setMinistryCatalog(rows.filter((m) => m.id));
          setCatalogLoad('ready');
        }
      } catch {
        if (!cancelled) {
          setMinistryCatalog([]);
          setCatalogLoad('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (pastorChurches.length > 0 && !values.churchId?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Falta el templo',
        description: 'Seleccione el templo al que pertenece este ministerio.',
      });
      return;
    }

    setSaving(true);
    try {
      const churchId = values.churchId?.trim() || undefined;
      const res = await fetch('/api/ministries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim(),
          leaders: [],
          ...(churchId ? { churchId } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        id?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el ministerio.');
      }
      toast({
        title: 'Ministerio creado',
        description: data.message || `«${values.name}» se guardó en la base de datos.`,
      });
      router.push('/ministries');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description: err instanceof Error ? err.message : 'Error al guardar en la base de datos.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Crear Nuevo Ministerio"
        description="Complete los detalles a continuación para establecer un nuevo ministerio."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link href="/ministries">Cancelar</Link>
          </Button>
          <Button type="submit" form={MINISTRY_NEW_FORM_ID} disabled={saving}>
            {saving ? 'Guardando…' : 'Crear Ministerio'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 space-y-6 bg-muted/20 p-4 sm:p-8">
        <Form {...form}>
          <form
            id={MINISTRY_NEW_FORM_ID}
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <Card className="mx-auto max-w-3xl">
              <CardHeader>
                <CardTitle>Detalles del Ministerio</CardTitle>
                <CardDescription>
                  El nombre es obligatorio; la descripción es opcional. Si es pastor y tiene templos
                  asignados en su perfil, elija uno. Podrá asignar líderes más adelante desde la
                  edición del ministerio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {churchesLoad === 'loading' ? (
                  <p className="text-sm text-muted-foreground">Cargando sus templos…</p>
                ) : null}
                {churchesLoad === 'error' ? (
                  <p className="text-sm text-destructive">
                    No se pudieron cargar los templos. Actualice la página o compruebe su conexión.
                  </p>
                ) : null}
                {churchesLoad === 'ready' && pastorChurches.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="churchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Templo</FormLabel>
                        <Select
                          value={field.value && field.value.length > 0 ? field.value : undefined}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un templo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pastorChurches.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Lista los templos vinculados a su perfil de pastor en la base de datos.
                        </p>
                      </FormItem>
                    )}
                  />
                ) : null}
                {churchesLoad === 'ready' && pastorChurches.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    No hay templos asignados a su perfil de miembro. Un administrador puede
                    vincularle ubicaciones en su ficha, o actualícelas al editar su registro en el
                    directorio.
                  </div>
                ) : null}
                {catalogLoad === 'loading' ? (
                  <p className="text-sm text-muted-foreground">Cargando ministerios registrados…</p>
                ) : null}
                {catalogLoad === 'error' ? (
                  <p className="text-sm text-destructive">
                    No se pudieron cargar los nombres de ministerios. Actualice la página o
                    compruebe su conexión.
                  </p>
                ) : null}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => {
                    const isNewMinistryName = selectedCatalogMinistryId === MINISTRY_CATALOG_NEW_ID;
                    const onCatalogIdChange = (id: string) => {
                      setSelectedCatalogMinistryId(id);
                      if (id === MINISTRY_CATALOG_NEW_ID) {
                        field.onChange('');
                        return;
                      }
                      const picked = ministryCatalog.find((m) => m.id === id);
                      field.onChange(picked?.name ?? '');
                    };
                    const catalogSelect = (
                      <Select
                        value={selectedCatalogMinistryId || undefined}
                        onValueChange={onCatalogIdChange}
                      >
                        <SelectTrigger id="ministry-name-catalog-select">
                          <SelectValue placeholder="Seleccione un ministerio" />
                        </SelectTrigger>
                        <SelectContent>
                          {ministryCatalog.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={MINISTRY_CATALOG_NEW_ID}>Nuevo</SelectItem>
                        </SelectContent>
                      </Select>
                    );
                    return (
                      <FormItem>
                        <FormLabel>Nombre del Ministerio</FormLabel>
                        {catalogLoad === 'ready' && ministryCatalog.length === 0 ? (
                          <div className="space-y-2">
                            <Label
                              htmlFor="ministry-new-name-empty"
                              className="text-muted-foreground"
                            >
                              Agregar nuevo ministerio
                            </Label>
                            <FormControl>
                              <Input
                                id="ministry-new-name-empty"
                                placeholder="Agregar nuevo ministerio"
                                name={field.name}
                                ref={field.ref}
                                value={field.value ?? ''}
                                onBlur={field.onBlur}
                                onChange={(e) => field.onChange(e.target.value)}
                                autoComplete="off"
                              />
                            </FormControl>
                          </div>
                        ) : null}
                        {catalogLoad === 'ready' && ministryCatalog.length > 0 ? (
                          <div className="space-y-3">
                            {isNewMinistryName ? catalogSelect : <FormControl>{catalogSelect}</FormControl>}
                            {isNewMinistryName ? (
                              <div className="space-y-2">
                                <Label
                                  htmlFor="ministry-new-name-custom"
                                  className="text-muted-foreground"
                                >
                                  Agregar nuevo ministerio
                                </Label>
                                <FormControl>
                                  <Input
                                    id="ministry-new-name-custom"
                                    placeholder="Agregar nuevo ministerio"
                                    name={field.name}
                                    ref={field.ref}
                                    value={field.value ?? ''}
                                    onBlur={field.onBlur}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    autoComplete="off"
                                  />
                                </FormControl>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <FormMessage />
                        {catalogLoad === 'ready' && ministryCatalog.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Lista tomada de la colección «ministries» en la base de datos. Se creará un
                            nuevo registro con el nombre elegido (puede repetirse en otro templo).
                          </p>
                        ) : null}
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa el propósito y las responsabilidades de este ministerio."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </div>
  );
}
