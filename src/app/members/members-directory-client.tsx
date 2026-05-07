
'use client';

import * as React from 'react';
import {
  LayoutGrid,
  List,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { groupData } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AppHeader } from '@/components/app-header';
import { cn } from '@/lib/utils';
import { isInventoryGlobalStaffRole, isLeadershipStaffRole } from '@/lib/pastor-church-access';
import { STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN } from '@/lib/staff-directory-roles';

type MemberListItem = {
  id: string;
  name: string;
  email: string;
  phone1: string;
  phone2: string;
  status: string;
  groups: string[];
  photoDataUrl: string | null;
  staffRole: string | null;
  /** Ids de templo (`churches.id` / legado); viene del GET /api/members. */
  churchIds: string[];
};

type Member = MemberListItem;

/** Mismo criterio que el listado Pastoral (`/members/staff`): `staffRole` con valor y fuera de los cuatro excluidos. */
function isPastoralDirectoryStaffMember(staffRole: string | null): boolean {
  if (staffRole == null || !String(staffRole).trim()) return false;
  const re = new RegExp(STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN, 'i');
  return !re.test(String(staffRole).trim());
}

function membershipStatusLabel(code: string): string {
  const map: Record<string, string> = {
    active: 'Activo',
    visitor: 'Visitante',
    inactive: 'Inactivo',
  };
  return map[code] ?? code;
}

function mapApiMemberToRow(doc: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  groups: string[];
  membershipStatus: string;
  photoDataUrl: string | null;
  staffRole?: string | null;
  churchIds?: string[];
}): MemberListItem {
  const sr = doc.staffRole;
  const rawChurches = doc.churchIds;
  return {
    id: doc.id,
    name: `${doc.firstName} ${doc.lastName}`.trim(),
    email: doc.email,
    phone1: doc.phone,
    phone2: '',
    status: membershipStatusLabel(doc.membershipStatus),
    groups: Array.isArray(doc.groups) ? doc.groups : [],
    photoDataUrl: doc.photoDataUrl ?? null,
    staffRole:
      sr === null || sr === undefined ? null : String(sr).trim() || null,
    churchIds: Array.isArray(rawChurches) ? rawChurches.map(String).filter(Boolean) : [],
  };
}

const statusColors = {
  Activo: 'bg-green-500',
  Visitante: 'bg-yellow-500',
  Inactivo: 'bg-red-500',
};

const groupColors = {
  Voluntarios: 'bg-blue-100 text-blue-800',
  Coro: 'bg-yellow-100 text-yellow-800',
  'Grupo de Jóvenes': 'bg-purple-100 text-purple-800',
  'Nuevo Miembro': 'bg-green-100 text-green-800',
};

const STATUS_FILTER_META = [
  {
    id: 'active',
    value: 'Activo',
    label: 'Activo',
    hint: 'Asistencia constante a la iglesia.',
  },
  {
    id: 'visitor',
    value: 'Visitante',
    label: 'Visitante',
    hint: 'Poco tiempo asistiendo al templo.',
  },
  {
    id: 'inactive',
    value: 'Inactivo',
    label: 'Inactivo',
    hint: 'Regresando a la iglesia.',
  },
] as const;

type SidebarFilters = {
  status: string[];
  group: string;
  tags: string;
};

