'use client';

import * as React from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/app-header';
import type { MinistryDocument } from '@/lib/ministries';
import { ministryCategoryLabel } from '@/lib/ministries';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusColors: Record<string, string> = {
  Activo: 'bg-green-100 text-green-800 border-green-200',
  Inactivo: 'bg-red-100 text-red-800 border-red-200',
  Visitante: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const roleColors: Record<string, string> = {
  Líder: 'bg-blue-100 text-blue-800 border-blue-200',
  Miembro: 'bg-gray-100 text-gray-800 border-gray-200',
};

function membershipStatusLabel(code: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    visitor: 'Visitante',
    inactive: 'Inactivo',
  };
  return map[code] ?? 'Activo';
}

type MemberBrief = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipStatus: string;
};

type RosterRow = {
  key: string;
  memberId: string;
  mode: 'leader' | 'assignment';
  churchId?: string;
  name: string;
  email: string;
  phone: string;
  role: 'Líder' | 'Miembro';
  status: string;
};

export default function MinistryDetailsPage() {
  const params = useParams();
  const { toast } = useToast();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [ministry, setMinistry] = React.useState<MinistryDocument | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = React.useState<string | null>(null);
  const [memberDetails, setMemberDetails] = React.useState<Record<string, MemberBrief>>({});
  const [detailsLoadState, setDetailsLoadState] = React.useState<'idle' | 'loading' | 'ready'>(
    'idle'
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [pendingRemove, setPendingRemove] = React.useState<RosterRow | null>(null);
  const [removing, setRemoving] = React.useState(false);

  const fetchMinistry = React.useCallback(async () => {
    const res = await fetch(`/api/ministries/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = (await res.json().catch(() => ({}))) as {
      ministry?: MinistryDocument;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo cargar el ministerio.');
    }
    if (!data.ministry) {
      throw new Error('No se recibieron datos.');
    }
    return data.ministry;
  }, [id]);

  React.useEffect(() => {
    if (!id?.trim()) {
      setLoadState('error');
      setMessage('Identificador no válido.');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setMessage(null);
      try {
        const m = await fetchMinistry();
        if (cancelled) return;
        setMinistry(m);
        setLoadState('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadState('error');
          setMessage(e instanceof Error ? e.message : 'Error al cargar.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchMinistry]);

  React.useEffect(() => {
    if (!ministry) {
      setMemberDetails({});
      setDetailsLoadState('idle');
      return;
    }
    const ids = new Set<string>();
    for (const l of ministry.leaders ?? []) {
      const mid = String(l.id ?? '').trim();
      if (mid) ids.add(mid);
    }
    for (const a of ministry.memberAssignments ?? []) {
      const mid = String(a.memberId ?? '').trim();
      if (mid) ids.add(mid);
    }
    if (ids.size === 0) {
      setMemberDetails({});
      setDetailsLoadState('ready');
      return;
    }

    let cancelled = false;
    setDetailsLoadState('loading');
    void (async () => {
      const entries = await Promise.all(
        [...ids].map(async (mid) => {
          try {
            const res = await fetch(`/api/members/${encodeURIComponent(mid)}`, {
              cache: 'no-store',
              headers: { Accept: 'application/json' },
            });
            const data = (await res.json().catch(() => ({}))) as {
              member?: MemberBrief;
            };
            if (!res.ok || !data.member) return [mid, null] as const;
            return [mid, data.member] as const;
          } catch {
            return [mid, null] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, MemberBrief> = {};
      for (const [mid, m] of entries) {
        if (m) map[mid] = m;
      }
      setMemberDetails(map);
      setDetailsLoadState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [ministry]);

  const rosterRows = React.useMemo((): RosterRow[] => {
    if (!ministry) return [];
    const leaderIdSet = new Set(
      (ministry.leaders ?? []).map((l) => String(l.id ?? '').trim()).filter(Boolean)
    );
    const rows: RosterRow[] = [];

    for (const l of ministry.leaders ?? []) {
      const memberId = String(l.id ?? '').trim();
      if (!memberId) continue;
      const d = memberDetails[memberId];
      const nameFromMember = d
        ? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || 'Sin nombre'
        : '';
      rows.push({
        key: `leader-${memberId}`,
        memberId,
        mode: 'leader',
        name: nameFromMember || l.name,
        email: d?.email ?? l.email,
        phone: d?.phone?.trim() ? d.phone : '—',
        role: 'Líder',
        status: d ? membershipStatusLabel(d.membershipStatus) : 'Activo',
      });
    }

    for (const a of ministry.memberAssignments ?? []) {
      const memberId = String(a.memberId ?? '').trim();
      const churchId = String(a.churchId ?? '').trim();
      if (!memberId || !churchId) continue;
      if (leaderIdSet.has(memberId)) continue;
      const d = memberDetails[memberId];
      rows.push({
        key: `assign-${memberId}-${churchId}`,
        memberId,
        mode: 'assignment',
        churchId,
        name: d ? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || 'Sin nombre' : 'Sin nombre',
        email: d?.email ?? '—',
        phone: d?.phone?.trim() ? d.phone : '—',
        role: 'Miembro',
        status: d ? membershipStatusLabel(d.membershipStatus) : 'Activo',
      });
    }

    return rows;
  }, [ministry, memberDetails]);

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rosterRows;
    return rosterRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
    );
  }, [rosterRows, searchQuery]);

  const confirmRemove = async () => {
    if (!pendingRemove || !id?.trim()) return;
    setRemoving(true);
    try {
      const body =
        pendingRemove.mode === 'leader'
          ? { mode: 'leader' as const, memberId: pendingRemove.memberId }
          : {
              mode: 'assignment' as const,
              memberId: pendingRemove.memberId,
              churchId: pendingRemove.churchId!,
            };
      const res = await fetch(`/api/ministries/${encodeURIComponent(id)}/roster`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar.');
      }
      toast({
        title: pendingRemove.mode === 'leader' ? 'Líder retirado' : 'Miembro retirado',
        description: data.message ?? 'Cambios guardados.',
      });
      setPendingRemove(null);
      const next = await fetchMinistry();
      setMinistry(next);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo completar la acción.',
      });
    } finally {
      setRemoving(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Ministerio" description="Cargando…" />
        <main className="flex-1 p-8">
          <p className="text-sm text-muted-foreground">Cargando ministerio…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error' || !ministry) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Ministerio no encontrado" description={message ?? 'No existe este ministerio.'} />
        <main className="flex-1 p-8">
          <Button variant="outline" asChild>
            <Link href="/ministries">Volver a ministerios</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={ministry.name}
        description={`${ministryCategoryLabel(ministry.category)} · ${ministry.description}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/ministries/${ministry.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Ministerio
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ministries/assign-members?ministryId=${encodeURIComponent(ministry.id)}`}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Miembros
            </Link>
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Líderes y equipo ({rosterRows.length})</CardTitle>
            <CardDescription>
              Personas registradas en {ministry.name}. Total contabilizado: {ministry.memberCount}{' '}
              miembros.
              {detailsLoadState === 'loading' ? ' Cargando datos de contacto…' : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NOMBRE</TableHead>
                    <TableHead className="hidden sm:table-cell">CONTACTO</TableHead>
                    <TableHead>ROL</TableHead>
                    <TableHead className="hidden md:table-cell">ESTADO DEL MIEMBRO</TableHead>
                    <TableHead className="text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {rosterRows.length === 0
                          ? 'No hay personas en este registro.'
                          : 'Ningún resultado para la búsqueda.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((member) => (
                      <TableRow key={member.key}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={`https://picsum.photos/seed/${encodeURIComponent(member.memberId)}/40/40`}
                                alt={member.name}
                              />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{member.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                              <p className="truncate text-xs text-muted-foreground sm:hidden">
                                {member.phone}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{member.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={roleColors[member.role] ?? roleColors.Miembro}
                          >
                            {member.role}
                          </Badge>
                          <div className="mt-1 md:hidden">
                            <Badge
                              variant="outline"
                              className={statusColors[member.status] ?? statusColors.Activo}
                            >
                              {member.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={statusColors[member.status] ?? statusColors.Activo}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" type="button" asChild>
                            <Link href={`/members/${encodeURIComponent(member.memberId)}/edit`}>
                              <span className="sr-only">Editar miembro</span>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setPendingRemove(member)}
                            aria-label={
                              member.mode === 'leader'
                                ? 'Quitar como líder'
                                : 'Quitar del ministerio'
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemove?.mode === 'leader' ? '¿Quitar a este líder?' : '¿Quitar a este miembro?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove
                ? pendingRemove.mode === 'leader'
                  ? `${pendingRemove.name} dejará de figurar como líder de «${ministry.name}». Debe quedar al menos un líder; si es el único, use «Editar ministerio» para asignar otro antes.`
                  : `${pendingRemove.name} dejará de estar asignado a «${ministry.name}» desde este templo.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              {removing ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
