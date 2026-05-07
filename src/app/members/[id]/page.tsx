
'use client';

import * as React from 'react';
import {
  Mail,
  Phone,
  Home,
  UserPlus,
  Edit,
  Briefcase,
  Building2,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppHeader } from '@/components/app-header';

type ApiMember = {
  id: string;
  createdAt: string;
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
  department: string | null;
  staffRole: string | null;
};

function memberIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return (raw[0] && String(raw[0])) || '';
  if (typeof raw === 'string') return raw;
  return '';
}

function membershipStatusLabel(code: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    visitor: 'Visitante',
    inactive: 'Inactivo',
  };
  return map[code] ?? code;
}

function statusBadgeClass(code: string): string {
  if (code === 'active') {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (code === 'visitor') {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  if (code === 'inactive') {
    return 'bg-muted text-muted-foreground border-border';
  }
  return 'bg-muted text-muted-foreground border-border';
}

function statusDotClass(code: string): string {
  if (code === 'active') return 'bg-green-500';
  if (code === 'visitor') return 'bg-amber-500';
  return 'bg-muted-foreground';
}

const groupColors: Record<string, string> = {
  Voluntarios: 'bg-blue-100 text-blue-800 border-blue-200',
  Coro: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Grupo de Jóvenes': 'bg-purple-100 text-purple-800 border-purple-200',
  'Estudio Bíblico de Hombres': 'bg-purple-100 text-purple-800 border-purple-200',
  'Clase de Nuevos Miembros': 'bg-green-100 text-green-800 border-green-200',
};

function formatDateIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'PPP', { locale: es });
}

