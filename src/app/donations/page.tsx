'use client';

import * as React from 'react';
import {
  FileText,
  Plus,
  Search,
  ListFilter,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type AutoTableDoc = jsPDF & {
  autoTable: (options: {
    head: string[][];
    body: Array<Array<string | number>>;
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    columnStyles?: Record<number, Record<string, unknown>>;
  }) => void;
};

type RecordCategoryTab = 'donations' | 'offering' | 'pledges' | 'campaigns';

type DonationListItem = {
  id: string;
  recordCategory?: string;
  donor: {
    memberId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  churchId: string;
  churchName: string;
  attendanceEvent: { id: string; name: string };
  amount: number;
  donationDate: string;
  fundCampaign: string;
  paymentMethod: string;
  transferReference?: string;
  donationFrequency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const FUND_LABELS: Record<string, string> = {
  'general-fund': 'Fondo Regional',
  'local-fund': 'Fondo Local',
  'building-fund': 'Fondo de Construcción',
  'missions-fund': 'Fondo de Misiones',
  'youth-fund': 'Fondo del Ministerio Juvenil',
  'benevolence-fund': 'Fondo de Benevolencia',
  'pastor-fund': 'Fondo Discrecional del Pastor',
  'other-fund': 'Otro Fondo',
};

const PAYMENT_LABELS: Record<string, string> = {
  'credit-card': 'Tarjeta de Crédito',
  check: 'Cheque',
  cash: 'Efectivo',
  online: 'Transferencia',
};

const formatDonationDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const donorDisplayName = (d: DonationListItem['donor']) =>
  `${d.firstName} ${d.lastName}`.trim() || '—';

const resolvedRecordCategory = (
  d: Pick<DonationListItem, 'recordCategory'>
): RecordCategoryTab => {
  const rc = d.recordCategory;
  if (rc === 'offering' || rc === 'pledges' || rc === 'campaigns') return rc;
  return 'donations';
};

const RECORD_CATEGORY_TABS: {
  value: RecordCategoryTab;
  label: string;
  searchPlaceholder: string;
  emptyHint: string;
  emptyInitial: string;
}[] = [
  {
    value: 'donations',
    label: 'Donaciones',
    searchPlaceholder: 'Buscar donaciones...',
    emptyHint: 'No hay donaciones que coincidan con la búsqueda o los filtros.',
    emptyInitial:
      'Aún no hay donaciones en esta categoría. Use «Añadir Donación» para crear un registro.',
  },
  {
    value: 'pledges',
    label: 'Promesas',
    searchPlaceholder: 'Buscar promesas...',
    emptyHint: 'No hay promesas que coincidan con la búsqueda o los filtros.',
    emptyInitial: 'No hay promesas en esta categoría. Cree un registro con tipo «Promesa».',
  },
  {
    value: 'campaigns',
    label: 'Campañas',
    searchPlaceholder: 'Buscar campañas...',
    emptyHint: 'No hay registros de campaña que coincidan con la búsqueda o los filtros.',
    emptyInitial: 'No hay campañas en esta categoría. Cree un registro con tipo «Campaña».',
  },
  {
    value: 'offering',
    label: 'Ofrendas',
    searchPlaceholder: 'Buscar ofrendas...',
    emptyHint: 'No hay ofrendas que coincidan con la búsqueda o los filtros.',
    emptyInitial: 'No hay ofrendas en esta categoría. Cree un registro con tipo «Ofrenda».',
  },
];

const normalizeComparable = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const FUND_OPTIONS = [
  { value: 'general-fund', label: 'Fondo Regional' },
  { value: 'local-fund', label: 'Fondo Local' },
  { value: 'building-fund', label: 'Fondo de Construcción' },
  { value: 'missions-fund', label: 'Fondo de Misiones' },
  { value: 'youth-fund', label: 'Fondo del Ministerio Juvenil' },
  { value: 'benevolence-fund', label: 'Fondo de Benevolencia' },
  { value: 'pastor-fund', label: 'Fondo Discrecional del Pastor' },
  { value: 'other-fund', label: 'Otro Fondo' },
] as const;

const PAYMENT_OPTIONS = [
  { value: 'credit-card', label: 'Tarjeta de Crédito' },
  { value: 'check', label: 'Cheque' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'online', label: 'Transferencia' },
] as const;

type DonationColumnFilters = {
  donorName: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  fundCampaign: string;
  paymentMethod: string;
};

const defaultColumnFilters: DonationColumnFilters = {
  donorName: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  fundCampaign: '',
  paymentMethod: '',
};

export default function DonationsPage() {
  const [donations, setDonations] = React.useState<DonationListItem[]>([]);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const [columnFilters, setColumnFilters] =
    React.useState<DonationColumnFilters>(defaultColumnFilters);
  const [draftFilters, setDraftFilters] =
    React.useState<DonationColumnFilters>(defaultColumnFilters);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [categoryTab, setCategoryTab] = React.useState<RecordCategoryTab>('donations');
  const itemsPerPage = 5;

  const tabConfig = RECORD_CATEGORY_TABS.find((t) => t.value === categoryTab) ?? RECORD_CATEGORY_TABS[0];

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState('loading');
      setLoadError(null);
      try {
        const response = await fetch('/api/donations', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await response.json().catch(() => ({}))) as {
          donations?: DonationListItem[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error || 'No se pudieron cargar las donaciones.');
        }
        if (cancelled) return;
        setDonations(json.donations ?? []);
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        setDonations([]);
        setLoadState('error');
        setLoadError(e instanceof Error ? e.message : 'Error al cargar.');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = search.trim().toLowerCase();

  const donationsInCategory = React.useMemo(
    () => donations.filter((d) => resolvedRecordCategory(d) === categoryTab),
    [donations, categoryTab]
  );

  const searchFiltered = React.useMemo(() => {
    if (!normalizedQuery) return donationsInCategory;
    return donationsInCategory.filter((d) => {
      const name = donorDisplayName(d.donor).toLowerCase();
      const fund = (FUND_LABELS[d.fundCampaign] ?? d.fundCampaign).toLowerCase();
      const pay = (PAYMENT_LABELS[d.paymentMethod] ?? d.paymentMethod).toLowerCase();
      const church = d.churchName.toLowerCase();
      const event = d.attendanceEvent?.name?.toLowerCase() ?? '';
      return (
        name.includes(normalizedQuery) ||
        fund.includes(normalizedQuery) ||
        pay.includes(normalizedQuery) ||
        church.includes(normalizedQuery) ||
        event.includes(normalizedQuery)
      );
    });
  }, [donationsInCategory, normalizedQuery]);

  const filteredDonations = React.useMemo(() => {
    return searchFiltered.filter((d) => {
      if (columnFilters.donorName.trim()) {
        const q = normalizeComparable(columnFilters.donorName);
        if (!normalizeComparable(donorDisplayName(d.donor)).includes(q)) return false;
      }
      const t = new Date(d.donationDate).getTime();
      if (columnFilters.dateFrom.trim()) {
        const from = new Date(columnFilters.dateFrom);
        from.setHours(0, 0, 0, 0);
        if (Number.isNaN(t) || t < from.getTime()) return false;
      }
      if (columnFilters.dateTo.trim()) {
        const to = new Date(columnFilters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (Number.isNaN(t) || t > to.getTime()) return false;
      }
      if (columnFilters.amountMin.trim()) {
        const min = Number.parseFloat(columnFilters.amountMin.replace(',', '.'));
        if (!Number.isNaN(min) && d.amount < min) return false;
      }
      if (columnFilters.amountMax.trim()) {
        const max = Number.parseFloat(columnFilters.amountMax.replace(',', '.'));
        if (!Number.isNaN(max) && d.amount > max) return false;
      }
      if (columnFilters.fundCampaign && d.fundCampaign !== columnFilters.fundCampaign) {
        return false;
      }
      if (columnFilters.paymentMethod && d.paymentMethod !== columnFilters.paymentMethod) {
        return false;
      }
      return true;
    });
  }, [searchFiltered, columnFilters]);

  const hasActiveColumnFilters = React.useMemo(() => {
    return Object.values(columnFilters).some((v) => String(v).trim() !== '');
  }, [columnFilters]);

  const applyDraftFilters = () => {
    setColumnFilters({ ...draftFilters });
    setFilterPopoverOpen(false);
  };

  const clearColumnFilters = () => {
    setDraftFilters(defaultColumnFilters);
    setColumnFilters(defaultColumnFilters);
    setFilterPopoverOpen(false);
  };

  const downloadPdf = () => {
    const fl = (key: string) => FUND_LABELS[key] ?? key;
    const pl = (key: string) => PAYMENT_LABELS[key] ?? key;
    const rows = filteredDonations.map((d) => [
      donorDisplayName(d.donor),
      formatDonationDate(d.donationDate),
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(d.amount),
      fl(d.fundCampaign),
      pl(d.paymentMethod),
      d.churchName,
      d.attendanceEvent?.name ?? '—',
      d.id,
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as AutoTableDoc;
    doc.setFontSize(14);
    doc.text(`Listado: ${tabConfig.label}`, 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generado: ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())} · ${rows.length} registro(s)`,
      14,
      22
    );
    doc.setTextColor(0);

    doc.autoTable({
      startY: 26,
      head: [
        [
          'Donante',
          'Fecha',
          'Monto',
          'Fondo / Campaña',
          'Método de pago',
          'Templo',
          'Evento',
          'ID registro',
        ],
      ],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 120], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 28 },
        2: { cellWidth: 26 },
        3: { cellWidth: 40 },
        4: { cellWidth: 32 },
        5: { cellWidth: 42 },
        6: { cellWidth: 36 },
        7: { cellWidth: 52 },
      },
    });

    doc.save(
      `donaciones-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, columnFilters, donations.length, categoryTab]);

  React.useEffect(() => {
    setSearch('');
    setColumnFilters(defaultColumnFilters);
    setDraftFilters(defaultColumnFilters);
    setFilterPopoverOpen(false);
  }, [categoryTab]);

  const totalThisMonth = React.useMemo(() => {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    const end = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return donations.reduce((sum, d) => {
      const t = new Date(d.donationDate).getTime();
      if (Number.isNaN(t)) return sum;
      if (t >= start && t <= end) return sum + d.amount;
      return sum;
    }, 0);
  }, [donations]);

  const totalItems = filteredDonations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredDonations.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const fundLabel = (key: string) => FUND_LABELS[key] ?? key;
  const paymentLabel = (key: string) => PAYMENT_LABELS[key] ?? key;

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Donaciones y Ofrendas"
        description="Gestione donaciones, promesas de donación y genere estados de cuenta."
      >
        <Button variant="outline" asChild>
          <Link href="/donations/giving-statement">
            <FileText className="mr-2 h-4 w-4" /> Generar Estado de Cuenta
          </Link>
        </Button>
      </AppHeader>
      <main className="flex-1 bg-muted/20 p-4 sm:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ofrendas Totales Este Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {loadState === 'loading' ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <div className="text-3xl font-bold">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(totalThisMonth)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Suma de donaciones con fecha en el mes actual
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Cumplimiento de Promesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">Próximamente con datos de promesas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">Próximamente</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Tabs
            value={categoryTab}
            onValueChange={(v) => setCategoryTab(v as RecordCategoryTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
              {RECORD_CATEGORY_TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="shrink-0 px-2 text-xs sm:px-3 sm:text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={categoryTab} className="mt-4 focus-visible:outline-none">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={tabConfig.searchPlaceholder}
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={loadState === 'loading'}
                      />
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <Popover
                        open={filterPopoverOpen}
                        onOpenChange={(open) => {
                          setFilterPopoverOpen(open);
                          if (open) setDraftFilters({ ...columnFilters });
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant={hasActiveColumnFilters ? 'secondary' : 'ghost'}
                            size="icon"
                            className="relative w-auto px-2 sm:w-10"
                            type="button"
                            aria-label="Filtros por columna"
                            disabled={loadState === 'loading'}
                          >
                            <ListFilter className="h-4 w-4" />
                            {hasActiveColumnFilters ? (
                              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
                            ) : null}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(100vw-2rem,380px)] p-4" align="end">
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">Filtrar por columna</p>
                            <div className="space-y-1.5">
                              <Label htmlFor="filter-donor">Nombre del donante</Label>
                              <Input
                                id="filter-donor"
                                value={draftFilters.donorName}
                                onChange={(e) =>
                                  setDraftFilters((p) => ({ ...p, donorName: e.target.value }))
                                }
                                placeholder="Contiene…"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-from">Fecha desde</Label>
                                <Input
                                  id="filter-from"
                                  type="date"
                                  value={draftFilters.dateFrom}
                                  onChange={(e) =>
                                    setDraftFilters((p) => ({ ...p, dateFrom: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-to">Fecha hasta</Label>
                                <Input
                                  id="filter-to"
                                  type="date"
                                  value={draftFilters.dateTo}
                                  onChange={(e) =>
                                    setDraftFilters((p) => ({ ...p, dateTo: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-min">Monto mín.</Label>
                                <Input
                                  id="filter-min"
                                  inputMode="decimal"
                                  value={draftFilters.amountMin}
                                  onChange={(e) =>
                                    setDraftFilters((p) => ({ ...p, amountMin: e.target.value }))
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-max">Monto máx.</Label>
                                <Input
                                  id="filter-max"
                                  inputMode="decimal"
                                  value={draftFilters.amountMax}
                                  onChange={(e) =>
                                    setDraftFilters((p) => ({ ...p, amountMax: e.target.value }))
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Fondo / campaña</Label>
                              <Select
                                value={draftFilters.fundCampaign || '__all__'}
                                onValueChange={(v) =>
                                  setDraftFilters((p) => ({
                                    ...p,
                                    fundCampaign: v === '__all__' ? '' : v,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todos</SelectItem>
                                  {FUND_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Método de pago</Label>
                              <Select
                                value={draftFilters.paymentMethod || '__all__'}
                                onValueChange={(v) =>
                                  setDraftFilters((p) => ({
                                    ...p,
                                    paymentMethod: v === '__all__' ? '' : v,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todos</SelectItem>
                                  {PAYMENT_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button type="button" size="sm" onClick={applyDraftFilters}>
                                Aplicar
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={clearColumnFilters}>
                                Limpiar
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-auto px-2 sm:w-10"
                        type="button"
                        aria-label="Descargar PDF"
                        disabled={loadState !== 'ready' || filteredDonations.length === 0}
                        onClick={downloadPdf}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button asChild className="flex-1 sm:flex-none">
                        <Link href="/donations/new">
                          <Plus className="mr-2 h-4 w-4" /> Añadir Donación
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {loadState === 'error' ? (
                    <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
                  ) : null}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox disabled aria-label="Seleccionar todos" />
                          </TableHead>
                          <TableHead>NOMBRE DEL DONANTE</TableHead>
                          <TableHead>FECHA</TableHead>
                          <TableHead>MONTO</TableHead>
                          <TableHead className="hidden sm:table-cell">FONDO/CAMPAÑA</TableHead>
                          <TableHead className="hidden sm:table-cell">MÉTODO DE PAGO</TableHead>
                          <TableHead className="text-right">ACCIONES</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadState === 'loading' ? (
                          Array.from({ length: itemsPerPage }).map((_, i) => (
                            <TableRow key={`sk-${i}`}>
                              <TableCell colSpan={7}>
                                <Skeleton className="h-10 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-sm text-muted-foreground"
                            >
                              {normalizedQuery || hasActiveColumnFilters
                                ? tabConfig.emptyHint
                                : tabConfig.emptyInitial}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell>
                                <Checkbox aria-label={`Seleccionar ${donorDisplayName(donation.donor)}`} />
                              </TableCell>
                              <TableCell className="font-medium">
                                {donorDisplayName(donation.donor)}
                              </TableCell>
                              <TableCell>{formatDonationDate(donation.donationDate)}</TableCell>
                              <TableCell>
                                {new Intl.NumberFormat('es-MX', {
                                  style: 'currency',
                                  currency: 'MXN',
                                }).format(donation.amount)}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {fundLabel(donation.fundCampaign)}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {paymentLabel(donation.paymentMethod)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="link" className="text-primary" asChild>
                                  <Link href={`/donations/${donation.id}`}>Ver</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {loadState === 'ready' && totalItems > 0 ? (
                    <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {(safePage - 1) * itemsPerPage + 1} a{' '}
                        {Math.min(safePage * itemsPerPage, totalItems)} de {totalItems} resultados
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(safePage - 1);
                              }}
                            />
                          </PaginationItem>
                          {[...Array(totalPages)].map((_, i) => (
                            <PaginationItem key={i} className="hidden sm:block">
                              <PaginationLink
                                href="#"
                                isActive={i + 1 === safePage}
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
                                handlePageChange(safePage + 1);
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
