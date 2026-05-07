
'use client';

import * as React from 'react';
import { useUser } from '@clerk/nextjs';
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
import { usePathname, useRouter } from 'next/navigation';
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
import { isLeadershipStaffRole } from '@/lib/pastor-church-access';

type MinistryCatalogRow = { id: string; name: string };

const STAFF_ROLE_NONE = '__none__';

const formSchema = z.object({
  firstName: z.string().min(1, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(1, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'Por favor ingrese un correo electrónico válido.' }).min(1, { message: 'El correo electrónico es requerido.' }),
  phone: z.string().min(1, { message: 'El número de teléfono es requerido.' }),
  address: z.string().min(1, { message: 'La dirección es requerida.' }),
  dob: z.date({
    required_error: "La fecha de nacimiento es requerida.",
  }),
  spiritualBirthday: z.date().optional(),
  groups: z.array(z.string()).default([]),
  churchIds: z.array(z.string()).default([]),
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
  { value: 'Consejo de pastores', label: 'Consejo de Pastores' },
  { value: 'Director de Instituto', label: 'Director de Instituto' },
  { value: 'Pastor Regional', label: 'Pastor Regional' },
  { value: 'Pastor de Zona', label: 'Pastor de Zona' },
  { value: 'Pastor Presbiterial', label: 'Pastor Presbiterial' },
  { value: 'Ayuda Pastoral', label: 'Ayuda Pastoral' },
  { value: 'Director General', label: 'Director General' },
  { value: 'Estudiante del Instituto', label: 'Estudiante del Instituto' },
  { value: 'Responsable de una Secretaría', label: 'Responsable de una Secretaría' },
] as const;

type StaffRoleOption = (typeof STAFF_ROLE_OPTIONS)[number]['value'];

function staffRoleToApi(kind: string): string | undefined {
  if (!kind || kind === STAFF_ROLE_NONE) return undefined;
  return kind;
}

function staffRoleKindFromApi(stored: string | null | undefined): StaffRoleOption {
  const r = String(stored ?? '').trim();
  const valid = new Set<StaffRoleOption>([
    STAFF_ROLE_NONE,
    'Pastor',
    'Congregante',
    'Directiva',
    'Presidente',
    'Responsable de una Comisión',
    'Consejo de pastores',
    'Director de Instituto',
    'Pastor Regional',
    'Pastor de Zona',
    'Pastor Presbiterial',
    'Ayuda Pastoral',
    'Director General',
    'Estudiante del Instituto',
    'Responsable de una Secretaría',
  ]);
  return valid.has(r as StaffRoleOption) ? (r as StaffRoleOption) : STAFF_ROLE_NONE;
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

/** Estado de membresía por defecto al crear desde este formulario (la API lo requiere). */
const DEFAULT_MEMBERSHIP_STATUS = 'active' as const;

export default function NewMemberPage() {
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const isAddMode = pathname?.startsWith('/members/add') ?? false;
    const { user, isLoaded: clerkLoaded } = useUser();
    const [ministriesFromDb, setMinistriesFromDb] = React.useState<MinistryCatalogRow[]>([]);
    const [isNewPortalUser, setIsNewPortalUser] = React.useState(false);
    const [isUnregisteredPortalUser, setIsUnregisteredPortalUser] = React.useState(false);
    const [isCongregantePortalUser, setIsCongregantePortalUser] = React.useState(false);
    const [isLeadershipPortalUser, setIsLeadershipPortalUser] = React.useState(false);
    const [groupsLoad, setGroupsLoad] = React.useState<
      'loading' | 'ready' | 'error'
    >('loading');

    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/members/me-role', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const data = (await res.json().catch(() => ({}))) as {
            isNew?: boolean;
            staffRole?: string | null;
          };
          if (!cancelled) {
            setIsNewPortalUser(data.isNew === true);
            const role = String(data.staffRole ?? '').trim().toLowerCase();
            setIsCongregantePortalUser(role === 'congregante');
            setIsLeadershipPortalUser(isLeadershipStaffRole(data.staffRole));
          }
        } catch {
          if (!cancelled) {
            setIsNewPortalUser(false);
            setIsCongregantePortalUser(false);
            setIsLeadershipPortalUser(false);
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
        setGroupsLoad('loading');
        try {
          const res = await fetch('/api/ministries/catalog', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const data = (await res.json().catch(() => ({}))) as {
            ministries?: MinistryCatalogRow[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || 'No se pudieron cargar los grupos y ministerios.');
          }
          if (!cancelled) {
            setMinistriesFromDb(data.ministries ?? []);
            setGroupsLoad('ready');
          }
        } catch {
          if (!cancelled) {
            setMinistriesFromDb([]);
            setGroupsLoad('error');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            groups: [],
            churchIds: [],
            staffRoleKind: STAFF_ROLE_NONE,
        }
    });

    React.useEffect(() => {
      if (isAddMode) return;
      if (!clerkLoaded || !user) return;
      let cancelled = false;

      const firstName = String(user.firstName ?? '').trim();
      const lastName = String(user.lastName ?? '').trim();
      const email = String(user.primaryEmailAddress?.emailAddress ?? '').trim().toLowerCase();

      form.setValue('firstName', firstName, { shouldValidate: true });
      form.setValue('lastName', lastName, { shouldValidate: true });
      form.setValue('email', email, { shouldValidate: true });

      void (async () => {
        try {
          const res = await fetch('/api/members/me', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const data = (await res.json().catch(() => ({}))) as {
            member?: {
              firstName?: string;
              lastName?: string;
              email?: string;
              phone?: string;
              address?: string;
              dob?: string;
              spiritualBirthday?: string | null;
              groups?: string[];
              churchIds?: string[];
              staffRole?: string | null;
            } | null;
          };
          if (!res.ok || cancelled) return;
          if (!data.member) {
            setIsUnregisteredPortalUser(true);
            return;
          }
          setIsUnregisteredPortalUser(false);
          const m = data.member;
          const dob = m.dob ? new Date(m.dob) : undefined;
          const dobOk = dob && !Number.isNaN(dob.getTime()) ? dob : undefined;
          const spiritual = m.spiritualBirthday ? new Date(m.spiritualBirthday) : undefined;
          const spiritualOk =
            spiritual && !Number.isNaN(spiritual.getTime()) ? spiritual : undefined;

          form.reset({
            firstName: String(m.firstName ?? firstName),
            lastName: String(m.lastName ?? lastName),
            email: String(m.email ?? email).toLowerCase(),
            phone: String(m.phone ?? ''),
            address: String(m.address ?? ''),
            dob: dobOk,
            spiritualBirthday: spiritualOk,
            groups: Array.isArray(m.groups) ? m.groups : [],
            churchIds: Array.isArray(m.churchIds) ? m.churchIds : [],
            staffRoleKind: staffRoleKindFromApi(m.staffRole),
          });
        } catch {
          // Si falla, dejamos los datos de Clerk como base.
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [clerkLoaded, user, form, isAddMode]);

    const handleGroupToggle = (group: string) => {
        const currentGroups = form.getValues('groups') || [];
        const newGroups = currentGroups.includes(group)
            ? currentGroups.filter(g => g !== group)
            : [...currentGroups, group];
        form.setValue('groups', newGroups as FormValues['groups'], {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    const onSubmit = async (values: FormValues) => {
        try {
            const payload = {
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              phone: values.phone,
              address: values.address,
              dob: values.dob.toISOString(),
              spiritualBirthday: values.spiritualBirthday?.toISOString() ?? null,
              groups: values.groups,
              churchIds: values.churchIds,
              membershipStatus: DEFAULT_MEMBERSHIP_STATUS,
              staffRole: staffRoleToApi(values.staffRoleKind),
            };
            const normalizedEmail = values.email.trim().toLowerCase();
            const checkRes = await fetch(
              `/api/members?exactEmail=${encodeURIComponent(normalizedEmail)}`,
              {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
              }
            );
            const checkData = (await checkRes.json().catch(() => ({}))) as {
              exists?: boolean;
            };
            const exists = checkData.exists === true;

            const initialMethod = exists ? 'PUT' : 'POST';
            let res = await fetch('/api/members', {
                method: initialMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            let data = (await res.json().catch(() => ({}))) as {
                error?: string;
                message?: string;
            };
            const duplicateEmail =
              res.status === 409 ||
              String(data.error ?? '').toLowerCase().includes('duplicate key') ||
              String(data.error ?? '').toLowerCase().includes('ya existe un miembro');
            if (!res.ok && initialMethod === 'POST' && duplicateEmail) {
              res = await fetch('/api/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              data = (await res.json().catch(() => ({}))) as {
                error?: string;
                message?: string;
              };
            }
            if (!res.ok) {
                throw new Error(data.error || 'No se pudo guardar el miembro.');
            }
            toast({
                title: data.message?.toLowerCase().includes('actualizado')
                  ? 'Miembro actualizado'
                  : 'Miembro guardado',
                description:
                  data.message ||
                  `${values.firstName} ${values.lastName} se guardó correctamente.`,
            });
            if (isUnregisteredPortalUser) {
              router.replace('/churches');
              return;
            }
            form.reset({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: '',
                groups: [],
                churchIds: [],
                staffRoleKind: STAFF_ROLE_NONE,
            });
            form.resetField('dob');
            form.resetField('spiritualBirthday');
        } catch (err) {
            console.error(err);
            toast({
                variant: 'destructive',
                title: 'No se pudo guardar',
                description:
                    err instanceof Error ? err.message : 'Error al guardar en la base de datos.',
            });
        }
    };

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title={
          isAddMode
            ? 'Añadir Miembros'
            : isNewPortalUser || isUnregisteredPortalUser
              ? 'Registra tus Datos'
              : 'Actualizar Datos'
        }
        description="Ingrese los detalles a continuación para crear un nuevo perfil de miembro."
      >
        <div className="flex items-center gap-2">
          {!isNewPortalUser && !isUnregisteredPortalUser && !isLeadershipPortalUser ? (
            <Button variant="ghost" asChild>
              <Link href="/members">Cancelar</Link>
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {form.formState.isSubmitting
              ? 'Guardando…'
              : isAddMode
                ? 'Agregar'
              : isUnregisteredPortalUser
                ? 'Guardar'
                : isNewPortalUser || isCongregantePortalUser
                  ? 'Actualizar'
                : 'Actualizar'}
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 p-8 space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>Detalles básicos sobre el nuevo miembro.</CardDescription>
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
                                        <Input placeholder="John" {...field} />
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
                                        <Input placeholder="Doe" {...field} />
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
                                        <Input
                                          type="email"
                                          placeholder="john.doe@example.com"
                                          disabled={!isAddMode}
                                          {...field}
                                        />
                                    </FormControl>
                                    {!isAddMode ? (
                                      <p className="text-xs text-muted-foreground">
                                        Este correo se toma automáticamente desde Clerk.
                                      </p>
                                    ) : null}
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
                                    <Input placeholder="123 Main St, Anytown, USA" {...field} />
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
                                                variant={"outline"}
                                                className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP") : <span>mm/dd/yyyy</span>}
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={new Date().getFullYear()} />
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
                                                variant={"outline"}
                                                className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP") : <span>mm/dd/yyyy</span>}
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={1900} toYear={new Date().getFullYear()} />
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
                  Indique el cargo del miembro según el listado; con ello podrá listarse en el directorio de personal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organization-iciar">Organización</Label>
                    <Input id="organization-iciar" value="ICIAR" disabled readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="presbytery">Presbiterio</Label>
                    <Select value="pacifico-norte" disabled>
                      <SelectTrigger id="presbytery">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pacifico-norte">Pacífico Norte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                    Seleccione los ministerios en los que participa.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="groups"
                    render={({ field }) => (
                        <FormItem>
                            <div className="mt-2 max-h-60 space-y-3 overflow-y-auto rounded-md border p-4">
                                {groupsLoad === 'loading' ? (
                                  <p className="text-sm text-muted-foreground">
                                    Cargando grupos y ministerios desde la base de datos...
                                  </p>
                                ) : null}
                                {groupsLoad === 'error' ? (
                                  <p className="text-sm text-destructive">
                                    No se pudieron cargar grupos y ministerios. Intente de nuevo más tarde.
                                  </p>
                                ) : null}
                                {groupsLoad === 'ready' && ministriesFromDb.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No hay ministerios registrados en `ministries`.
                                  </p>
                                ) : null}
                                {groupsLoad === 'ready'
                                  ? ministriesFromDb.map((m) => {
                                      const label = m.name.trim();
                                      if (!label) return null;
                                      return (
                                        <div key={m.id} className="flex items-center gap-3">
                                          <Checkbox
                                            id={`member-ministry-${m.id}`}
                                            checked={field.value?.includes(label)}
                                            onCheckedChange={() => handleGroupToggle(label)}
                                          />
                                          <Label
                                            htmlFor={`member-ministry-${m.id}`}
                                            className="cursor-pointer font-normal"
                                          >
                                            {toTitleCase(label)}
                                          </Label>
                                        </div>
                                      );
                                    })
                                  : null}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Puede seleccionar varios grupos y ministerios (opcional).
                            </p>
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
                        ? current.filter((id) => id !== churchId)
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
      </main>
    </div>
  );
}