export default function MemberProfilePage() {
  const params = useParams();
  const id = memberIdFromParams(params);

  const [member, setMember] = React.useState<ApiMember | null>(null);
  const [viewerMemberId, setViewerMemberId] = React.useState<string | null>(null);
  const [churchNamesById, setChurchNamesById] = React.useState<Record<string, string>>(
    {}
  );
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);

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
      setViewerMemberId(null);
      try {
        const [mRes, cRes, meRes] = await Promise.all([
          fetch(`/api/members/${encodeURIComponent(id)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/churches', { cache: 'no-store' }),
          fetch('/api/members/me-role', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
        ]);
        const data = (await mRes.json().catch(() => ({}))) as {
          member?: ApiMember;
          error?: string;
        };
        const meData = (await meRes.json().catch(() => ({}))) as {
          memberId?: string | null;
        };
        const myId =
          typeof meData.memberId === 'string' && meData.memberId.trim()
            ? meData.memberId.trim()
            : null;
        if (!mRes.ok) {
          throw new Error(data.error || 'No se pudo cargar el miembro.');
        }
        if (cancelled) return;
        if (!data.member) {
          setLoadState('error');
          setLoadMessage('No se recibieron datos del miembro.');
          return;
        }
        const cJson = (await cRes.json().catch(() => ({}))) as {
          churches?: { id: string; name: string }[];
        };
        const map: Record<string, string> = {};
        for (const c of cJson.churches ?? []) {
          map[c.id] = c.name;
        }
        setMember(data.member);
        setViewerMemberId(myId);
        setChurchNamesById(map);
        setLoadState('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadState('error');
          setViewerMemberId(null);
          setLoadMessage(e instanceof Error ? e.message : 'Error al cargar.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayName = member
    ? `${member.firstName} ${member.lastName}`.trim() || 'Sin nombre'
    : '';
  const initials = member
    ? `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Perfil de miembro" description="Cargando…" />
        <main className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Cargando perfil…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error' || !member) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Perfil de miembro" description="No se pudo mostrar el perfil." />
        <main className="flex-1 space-y-4 p-6">
          <p className="text-sm text-destructive">{loadMessage ?? 'Miembro no encontrado.'}</p>
          <Button variant="outline" asChild>
            <Link href="/members">Volver al directorio</Link>
          </Button>
        </main>
      </div>
    );
  }

  const statusLabel = membershipStatusLabel(member.membershipStatus);
  const badgeClass = statusBadgeClass(member.membershipStatus);
  const dotClass = statusDotClass(member.membershipStatus);
  const isOwnProfile = Boolean(viewerMemberId && viewerMemberId === id);

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title={displayName}
        description={
          <Badge variant="outline" className={`font-medium ${badgeClass}`}>
            <span className={`mr-2 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
            {statusLabel}
            </Badge>
        }
      >
        {isOwnProfile ? (
          <Button variant="outline" className="w-full justify-center sm:w-auto" asChild>
            <Link href={`/members/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4 shrink-0" /> Editar perfil
            </Link>
          </Button>
        ) : null}
      </AppHeader>
      <main className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24">
            <AvatarImage src={member.photoDataUrl ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">{member.email}</p>
            {member.department || member.staffRole ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {member.department ? (
                  <Badge variant="secondary" className="font-normal">
                    <Building2 className="mr-1 h-3 w-3" />
                    {member.department}
                  </Badge>
                ) : null}
                {member.staffRole ? (
                  <Badge variant="outline" className="font-normal">
                    <Briefcase className="mr-1 h-3 w-3" />
                    {member.staffRole}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-4 sm:space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
                <CardTitle>Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${member.email}`} className="break-all text-primary hover:underline">
                    {member.email}
                  </a>
                </div>
                 <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${member.phone.replace(/\D/g, '')}`} className="hover:underline">
                    {member.phone}
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words">{member.address}</span>
                </div>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-muted-foreground">Fecha de nacimiento</span>
                  <span className="font-medium sm:text-right">{formatDateIso(member.dob)}</span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-muted-foreground">Fecha de Bautismo</span>
                  <span className="font-medium sm:text-right">
                    {formatDateIso(member.spiritualBirthday)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="shrink-0 text-muted-foreground">Alta en el directorio</span>
                  <span className="font-medium sm:text-right">{formatDateIso(member.createdAt)}</span>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Familia</CardTitle>
            </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aún no hay vínculos familiares registrados en el sistema.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grupos y ministerios</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {member.groups.length > 0 ? (
                  member.groups.map((group) => (
                    <Badge
                      key={group}
                      variant="outline"
                      className={groupColors[group] ?? 'border-border bg-muted/50 text-foreground'}
                    >
                      {group}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin grupos asignados.</p>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Templos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {member.churchIds.length > 0 ? (
                  member.churchIds.map((cid) => (
                    <Badge key={cid} variant="outline" className="font-normal">
                      <MapPin className="mr-1 h-3 w-3 shrink-0" />
                      {cid === 'otro' ? 'Otro' : churchNamesById[cid] ?? cid}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin templos asignados.</p>
                )}
            </CardContent>
          </Card>
        </div>

          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                <Card>
                <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-lg sm:text-xl">Resumen de asistencia</CardTitle>
                  <Button variant="link" className="h-auto justify-start p-0 sm:shrink-0" asChild>
                    <Link href={`/members/${id}/attendance`}>Ver historial completo</Link>
                        </Button>
                    </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No hay datos de asistencia vinculados a este perfil. Use el historial cuando esté
                    disponible.
                  </p>
                    </CardContent>
                </Card>

                 <Card>
                <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-lg sm:text-xl">Resumen de donaciones</CardTitle>
                  <Button variant="link" className="h-auto justify-start p-0 sm:shrink-0" asChild>
                    <Link href={`/members/${id}/donations`}>Ver historial completo</Link>
                        </Button>
                    </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No hay datos de donaciones vinculados a este perfil. Use el historial cuando esté
                    disponible.
                  </p>
                    </CardContent>
                </Card>
            </div>

          <Card>
              <CardContent className="p-3 sm:p-4">
                <Tabs defaultValue="activity">
                  <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:inline-flex sm:w-auto">
                    <TabsTrigger value="activity" className="text-xs sm:text-sm">
                      Actividad
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs sm:text-sm">
                      Notas
                    </TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity" className="mt-4">
                        <ul className="space-y-6">
                      <li className="flex items-start gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted max-sm:h-8 max-sm:w-8">
                          <UserPlus className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                                    </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1 sm:flex-row sm:items-start sm:justify-between sm:pt-2">
                          <p className="text-sm">Miembro registrado en el directorio</p>
                          <p className="shrink-0 text-xs text-muted-foreground sm:text-right">
                            {formatDateIso(member.createdAt)}
                          </p>
                                    </div>
                                </li>
                        </ul>
                    </TabsContent>
                     <TabsContent value="notes" className="mt-4">
                    <p className="text-sm text-muted-foreground">No hay notas registradas.</p>
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
    </div>
  );
}
