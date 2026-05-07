
'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { AppHeader } from '@/components/app-header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { TempleAssignmentCard } from '@/components/temple-assignment-card';

const STAFF_ROLE_NONE = '__none__';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(1, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'Por favor ingrese un correo electrónico válido.' }).min(1, { message: 'El correo electrónico es requerido.' }),
  phone: z.string().min(1, { message: 'El número de teléfono es requerido.' }),
  address: z.string().min(1, { message: 'La dirección es requerida.' }),
  dob: z.date({
    required_error: 'La fecha de nacimiento es requerida.',
  }),
  spiritualBirthday: z.date().optional(),
  groups: z.array(z.string()).nonempty({ message: 'Debe seleccionar al menos un grupo.' }),
  churchIds: z
    .array(z.string())
    .min(1, { message: 'Debe seleccionar al menos un templo.' }),
  membershipStatus: z.string({
    required_error: 'El estado de membresía es requerido.',
  }).min(1, { message: 'El estado de membresía es requerido.' }),
  staffRoleKind: z
    .string()
    .refine((v) => v !== STAFF_ROLE_NONE, {
      message: 'Seleccione un cargo válido.',
    }),
});

type FormValues = z.infer<typeof formSchema>;

const STAFF_ROLE_OPTIONS = [
  { value: STAFF_ROLE_NONE, label: 'Sin especificar' },
  { value: 'Pastor', label: 'Pastor' },
  { value: 'Congregante', label: 'Congregante' },
  { value: 'Directiva', label: 'Directiva' },
  { value: 'Presidente', label: 'Presidente' },
  { value: 'Responsable de una Comisión', label: 'Responsable de una Comisión' },
  { value: 'Consejo de pastores', label: 'Consejo de pastores' },
  { value: 'Director de Instituto', label: 'Director de Instituto' },
  { value: 'Pastor Regional', label: 'Pastor Regional' },
  { value: 'Pastor de Zona', label: 'Pastor de Zona' },
  { value: 'Pastor Presbiterial', label: 'Pastor Presbiterial' },
  { value: 'Ayuda Pastoral', label: 'Ayuda Pastoral' },
  { value: 'Director General', label: 'Director General' },
  { value: 'Estudiante del Instituto', label: 'Estudiante del Instituto' },
] as const;

function staffRoleToApi(kind: string): string | undefined {
  if (!kind || kind === STAFF_ROLE_NONE) return undefined;
  return kind;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('es') + word.slice(1))
    .join(' ');
}

const STAFF_ROLE_VALID = new Set(
  STAFF_ROLE_OPTIONS.map((o) => o.value).filter((v) => v !== STAFF_ROLE_NONE)
);

/** Valores guardados fuera del catálogo actual se muestran como «Sin especificar». */
function staffRoleKindFromApi(stored: string | null | undefined): string {
  const r = (stored ?? '').trim();
  if (!r) return STAFF_ROLE_NONE;
  /** Variante antigua del formulario; mismo rol que «Responsable de una Comisión». */
  if (r === 'Responsable de Comisión') return 'Responsable de una Comisión';
  return STAFF_ROLE_VALID.has(r) ? r : STAFF_ROLE_NONE;
}

const MEMBERSHIP_STATUS_OPTIONS = [
  {
    value: 'active' as const,
    label: 'Activo',
    description: 'Cuando la asistencia a la iglesia es constante.',
  },
  {
    value: 'visitor' as const,
    label: 'Visitante',
    description: 'Cuando lleva poco tiempo asistiendo a un templo.',
  },
  {
    value: 'inactive' as const,
    label: 'Inactivo',
    description: 'Cuando está regresando a la iglesia.',
  },
];

const MEMBERSHIP_CODES = new Set(['active', 'visitor', 'inactive']);

type ApiMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  spiritualBirthday: string | null;
  groups: string[];
  churchIds: string[];
  membershipStatus: string;
  photoDataUrl: string | null;
  staffRole: string | null;
};

function memberIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return (raw[0] && String(raw[0])) || '';
  if (typeof raw === 'string') return raw;
  return '';
}

