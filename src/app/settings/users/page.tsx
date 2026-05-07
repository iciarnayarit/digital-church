'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Mail,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { AppHeader } from '@/components/app-header';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  isAdministradorGeneralEquivalentStaffRole,
  isDirectivaEquivalentLeadershipStaffRole,
} from '@/lib/pastor-church-access';

const roleColors: Record<string, string> = {
  Admin: 'bg-rose-100 text-rose-900 border-rose-200',
  Pastor: 'bg-blue-100 text-blue-800 border-blue-200',
  Presidente: 'bg-amber-100 text-amber-900 border-amber-200',
  Directiva: 'bg-violet-100 text-violet-900 border-violet-200',
};

function normalizeStaffRoleKey(role: string | null | undefined): keyof typeof roleColors | null {
  const t = String(role ?? '').trim().toLowerCase();
  if (!t) return null;
  if (t === 'pastor' || t.startsWith('pastor ') || t === 'ayuda pastoral') {
    return 'Pastor';
  }
  const map: Record<string, keyof typeof roleColors> = {
    admin: 'Admin',
    presidente: 'Presidente',
    directiva: 'Directiva',
  };
  return map[t] ?? null;
}

function badgeClassForRole(role: string | null | undefined): string {
  const t = String(role ?? '').trim().toLowerCase();
  if (t === 'super administrador' || isAdministradorGeneralEquivalentStaffRole(role)) {
    return roleColors.Admin;
  }
  if (isDirectivaEquivalentLeadershipStaffRole(role)) {
    return roleColors.Directiva;
  }
  const key = normalizeStaffRoleKey(role);
  if (key) return roleColors[key];
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function displayRoleLabel(role: string | null | undefined): string {
  const key = normalizeStaffRoleKey(role);
  if (key) return key;
  const raw = String(role ?? '').trim();
  return raw || '—';
}

type MemberApiRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  staffRole: string | null;
  photoDataUrl: string | null;
  portalRoleId?: string | null;
};

export default function UsersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [members, setMembers] = React.useState<MemberApiRow[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [invitingMemberId, setInvitingMemberId] = React.useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = React.useState<MemberApiRow | null>(null);
  const itemsPerPage = 10;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState('loading');
      try {
        const res = await fetch('/api/settings/portal-users', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json().catch(() => ({}))) as {
          members?: MemberApiRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || 'No se pudieron cargar los usuarios.');
        }
        if (!cancelled) {
          setMembers(json.members ?? []);
          setLoadState('ready');
        }
      } catch (e) {
        if (!cancelled) {
          setMembers([]);
          setLoadState('error');
          toast({
            variant: 'destructive',
            title: 'Error al cargar',
            description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filteredMembers = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = `${m.firstName} ${m.lastName}`.trim().toLowerCase();
      return name.includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [members, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, members.length]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleInvite = async (memberId: string) => {
    setInvitingMemberId(memberId);
    try {
      const res = await fetch('/api/settings/portal-users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar la invitación.');
      }
      toast({
        title: 'Enviado exitoso',
        description: data.message || 'La invitación fue enviada correctamente.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar invitación',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
      });
    } finally {
      setInvitingMemberId(null);
    }
  };

  const paginatedData = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Gestión de Usuarios"
        description="Miembros con rol del portal asignado."
      >
        <div className="flex gap-2">
          <Button type="button" asChild>
            <Link href="/settings/new">
              <Plus className="mr-2 h-4 w-4" /> Añadir Nuevo Usuario
            </Link>
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loadState !== 'ready'}
                />
              </div>
              {loadState === 'loading' ? (
                <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
              ) : null}
              {loadState === 'error' ? (
                <p className="text-sm text-destructive">No se pudo cargar la lista.</p>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadState === 'ready' && paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No hay miembros con rol de portal asignado o no coinciden con la búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {paginatedData.map((user) => {
                    const name = `${user.firstName} ${user.lastName}`.trim();
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.photoDataUrl ?? undefined} alt={name} />
                              <AvatarFallback>{name.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{name || '—'}</div>
                              <div className="truncate text-xs text-muted-foreground sm:hidden">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium ${badgeClassForRole(user.staffRole)}`}
                          >
                            {displayRoleLabel(user.staffRole)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => setInviteTarget(user)}
                              disabled={invitingMemberId === user.id}
                              aria-label="Enviar invitación por correo"
                              title="Enviar invitación por correo"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" type="button" asChild>
                              <Link
                                href={`/settings/users/${encodeURIComponent(user.id)}/edit`}
                                aria-label="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" type="button" disabled>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
              <div className="text-sm text-muted-foreground">
                Mostrando{' '}
                {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a{' '}
                {Math.min(currentPage * itemsPerPage, filteredMembers.length)} de{' '}
                {filteredMembers.length} resultados
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i} className="hidden sm:block">
                      <PaginationLink
                        href="#"
                        isActive={i + 1 === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(currentPage + 1);
                      }}
                      className={
                        currentPage >= totalPages ? 'pointer-events-none opacity-50' : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </main>
      <AlertDialog open={inviteTarget != null} onOpenChange={(open) => !open && setInviteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar invitación por correo</AlertDialogTitle>
            <AlertDialogDescription>
              {inviteTarget
                ? `Se enviará una invitación a ${inviteTarget.email} para unirse a la plataforma y crear su cuenta.`
                : 'Confirme el envío de invitación.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={invitingMemberId != null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!inviteTarget || invitingMemberId != null}
              onClick={(e) => {
                e.preventDefault();
                if (!inviteTarget) return;
                void handleInvite(inviteTarget.id).finally(() => setInviteTarget(null));
              }}
            >
              {invitingMemberId != null ? 'Enviando…' : 'Sí, enviar correo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