function MembersFilterFields({
  filters,
  onFilterChange,
  onApply,
  onClear,
  groupOptions,
}: {
  filters: SidebarFilters;
  onFilterChange: (key: keyof SidebarFilters, value: string | string[]) => void;
  onApply: () => void;
  onClear: () => void;
  groupOptions: string[];
}) {
  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter((s) => s !== status);
    onFilterChange('status', newStatus);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Estado de Membresía
          </h3>
          <div className="mt-2 space-y-4">
            {STATUS_FILTER_META.map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`member-filter-${s.id}`}
                    onCheckedChange={(checked) =>
                      handleStatusChange(s.value, !!checked)
                    }
                    checked={filters.status.includes(s.value)}
                  />
                  <Label
                    htmlFor={`member-filter-${s.id}`}
                    className="text-sm font-medium leading-none"
                  >
                    {s.label}
                  </Label>
                </div>
                <p className="pl-6 text-xs text-muted-foreground leading-snug">
                  {s.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Grupos</h3>
          <Select
            value={filters.group}
            onValueChange={(value) => onFilterChange('group', value)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Todos los Grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Grupos</SelectItem>
              {groupOptions.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Etiquetas</h3>
          <div className="relative mt-2">
            <Input
              className={cn(filters.tags.trim() && 'pr-10')}
              placeholder="Ej. Bautizado, Nuevo"
              value={filters.tags}
              onChange={(e) => onFilterChange('tags', e.target.value)}
            />
            {filters.tags.trim() ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onFilterChange('tags', '')}
                aria-label="Borrar texto de etiquetas"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Separe varias palabras con coma. Se busca en nombre, correo, estado y
            grupos.
          </p>
        </div>
      </div>
      <div className="mt-8 space-y-2">
        <Button type="button" className="w-full" onClick={onApply}>
          Aplicar Filtros
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onClear}>
          Limpiar Todo
        </Button>
      </div>
    </>
  );
}

function MembersFiltersMobileSheet({
  filters,
  onFilterChange,
  onApply,
  onClear,
  groupOptions,
}: {
  filters: SidebarFilters;
  onFilterChange: (key: keyof SidebarFilters, value: string | string[]) => void;
  onApply: () => void;
  onClear: () => void;
  groupOptions: string[];
}) {
  return (
    <>
      <h2 className="text-lg font-semibold">Filtros</h2>
      <div className="mt-6">
        <MembersFilterFields
          filters={filters}
          onFilterChange={onFilterChange}
          onApply={onApply}
          onClear={onClear}
          groupOptions={groupOptions}
        />
      </div>
    </>
  );
}

const defaultSidebarFilters: SidebarFilters = {
  status: [],
  group: 'all',
  tags: '',
};

function parseTagTerms(tags: string): string[] {
  return tags
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function memberMatchesTags(member: Member, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = [
    member.name,
    member.email,
    member.phone1,
    member.phone2,
    member.status,
    ...member.groups,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export type MembersDirectoryClientProps = {
  title: string;
  description: string;
  /**
   * Parámetros adicionales para `GET /api/members`.
   * Por defecto se añade `sessionChurchScope=1`; con `staffDirectoryAllChurches=1` no se envía (personal y cargos en todas las iglesias).
   */
  extraMembersSearchParams?: Record<string, string>;
  showAddMemberButton?: boolean;
  /** Mensaje cuando la API devuelve 0 miembros (sin aplicar búsqueda lateral). */
  emptyDirectoryMessage?: string;
};

function filterMembers(
  source: Member[],
  searchTerm: string,
  applied: SidebarFilters
): Member[] {
  let data = source;

  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    data = data.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.phone1 && member.phone1.toLowerCase().includes(q)) ||
        (member.phone2 && member.phone2.toLowerCase().includes(q)) ||
        member.status.toLowerCase().includes(q) ||
        member.groups.some((g) => g.toLowerCase().includes(q))
    );
  }

  if (applied.status.length > 0) {
    data = data.filter((member) => applied.status.includes(member.status));
  }

  if (applied.group !== 'all') {
    data = data.filter((member) => member.groups.includes(applied.group));
  }

  const tagTerms = parseTagTerms(applied.tags);
  if (tagTerms.length > 0) {
    data = data.filter((member) => memberMatchesTags(member, tagTerms));
  }

  return data;
}

export function MembersDirectoryClient({
  title,
  description,
  extraMembersSearchParams,
  showAddMemberButton = true,
  emptyDirectoryMessage,
}: MembersDirectoryClientProps) {
  const { toast } = useToast();
  const [members, setMembers] = React.useState<MemberListItem[]>([]);
  const [listStatus, setListStatus] = React.useState<'loading' | 'ok' | 'error'>(
    'loading'
  );
  const [selected, setSelected] = React.useState<string[]>([]);
  const [view, setView] = React.useState<'table' | 'card'>('table');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [pendingFilters, setPendingFilters] =
    React.useState<SidebarFilters>(defaultSidebarFilters);
  const [appliedFilters, setAppliedFilters] =
    React.useState<SidebarFilters>(defaultSidebarFilters);
  const [filtersPanelOpen, setFiltersPanelOpen] = React.useState(true);
  const [memberToDelete, setMemberToDelete] = React.useState<Member | null>(null);
  const [isBulkDelete, setIsBulkDelete] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;
  const [viewerIsAdmin, setViewerIsAdmin] = React.useState(false);
  const [viewerStaffRole, setViewerStaffRole] = React.useState<string | null>(null);
  const [viewerChurchIds, setViewerChurchIds] = React.useState<string[]>([]);
  const [viewerMemberId, setViewerMemberId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/members/me-role', {
          cache: 'no-store',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const d = (await res.json().catch(() => ({}))) as {
          isAdmin?: boolean;
          staffRole?: string | null;
          churchIds?: string[];
          memberId?: string | null;
        };
        if (cancelled) return;
        setViewerIsAdmin(Boolean(d.isAdmin));
        setViewerStaffRole(
          d.staffRole != null && String(d.staffRole).trim()
            ? String(d.staffRole).trim()
            : null
        );
        setViewerChurchIds(
          Array.isArray(d.churchIds) ? d.churchIds.map(String).filter(Boolean) : []
        );
        setViewerMemberId(
          typeof d.memberId === 'string' && d.memberId.trim() ? d.memberId.trim() : null
        );
      } catch {
        if (!cancelled) {
          setViewerIsAdmin(false);
          setViewerStaffRole(null);
          setViewerChurchIds([]);
          setViewerMemberId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canEditListedMember = React.useCallback(
    (member: MemberListItem) => {
      if (viewerIsAdmin) return true;
      if (viewerMemberId && member.id === viewerMemberId) return true;
      if (viewerChurchIds.length === 0) return false;
      const theirs = member.churchIds ?? [];
      if (theirs.length === 0) return false;
      return theirs.some((cid) => viewerChurchIds.includes(cid));
    },
    [viewerIsAdmin, viewerChurchIds, viewerMemberId]
  );

  const fetchMembers = React.useCallback(async () => {
    setListStatus('loading');
    try {
      const params = new URLSearchParams();
      const ex = extraMembersSearchParams ?? {};
      const staffAllChurches =
        ex.staffDirectoryAllChurches === '1' || ex.staffDirectoryAllChurches === 'true';
      if (!staffAllChurches) {
        params.set('sessionChurchScope', '1');
      }
      for (const [k, v] of Object.entries(ex)) {
        params.set(k, v);
      }
      const res = await fetch(`/api/members?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const data = (await res.json()) as {
        members?: unknown[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron cargar los miembros.');
      }
      const rows = (data.members ?? []).map((raw) =>
        mapApiMemberToRow(raw as Parameters<typeof mapApiMemberToRow>[0])
      );
      setMembers(rows);
      setListStatus('ok');
    } catch (e) {
      console.error(e);
      setMembers([]);
      setListStatus('error');
      toast({
        variant: 'destructive',
        title: 'Error al cargar',
        description:
          e instanceof Error ? e.message : 'No se pudo leer el directorio.',
      });
    }
  }, [toast, extraMembersSearchParams]);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const groupOptions = React.useMemo(() => {
    const s = new Set<string>();
    groupData.forEach((g) => s.add(g.name));
    members.forEach((m) => m.groups.forEach((g) => s.add(g)));
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [members]);

  const handleFilterChange = (key: keyof SidebarFilters, value: string | string[]) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applySidebarFilters = React.useCallback(() => {
    setAppliedFilters({ ...pendingFilters });
    setCurrentPage(1);
  }, [pendingFilters]);

  const clearFilters = () => {
    setPendingFilters(defaultSidebarFilters);
    setAppliedFilters(defaultSidebarFilters);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const filteredMembers = React.useMemo(
    () => filterMembers(members, searchTerm, appliedFilters),
    [members, searchTerm, appliedFilters]
  );

  const selectionIncludesPastoralStaff = React.useMemo(() => {
    if (selected.length === 0) return false;
    const sel = new Set(selected);
    return members.some(
      (m) => sel.has(m.id) && isPastoralDirectoryStaffMember(m.staffRole)
    );
  }, [selected, members]);

  const showBulkDeleteEmailAndMassActions =
    isInventoryGlobalStaffRole(viewerStaffRole) || !selectionIncludesPastoralStaff;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, appliedFilters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(paginatedMembers.map((m) => m.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter((i) => i !== id));
    }
  };

  const handleDelete = async () => {
    const ids = isBulkDelete
      ? selected
      : memberToDelete
        ? [memberToDelete.id]
        : [];
    if (ids.length === 0) {
      setMemberToDelete(null);
      setIsBulkDelete(false);
      return;
    }
    try {
      const res = await fetch('/api/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar.');
      }
      toast({
        title: ids.length > 1 ? 'Miembros eliminados' : 'Miembro eliminado',
        description:
          ids.length > 1
            ? `Se eliminaron ${ids.length} registros de la base de datos.`
            : 'El registro se eliminó de la base de datos.',
      });
      setSelected([]);
      setMemberToDelete(null);
      setIsBulkDelete(false);
      await fetchMembers();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: e instanceof Error ? e.message : 'Inténtelo de nuevo.',
      });
    }
  };

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <AlertDialog>
        <div className="flex flex-col flex-1">
            <AppHeader title={title} description={description}>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  {showAddMemberButton ? (
                    <Button className="h-11 w-full flex-1 sm:h-10 sm:w-auto sm:flex-none" asChild>
                      <Link href="/members/new">
                        <Plus className="mr-2" /> Añadir Nuevo Miembro
                      </Link>
                    </Button>
                  ) : null}
                  <ThemeToggle />
                </div>
            </AppHeader>
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <aside
                  className={cn(
                    'hidden shrink-0 flex-col overflow-hidden border-r bg-background transition-[width] duration-200 ease-in-out md:flex',
                    filtersPanelOpen ? 'w-80' : 'w-14'
                  )}
                >
                  <div
                    className={cn(
                      'flex shrink-0 items-center gap-3 border-b border-border/40 p-4',
                      !filtersPanelOpen && 'flex-col justify-center gap-2 py-4'
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setFiltersPanelOpen((o) => !o)}
                      aria-expanded={filtersPanelOpen}
                      aria-label={
                        filtersPanelOpen
                          ? 'Contraer panel de filtros'
                          : 'Expandir panel de filtros'
                      }
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                    {filtersPanelOpen ? (
                      <h2 className="text-lg font-semibold">Filtros</h2>
                    ) : null}
                  </div>
                  {filtersPanelOpen ? (
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                      <MembersFilterFields
                        filters={pendingFilters}
                        onFilterChange={handleFilterChange}
                        onApply={applySidebarFilters}
                        onClear={clearFilters}
                        groupOptions={groupOptions}
                      />
                    </div>
                  ) : null}
                </aside>
                <main className="min-w-0 flex-1 p-4 sm:p-8">
                    <Card>
                        <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:max-w-sm sm:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por nombre, email, teléfono, estado..."
                              className="h-11 w-full pl-9"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="md:hidden flex h-11 items-center gap-2">
                                            <SlidersHorizontal className="h-4 w-4" />
                                            <span className="hidden min-[380px]:inline">Filtros</span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-[300px]">
                                    <div className="p-6">
                                        <MembersFiltersMobileSheet
                                          filters={pendingFilters}
                                          onFilterChange={handleFilterChange}
                                          onApply={applySidebarFilters}
                                          onClear={clearFilters}
                                          groupOptions={groupOptions}
                                        />
                                    </div>
                                    </SheetContent>
                                </Sheet>
                                <Button
                                    variant={view === 'table' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setView('table')}
                                >
                                    <List className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant={view === 'card' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setView('card')}
                                >
                                    <LayoutGrid className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        </CardHeader>
                        <CardContent>
                        {selected.length > 0 && (
                            <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 p-3">
                            <div className="text-sm font-medium">
                                {selected.length} {selected.length > 1 ? 'elementos seleccionados' : 'elemento seleccionado'}
                            </div>
                            {showBulkDeleteEmailAndMassActions ? (
                              <div className="flex items-center gap-2">
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setIsBulkDelete(true)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <Link href={`/members/send-email?ids=${selected.join(',')}`}>
                                    <Mail className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button size="sm" asChild>
                                  <Link href="/members/bulk-actions">Acciones Masivas</Link>
                                </Button>
                              </div>
                            ) : null}
                            </div>
                        )}
                        
                        {listStatus === 'loading' ? (
                            <div className="py-12 text-center text-muted-foreground">
                                Cargando miembros…
                            </div>
                        ) : listStatus === 'error' ? (
                            <div className="space-y-4 py-12 text-center">
                                <p className="text-muted-foreground">
                                    No se pudo cargar el directorio.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fetchMembers()}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                {members.length === 0
                                    ? (emptyDirectoryMessage ??
                                        'Aún no hay miembros registrados. Use «Añadir Nuevo Miembro» para crear uno.')
                                    : 'No se encontraron miembros que coincidan con sus filtros.'}
                            </div>
                        ) : null}

                        {listStatus === 'ok' && view === 'table' && filteredMembers.length > 0 ? (
                            <div className="overflow-x-auto">
                            <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                <Checkbox
                                    checked={
                                    selected.length > 0 &&
                                    selected.length === paginatedMembers.length
                                    }
                                    onCheckedChange={(checked) =>
                                    handleSelectAll(!!checked)
                                    }
                                />
                                </TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="hidden sm:table-cell">Grupos</TableHead>
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {paginatedMembers.map((member, rowIdx) => (
                                <TableRow
                                  key={`${member.id || 'sin-id'}-${(currentPage - 1) * itemsPerPage + rowIdx}`}
                                >
                                <TableCell>
                                    <Checkbox
                                    checked={selected.includes(member.id)}
                                    onCheckedChange={(checked) =>
                                        handleSelectOne(member.id, !!checked)
                                    }
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage
                                        src={member.photoDataUrl || undefined}
                                        alt={member.name}
                                        />
                                        <AvatarFallback>
                                        {member.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{member.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                        {member.email}
                                        </div>
                                    </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <div className="text-sm">{member.phone1}</div>
                                    <div className="text-sm text-muted-foreground">
                                    {member.phone2}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                        statusColors[member.status as keyof typeof statusColors]
                                        }`}
                                    />
                                    <span className="text-sm">{member.status}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                    {member.groups.map((group, gIdx) => (
                                        <Badge
                                        key={`${member.id || 'sin-id'}-g-${gIdx}-${group}`}
                                        variant="outline"
                                        className={`font-normal ${groupColors[group as keyof typeof groupColors] || 'bg-gray-100 text-gray-800'}`}
                                        >
                                        {group}
                                        </Badge>
                                    ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                    <Button variant="link" size="sm" className="px-0" asChild>
                                        <Link href={`/members/${member.id}`}>Ver</Link>
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                        {canEditListedMember(member) ? (
                                          <DropdownMenuItem asChild>
                                            <Link href={`/members/${member.id}/edit`}>Editar</Link>
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                                        )}
                                        {isLeadershipStaffRole(member.staffRole) ? (
                                          <DropdownMenuItem disabled>
                                            Eliminar
                                          </DropdownMenuItem>
                                        ) : (
                                          <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                              onSelect={(e) => {
                                                e.preventDefault();
                                                setIsBulkDelete(false);
                                                setMemberToDelete(member);
                                              }}
                                            >
                                              Eliminar
                                            </DropdownMenuItem>
                                          </AlertDialogTrigger>
                                        )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </div>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                        ) : listStatus === 'ok' && view === 'card' && filteredMembers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                            {paginatedMembers.map((member, cardIdx) => (
                            <Card
                              key={`${member.id || 'sin-id'}-${(currentPage - 1) * itemsPerPage + cardIdx}`}
                              className="relative"
                            >
                                <Checkbox
                                    checked={selected.includes(member.id)}
                                    onCheckedChange={(checked) =>
                                        handleSelectOne(member.id, !!checked)
                                    }
                                    className="absolute left-3 top-3"
                                    />
                                <Link href={`/members/${member.id}`}>
                                    <CardContent className="flex flex-col items-center justify-center text-center p-5 sm:p-6">
                                    <Avatar className="mb-3 h-16 w-16 sm:mb-4 sm:h-20 sm:w-20">
                                        <AvatarImage
                                            src={member.photoDataUrl || undefined}
                                            alt={member.name}
                                        />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-base font-bold sm:text-lg">{member.name}</p>
                                    <p className="truncate text-xs text-muted-foreground sm:text-sm">{member.email}</p>
                                    <div className="mt-3 flex items-center gap-2 sm:mt-4">
                                        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[member.status as keyof typeof statusColors]}`} />
                                        <span className="text-xs font-medium sm:text-sm">{member.status}</span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-center gap-1 sm:mt-4">
                                        {member.groups.map((group, gIdx) => (
                                        <Badge
                                          key={`${member.id || 'sin-id'}-g-${gIdx}-${group}`}
                                          variant="outline"
                                          className={`text-[11px] font-normal ${groupColors[group as keyof typeof groupColors] || 'bg-gray-100 text-gray-800'} sm:text-xs`}
                                        >
                                          {group}
                                        </Badge>
                                        ))}
                                    </div>
                                    </CardContent>
                                </Link>
                            </Card>
                            ))}
                        </div>
                        ) : null}
                        {listStatus === 'ok' && filteredMembers.length > 0 ? (
                         <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground sm:text-sm">
                                Mostrando{' '}
                                {paginatedMembers.length > 0
                                  ? (currentPage - 1) * itemsPerPage + 1
                                  : 0}{' '}
                                a {Math.min(currentPage * itemsPerPage, filteredMembers.length)} de{' '}
                                {filteredMembers.length} resultados
                            </div>
                            <Pagination>
                                <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                                </PaginationItem>
                                {[...Array(totalPages)].map((_, i) => (
                                  <PaginationItem key={i} className="hidden sm:block">
                                    <PaginationLink
                                      href="#"
                                      isActive={i + 1 === currentPage}
                                      onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}
                                    >
                                      {i + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}/>
                                </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                        ) : null}
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    {isBulkDelete 
                        ? `Esta acción no se puede deshacer. Esto eliminará permanentemente a los ${selected.length} miembros seleccionados.`
                        : `Esta acción no se puede deshacer. Esto eliminará permanentemente al miembro ${memberToDelete?.name} y eliminará sus datos de nuestros servidores.`
                    }
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {setMemberToDelete(null); setIsBulkDelete(false)}}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  Continuar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}
