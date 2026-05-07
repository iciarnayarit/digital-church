
'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/app-header';

type ApiMember = {
  id: string;
  firstName: string;
  lastName: string;
};

type AttendanceRow = {
  id: string;
  date: string;
  serviceName: string;
  status: 'Presente' | 'Ausente' | 'Justificado';
  checkInTime: string;
};

const statusColors: Record<string, string> = {
  Presente: 'bg-green-100 text-green-800 border-green-200',
  Ausente: 'bg-gray-100 text-gray-800 border-gray-200',
  Justificado: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const statusDotColors: Record<string, string> = {
  Presente: 'bg-green-500',
  Ausente: 'bg-gray-400',
  Justificado: 'bg-yellow-500',
};

function memberIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return (raw[0] && String(raw[0])) || '';
  if (typeof raw === 'string') return raw;
  return '';
}

function parseYmd(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function inThisMonth(dateStr: string): boolean {
  const dt = parseYmd(dateStr);
  if (!dt) return false;
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
}

function inThisYear(dateStr: string): boolean {
  const dt = parseYmd(dateStr);
  if (!dt) return false;
  return dt.getFullYear() === new Date().getFullYear();
}

export default function MemberAttendanceHistoryPage() {
  const params = useParams();
  const id = memberIdFromParams(params);

  const [memberName, setMemberName] = React.useState<string>('');
  const [records, setRecords] = React.useState<AttendanceRow[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

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
        const [memberRes, attRes] = await Promise.all([
          fetch(`/api/members/${encodeURIComponent(id)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
          fetch(`/api/members/${encodeURIComponent(id)}/attendance`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
        ]);

        const memberData = (await memberRes.json().catch(() => ({}))) as {
          member?: ApiMember;
          error?: string;
        };
        const attData = (await attRes.json().catch(() => ({}))) as {
          records?: AttendanceRow[];
          error?: string;
        };

        if (!memberRes.ok) {
          throw new Error(memberData.error || 'No se pudo cargar el miembro.');
        }
        if (!attRes.ok) {
          throw new Error(attData.error || 'No se pudo cargar la asistencia.');
        }
        if (cancelled) return;

        const m = memberData.member;
        const name = m ? `${m.firstName} ${m.lastName}`.trim() : 'Miembro';
        setMemberName(name || 'Miembro');
        setRecords(Array.isArray(attData.records) ? attData.records : []);
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
  }, [id]);

  const filteredRecords = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      if (q && !r.serviceName.toLowerCase().includes(q)) return false;
      if (statusFilter === 'present' && r.status !== 'Presente') return false;
      if (statusFilter === 'absent' && r.status !== 'Ausente') return false;
      if (statusFilter === 'excused' && r.status !== 'Justificado') return false;
      if (dateRange === 'this-month' && !inThisMonth(r.date)) return false;
      if (dateRange === 'this-year' && !inThisYear(r.date)) return false;
      return true;
    });
  }, [records, searchTerm, statusFilter, dateRange]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange, records.length]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const paginatedData = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Historial de asistencia" description="Cargando…" />
        <main className="flex-1 bg-muted/20 p-4 sm:p-8">
          <p className="text-sm text-muted-foreground">Cargando datos…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Historial de asistencia" description="No se pudo cargar la página." />
        <main className="flex-1 space-y-4 bg-muted/20 p-4 sm:p-8">
          <p className="text-sm text-destructive">{loadMessage ?? 'Error'}</p>
          <Button variant="outline" asChild>
            <Link href="/members">Volver al directorio</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title={`Historial de asistencia de ${memberName}`}
        description="Registros de asistencia asociados a este miembro en la base de datos."
      >
        <Button variant="outline" asChild>
          <Link href={`/members/${id}`}>Volver al perfil</Link>
        </Button>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Todos los registros</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-6 flex flex-col items-center justify-between gap-4 lg:flex-row">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre de servicio…"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar por servicio"
                />
              </div>
              <div className="flex w-full flex-col items-center gap-2 sm:flex-row lg:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="present">Presente</SelectItem>
                    <SelectItem value="absent">Ausente</SelectItem>
                    <SelectItem value="excused">Justificado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Rango de fechas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    <SelectItem value="this-month">Este mes</SelectItem>
                    <SelectItem value="this-year">Este año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre del servicio / evento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">Hora de entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        {records.length === 0
                          ? 'No hay registros de asistencia para este miembro.'
                          : 'Ningún registro coincide con los filtros.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.serviceName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium ${statusColors[record.status] ?? ''}`}
                          >
                            <span
                              className={`mr-2 h-2 w-2 rounded-full ${statusDotColors[record.status] ?? 'bg-muted-foreground'}`}
                            />
                            {record.status}
                          </Badge>
                          <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                            Entrada: {record.checkInTime}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{record.checkInTime}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
              <div className="text-sm text-muted-foreground">
                Mostrando{' '}
                {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a{' '}
                {Math.min(currentPage * itemsPerPage, filteredRecords.length)} de {filteredRecords.length}{' '}
                resultados
              </div>
              {filteredRecords.length > 0 ? (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        className={currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
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
                        className={
                          currentPage >= totalPages ? 'pointer-events-none opacity-50' : undefined
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
