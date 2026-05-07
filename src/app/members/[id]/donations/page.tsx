
'use client';

import * as React from 'react';
import { Search, Download, FileText } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AppHeader } from '@/components/app-header';
import { useToast } from '@/hooks/use-toast';

type ApiMember = {
  id: string;
  firstName: string;
  lastName: string;
};

type DonationRow = {
  id: string;
  date: string;
  fund: string;
  type: string;
  amount: number;
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

function inThisYear(dateStr: string): boolean {
  const dt = parseYmd(dateStr);
  if (!dt) return false;
  return dt.getFullYear() === new Date().getFullYear();
}

function inLastYear(dateStr: string): boolean {
  const dt = parseYmd(dateStr);
  if (!dt) return false;
  return dt.getFullYear() === new Date().getFullYear() - 1;
}

function formatDateEs(dateStr: string): string {
  const dt = parseYmd(dateStr) ?? new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadDonationsCsv(rows: DonationRow[], memberName: string) {
  const headers = ['Fecha', 'Fondo', 'Tipo de pago', 'Monto'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.date),
        escapeCsvCell(r.fund),
        escapeCsvCell(r.type),
        escapeCsvCell(String(r.amount)),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donaciones-${memberName.replace(/\s+/g, '-') || 'miembro'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MemberDonationHistoryPage() {
  const params = useParams();
  const id = memberIdFromParams(params);
  const { toast } = useToast();

  const [memberName, setMemberName] = React.useState('');
  const [donations, setDonations] = React.useState<DonationRow[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'error' | 'ready'>('loading');
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [fundFilter, setFundFilter] = React.useState('all');
  const [dateRange, setDateRange] = React.useState('all');
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
        const [memberRes, donRes] = await Promise.all([
          fetch(`/api/members/${encodeURIComponent(id)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
          fetch(`/api/members/${encodeURIComponent(id)}/donations`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
        ]);

        const memberData = (await memberRes.json().catch(() => ({}))) as {
          member?: ApiMember;
          error?: string;
        };
        const donData = (await donRes.json().catch(() => ({}))) as {
          donations?: DonationRow[];
          error?: string;
        };

        if (!memberRes.ok) {
          throw new Error(memberData.error || 'No se pudo cargar el miembro.');
        }
        if (!donRes.ok) {
          throw new Error(donData.error || 'No se pudo cargar el historial de donaciones.');
        }
        if (cancelled) return;

        const m = memberData.member;
        const name = m ? `${m.firstName} ${m.lastName}`.trim() : 'Miembro';
        setMemberName(name || 'Miembro');

        const list = Array.isArray(donData.donations) ? donData.donations : [];
        setDonations(
          list.map((d) => ({
            ...d,
            amount: typeof d.amount === 'number' ? d.amount : Number(d.amount) || 0,
          }))
        );
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

  const fundOptions = React.useMemo(() => {
    const set = new Set<string>();
    donations.forEach((d) => {
      if (d.fund?.trim()) set.add(d.fund.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [donations]);

  const filteredDonations = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return donations.filter((d) => {
      if (q) {
        const hay = `${d.fund} ${d.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fundFilter !== 'all' && d.fund !== fundFilter) return false;
      if (dateRange === 'this-year' && !inThisYear(d.date)) return false;
      if (dateRange === 'last-year' && !inLastYear(d.date)) return false;
      return true;
    });
  }, [donations, searchTerm, fundFilter, dateRange]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fundFilter, dateRange, donations.length]);

  const totalPages = Math.max(1, Math.ceil(filteredDonations.length / itemsPerPage));

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const paginatedData = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    if (filteredDonations.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin datos',
        description: 'No hay donaciones para exportar con los filtros actuales.',
      });
      return;
    }
    downloadDonationsCsv(filteredDonations, memberName);
    toast({ title: 'Exportación lista', description: 'Se descargó el archivo CSV.' });
  };

  if (loadState === 'loading') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Historial de donaciones" description="Cargando…" />
        <main className="flex-1 bg-muted/20 p-4 sm:p-8">
          <p className="text-sm text-muted-foreground">Cargando datos…</p>
        </main>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Historial de donaciones" description="No se pudo cargar la página." />
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
        title={`Historial de donaciones de ${memberName}`}
        description="Donaciones asociadas a este miembro en la base de datos."
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/members/${id}`}>Volver al perfil</Link>
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              toast({
                title: 'Próximamente',
                description: 'El estado de cuenta en PDF estará disponible en una próxima versión.',
              })
            }
          >
            <FileText className="mr-2 h-4 w-4" />
            Generar estado de cuenta
          </Button>
          <Button type="button" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Todas las donaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-6 flex flex-col items-center justify-between gap-4 lg:flex-row">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fondo o tipo…"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar donaciones"
                />
              </div>
              <div className="flex w-full flex-col items-center gap-2 sm:flex-row lg:w-auto">
                <Select value={fundFilter} onValueChange={setFundFilter}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="Filtrar por fondo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los fondos</SelectItem>
                    {fundOptions.map((fund) => (
                      <SelectItem key={fund} value={fund}>
                        {fund}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full lg:w-[180px]">
                    <SelectValue placeholder="Rango de fechas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                    <SelectItem value="this-year">Este año</SelectItem>
                    <SelectItem value="last-year">Año pasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="hidden sm:table-cell">Fondo</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo de pago</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {donations.length === 0
                          ? 'No hay donaciones registradas para este miembro.'
                          : 'Ninguna donación coincide con los filtros.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatDateEs(record.date)}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {record.fund} · {record.type}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{record.fund}</TableCell>
                        <TableCell className="hidden sm:table-cell">{record.type}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${record.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
              <div className="text-sm text-muted-foreground">
                Mostrando{' '}
                {filteredDonations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a{' '}
                {Math.min(currentPage * itemsPerPage, filteredDonations.length)} de{' '}
                {filteredDonations.length} resultados
              </div>
              {filteredDonations.length > 0 ? (
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