/** Valores previos a `reset` tras cargar la API (solo evita error de tipos en useForm). */
const EMPTY_FORM_DEFAULTS = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  dob: new Date(),
  groups: [],
  churchIds: [],
  membershipStatus: 'active',
  staffRoleKind: STAFF_ROLE_NONE,
} as unknown as FormValues;

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const id = memberIdFromParams(params);
  const { toast } = useToast();
  /** Foto existente en BD; se reenvía al guardar para no borrarla (la API usa `null` como «sin foto»). */
  const [photoDataUrl, setPhotoDataUrl] = React.useState<string | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);
  const [groupOptions, setGroupOptions] = React.useState<string[]>([]);
  const [groupsLoadState, setGroupsLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM_DEFAULTS,
  });

  React.useEffect(() => {
    if (!id) {
      setLoadState('error');
      setLoadMessage('Identificador de miembro no válido.');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setLoadMessage(null);
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          member?: ApiMember;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar el miembro.');
        }
        const m = data.member;
        if (cancelled) return;
        if (!m) {
          setLoadState('error');
          setLoadMessage('No se recibieron datos del miembro.');
          return;
        }

        const dob = new Date(m.dob);
        const dobOk = !Number.isNaN(dob.getTime()) ? dob : new Date();

        let spiritual: Date | undefined;
        if (m.spiritualBirthday) {
          const s = new Date(m.spiritualBirthday);
          if (!Number.isNaN(s.getTime())) spiritual = s;
        }

        const membershipStatus = MEMBERSHIP_CODES.has(m.membershipStatus)
          ? m.membershipStatus
          : 'active';

        form.reset({
          firstName: m.firstName ?? '',
          lastName: m.lastName ?? '',
          email: m.email ?? '',
          phone: m.phone ?? '',
          address: m.address ?? '',
          dob: dobOk,
          spiritualBirthday: spiritual,
          groups: m.groups.length > 0 ? m.groups : [],
          churchIds: m.churchIds.length > 0 ? m.churchIds : [],
          membershipStatus,
          staffRoleKind: staffRoleKindFromApi(m.staffRole),
        });
        setPhotoDataUrl(m.photoDataUrl);
        setLoadState('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadState('error');
          setLoadMessage(e instanceof Error ? e.message : 'Error al cargar.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, form.reset]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setGroupsLoadState('loading');
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
        if (cancelled) return;
        const groups = [...new Set(
          (data.ministries ?? [])
            .map((m) => String(m.name ?? '').trim())
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'es'));
        setGroupOptions(groups);
        setGroupsLoadState('ready');
      } catch {
        if (!cancelled) {
          setGroupOptions([]);
          setGroupsLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

    const handleGroupToggle = (group: string) => {
    const currentGroups = form.getValues('groups') || [];
    const newGroups = currentGroups.includes(group)
      ? currentGroups.filter((g) => g !== group)
      : [...currentGroups, group];
    form.setValue('groups', newGroups as FormValues['groups'], {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          address: values.address,
          dob: values.dob.toISOString(),
          spiritualBirthday: values.spiritualBirthday?.toISOString() ?? null,
          groups: values.groups,
          churchIds: values.churchIds,
          membershipStatus: values.membershipStatus,
          photoDataUrl,
          staffRole: staffRoleToApi(values.staffRoleKind),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar los cambios.');
      }
      toast({
        title: 'Cambios guardados',
        description: data.message || 'El perfil se actualizó correctamente.',
      });
      router.push('/members');
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description:
          err instanceof Error ? err.message : 'Error al actualizar en la base de datos.',
      });
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Editar Miembro"
        description="Actualice los datos del perfil. La información se carga desde el directorio de miembros."
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href={id ? `/members/${id}` : '/members'}>Cancelar</Link>
          </Button>
          <Button
            type="button"
            disabled={loadState !== 'ready' || form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 space-y-6 bg-muted/20 p-4 sm:p-8">
        {loadState === 'loading' ? (
          <p className="text-sm text-muted-foreground">Cargando datos del miembro…</p>
        ) : null}
        {loadState === 'error' ? (
          <p className="text-sm text-destructive">{loadMessage ?? 'No se pudo cargar el miembro.'}</p>
        ) : null}

        {loadState === 'ready' ? (
          <Form {...form} key={`edit-member-${id}`}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
              <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>Detalles básicos sobre el miembro.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="Apellido(s)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Teléfono</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Calle, ciudad, país" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Nacimiento</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                              <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP') : <span>mm/dd/yyyy</span>}
                              </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                              />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="spiritualBirthday"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Bautismo</FormLabel>
                           <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                              <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                              >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP') : <span>mm/dd/yyyy</span>}
                              </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1900}
                                toYear={new Date().getFullYear()}
                              />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Directorio de personal</CardTitle>
                  <CardDescription>
                    Indique el cargo del miembro (Pastor, Congregante, Directiva o Presidente); con ello
                    podrá listarse en el directorio de personal.
                  </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="staffRoleKind"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo o rol (obligatorio)</FormLabel>
                        <Select value={field.value ?? STAFF_ROLE_NONE} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAFF_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Grupos y Ministerios</CardTitle>
                  <CardDescription>
                    Asigne el miembro a grupos y ministerios existentes en la colección `members`.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="groups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asignar a Grupos</FormLabel>
                        <div className="mt-2 max-h-60 space-y-3 overflow-y-auto rounded-md border p-4">
                          {groupsLoadState === 'loading' ? (
                            <p className="text-sm text-muted-foreground">
                              Cargando grupos y ministerios desde la base de datos...
                            </p>
                          ) : null}
                          {groupsLoadState === 'error' ? (
                            <p className="text-sm text-destructive">
                              No se pudieron cargar ministerios.
                            </p>
                          ) : null}
                          {groupsLoadState === 'ready' && groupOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No hay ministerios registrados en `ministries`.
                            </p>
                          ) : null}
                          {groupsLoadState === 'ready'
                            ? groupOptions.map((group) => (
                              <div key={group} className="flex items-center gap-3">
                                  <Checkbox 
                                id={`edit-member-group-${group}`}
                                checked={field.value?.includes(group)}
                                      onCheckedChange={() => handleGroupToggle(group)}
                                  />
                              <Label htmlFor={`edit-member-group-${group}`} className="cursor-pointer font-normal">
                                {toTitleCase(group)}
                              </Label>
                              </div>
                            ))
                            : null}
                      </div>
                        <p className="mt-2 text-xs text-muted-foreground">Puede seleccionar múltiples grupos.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="membershipStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado de Membresía</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent className="min-w-[min(100vw-2rem,22rem)]">
                            {MEMBERSHIP_STATUS_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                secondary={opt.description}
                                className="py-2.5"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
          </Card>

              <FormField
                control={form.control}
                name="churchIds"
                render={({ field }) => (
                  <FormItem>
                    <TempleAssignmentCard
                      selectedIds={field.value ?? []}
                      onToggle={(churchId) => {
                        const current = field.value ?? [];
                        const next = current.includes(churchId)
                          ? current.filter((cid) => cid !== churchId)
                          : [...current, churchId];
                        field.onChange(next);
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : null}
    </main>
    </div>
  );
}
