
'use client';

import * as React from 'react';
import { Search, Plus } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppHeader } from '@/components/app-header';
import { useToast } from '@/hooks/use-toast';
import type { MinistryDocument } from '@/lib/ministries';

const statusColors: { [key: string]: string } = {
    Activo: 'bg-green-100 text-green-800 border-green-200',
    Visitante: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Inactivo: 'bg-red-100 text-red-800 border-red-200',
};

type ApiMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipStatus: string;
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
};

function membershipStatusLabel(code: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    visitor: 'Visitante',
    inactive: 'Inactivo',
  };
  return map[code] ?? 'Activo';
}

type ChurchOption = { id: string; name: string };

export default function AssignMembersToMinistryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [assigning, setAssigning] = React.useState(false);
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
  const [selectedChurchId, setSelectedChurchId] = React.useState('');
  const [selectedMinistryId, setSelectedMinistryId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [churches, setChurches] = React.useState<ChurchOption[]>([]);
  const [churchesLoadState, setChurchesLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [ministries, setMinistries] = React.useState<MinistryDocument[]>([]);
  const [ministriesLoadState, setMinistriesLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [memberRows, setMemberRows] = React.useState<MemberRow[]>([]);
  const [membersLoadState, setMembersLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  React.useEffect(() => {
    setSelectedMembers([]);
  }, [selectedChurchId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setChurchesLoadState('loading');
      try {
        const roleRes = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const roleData = (await roleRes.json().catch(() => ({}))) as { isAdmin?: boolean };
        const churchesUrl =
          roleData.isAdmin === true
            ? '/api/churches'
            : '/api/churches?sessionChurchScope=1';

        const res = await fetch(churchesUrl, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          churches?: { id: string; name: string }[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar los templos.');
        }
        if (cancelled) return;
        const rows = (data.churches ?? []).map((c) => ({
          id: String(c.id ?? '').trim(),
          name: String(c.name ?? '').trim() || 'Sin nombre',
        }));
        setChurches(rows.filter((c) => c.id));
        setChurchesLoadState('ready');
      } catch {
        if (cancelled) return;
        setChurches([]);
        setChurchesLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setMinistriesLoadState('loading');
      try {
        const res = await fetch('/api/ministries', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          ministries?: MinistryDocument[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'No se pudieron cargar los ministerios.');
        }
        if (cancelled) return;
        setMinistries(data.ministries ?? []);
        setMinistriesLoadState('ready');
      } catch {
        if (cancelled) return;
        setMinistries([]);
        setMinistriesLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddMembers = async () => {
    const churchId = selectedChurchId.trim();
    const ministryId = selectedMinistryId.trim();
    const memberIds = [...new Set(selectedMembers.map((x) => x.trim()).filter(Boolean))];
    if (!churchId || !ministryId || memberIds.length === 0) return;

    setAssigning(true);
    try {
      const res = await fetch(`/api/ministries/${encodeURIComponent(ministryId)}/assign-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ churchId, memberIds }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la asignación.');
      }
      toast({
        title: 'Asignación guardada',
        description: data.message ?? 'Los miembros quedaron registrados en el ministerio.',
      });
      router.push('/ministries');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al asignar.';
      toast({ variant: 'destructive', title: 'No se pudo asignar', description: msg });
    } finally {
      setAssigning(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers((prev) => {
        const set = new Set(prev);
        for (const m of filteredMembers) set.add(m.id);
        return [...set];
      });
    } else {
      const remove = new Set(filteredMembers.map((m) => m.id));
      setSelectedMembers((prev) => prev.filter((id) => !remove.has(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setSelectedMembers((prev) => prev.filter((i) => i !== id));
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      void (async () => {
        if (!selectedChurchId.trim()) {
          if (!cancelled) {
            setMemberRows([]);
            setMembersLoadState('ready');
          }
          return;
        }
        setMembersLoadState('loading');
        try {
          const q = searchTerm.trim();
          const params = new URLSearchParams();
          params.set('limit', '50');
          params.set('churchId', selectedChurchId.trim());
          params.set('excludePastorsInMinistry', '1');
          if (q) params.set('q', q);
          const url = `/api/members?${params.toString()}`;
          const res = await fetch(url, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          const data = (await res.json().catch(() => ({}))) as {
            members?: ApiMember[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || 'No se pudieron cargar miembros.');
          }
          if (cancelled) return;
          const rows = (data.members ?? []).map((m) => ({
            id: String(m.id),
            name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Sin nombre',
            email: m.email ?? '',
            phone: m.phone ?? '',
            status: membershipStatusLabel(m.membershipStatus),
          }));
          setMemberRows(rows);
          setMembersLoadState('ready');
        } catch {
          if (cancelled) return;
          setMemberRows([]);
          setMembersLoadState('error');
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchTerm, selectedChurchId]);

  const filteredMembers = React.useMemo(() => memberRows, [memberRows]);

  const headerCheckboxState = React.useMemo(() => {
    const ids = filteredMembers.map((m) => m.id);
    if (ids.length === 0) return false as boolean | 'indeterminate';
    const n = ids.filter((id) => selectedMembers.includes(id)).length;
    if (n === 0) return false;
    if (n === ids.length) return true;
    return 'indeterminate';
  }, [filteredMembers, selectedMembers]);

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Asignar Miembros a un Ministerio"
        description={
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild><Link href="/ministries">Ministerios</Link></BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Asignar Miembros</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        }
      >
        <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button variant="ghost" asChild><Link href="/ministries">Cancelar</Link></Button>
            <Button
              onClick={() => void handleAddMembers()}
              disabled={
                assigning ||
                selectedMembers.length === 0 ||
                !selectedChurchId.trim() ||
                !selectedMinistryId.trim()
              }
            >
                <Plus className="mr-2 h-4 w-4" />
                {assigning
                  ? 'Guardando…'
                  : `Asignar ${selectedMembers.length > 0 ? selectedMembers.length : ''} ${selectedMembers.length === 1 ? 'Miembro' : 'Miembros'}`}
            </Button>
        </div>
      </AppHeader>
    <main className="flex-1 bg-muted/20 p-4 sm:p-8">
      <div className="space-y-4 max-w-5xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Seleccionar Miembros y Ministerio</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="mb-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Templo
                        </label>
                        <Select
                          value={selectedChurchId || undefined}
                          onValueChange={(v) => setSelectedChurchId(v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un templo…" />
                            </SelectTrigger>
                            <SelectContent>
                                {churchesLoadState === 'loading' ? (
                                  <SelectItem value="__ch-loading__" disabled>
                                    Cargando templos…
                                  </SelectItem>
                                ) : null}
                                {churchesLoadState === 'error' ? (
                                  <SelectItem value="__ch-error__" disabled>
                                    No se pudieron cargar los templos
                                  </SelectItem>
                                ) : null}
                                {churchesLoadState === 'ready' && churches.length === 0 ? (
                                  <SelectItem value="__ch-empty__" disabled>
                                    No hay templos disponibles
                                  </SelectItem>
                                ) : null}
                                {churchesLoadState === 'ready'
                                  ? churches.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                      </SelectItem>
                                    ))
                                  : null}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row">
                    <div className='flex-1'>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Ministerio
                        </label>
                        <Select value={selectedMinistryId} onValueChange={setSelectedMinistryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un ministerio..." />
                            </SelectTrigger>
                            <SelectContent>
                                {ministriesLoadState === 'loading' ? (
                                  <SelectItem value="__loading__" disabled>
                                    Cargando ministerios...
                                  </SelectItem>
                                ) : null}
                                {ministriesLoadState === 'error' ? (
                                  <SelectItem value="__error__" disabled>
                                    No se pudieron cargar los ministerios
                                  </SelectItem>
                                ) : null}
                                {ministriesLoadState === 'ready' && ministries.length === 0 ? (
                                  <SelectItem value="__empty__" disabled>
                                    No hay ministerios registrados
                                  </SelectItem>
                                ) : null}
                                {ministriesLoadState === 'ready'
                                  ? ministries.map((ministry) => (
                                      <SelectItem key={ministry.id} value={ministry.id}>
                                        {ministry.name}
                                      </SelectItem>
                                    ))
                                  : null}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Buscar
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Nombre, email o teléfono…"
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={!selectedChurchId.trim()}
                          />
                        </div>
                    </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={headerCheckboxState}
                                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                                    disabled={filteredMembers.length === 0}
                                    aria-label="Seleccionar todos los miembros visibles"
                                  />
                                </TableHead>
                                <TableHead>NOMBRE</TableHead>
                                <TableHead>CONTACTO</TableHead>
                                <TableHead>ESTADO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedChurchId.trim() ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                  Seleccione un templo para ver a los miembros asignados a esa ubicación.
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {selectedChurchId.trim() && membersLoadState === 'loading' ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                  Buscando miembros en la base de datos...
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {selectedChurchId.trim() && membersLoadState === 'error' ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-8 text-center text-sm text-destructive">
                                  No se pudo consultar la colección members.
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {selectedChurchId.trim() && membersLoadState === 'ready'
                              ? filteredMembers.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedMembers.includes(member.id)}
                                            onCheckedChange={(checked) => handleSelectOne(member.id, !!checked)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://picsum.photos/seed/${encodeURIComponent(member.id)}/40/40`} alt={member.name} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.phone}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusColors[member.status as keyof typeof statusColors]}>
                                            {member.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                              : null}
                            {selectedChurchId.trim() &&
                            membersLoadState === 'ready' &&
                            filteredMembers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                                  No hay miembros en este templo que coincidan con la búsqueda.
                                </TableCell>
                              </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>

    </main>
    </div>
  );
}
