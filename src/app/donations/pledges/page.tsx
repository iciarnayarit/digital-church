
'use client';

import * as React from 'react';
import {
  Download,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

const pledgesData = [
  {
    id: 1,
    donor: 'John & Jane Smith',
    totalPledge: 5000,
    fulfilled: 4500,
    frequency: 'Mensual',
    dateRange: 'Ene 2023 - Dic 2023',
  },
  {
    id: 2,
    donor: 'David Lee',
    totalPledge: 10000,
    fulfilled: 10000,
    frequency: 'Única vez',
    dateRange: 'Mar 2023 - Mar 2023',
  },
  {
    id: 3,
    donor: 'Maria Garcia',
    totalPledge: 1200,
    fulfilled: 600,
    frequency: 'Trimestral',
    dateRange: 'Abr 2023 - Abr 2024',
  },
  {
    id: 4,
    donor: 'La Familia Williams',
    totalPledge: 2400,
    fulfilled: 400,
    frequency: 'Mensual',
    dateRange: 'Sep 2023 - Ago 2024',
  },
  {
    id: 5,
    donor: 'James Brown',
    totalPledge: 600,
    fulfilled: 500,
    frequency: 'Semanal',
    dateRange: 'Jul 2023 - Dic 2023',
  },
];

const getProgressColor = (progress: number) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 75) return 'bg-yellow-500';
    return 'bg-green-500';
};

export default function PledgeManagementPage() {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(pledgesData.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        }
    };

    const paginatedData = pledgesData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );


  return (
    <div className="flex flex-col flex-1">
    <AppHeader
      title="Gestión de Promesas"
      description="Rastree y gestione todas las promesas de los miembros y su estado de cumplimiento."
    >
      <Button>
        <Plus className="mr-2 h-4 w-4" /> Registrar Nueva Promesa
      </Button>
    </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8 bg-muted/20">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prometido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$125,750.00</div>
            <p className="text-xs text-muted-foreground">Todas las campañas activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">82%</div>
            <p className="text-xs text-green-600">+3.1% del mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promesas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$22,635.00</div>
            <p className="text-xs text-muted-foreground">En 18 promesas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por donante..." className="pl-9" />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Select>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Estado: Todos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="on-track">En curso</SelectItem>
                        <SelectItem value="behind">Atrasado</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                </Select>
                 <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Ordenar por: Fecha de finalización" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="end-date">Fecha de finalización</SelectItem>
                        <SelectItem value="donor-name">Nombre del donante</SelectItem>
                        <SelectItem value="progress">Progreso</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="w-auto px-2 sm:px-0 sm:w-auto">
                    <Download className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><Checkbox /></TableHead>
                  <TableHead>DONANTE</TableHead>
                  <TableHead>PROMESA TOTAL</TableHead>
                  <TableHead className="hidden sm:table-cell">CUMPLIDO</TableHead>
                  <TableHead>PROGRESO</TableHead>
                  <TableHead className="hidden md:table-cell">FRECUENCIA</TableHead>
                  <TableHead className="hidden md:table-cell">RANGO DE FECHAS</TableHead>
                  <TableHead className="text-right">DETALLES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((pledge) => {
                  const progress = (pledge.fulfilled / pledge.totalPledge) * 100;
                  return (
                    <TableRow key={pledge.id}>
                      <TableCell><Checkbox /></TableCell>
                      <TableCell className="font-medium">
                        {pledge.donor}
                        <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                          Cumplido: ${pledge.fulfilled.toFixed(2)} · {pledge.frequency} · {pledge.dateRange}
                        </div>
                      </TableCell>
                      <TableCell>${pledge.totalPledge.toFixed(2)}</TableCell>
                      <TableCell className="hidden sm:table-cell">${pledge.fulfilled.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-24 [&>div]:bg-green-500" indicatorClassName={getProgressColor(progress)} />
                            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{pledge.frequency}</TableCell>
                      <TableCell className="hidden md:table-cell">{pledge.dateRange}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" asChild>
                            <Link href="#">Detalles</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                <div className="text-sm text-muted-foreground">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, pledgesData.length)} de {pledgesData.length} resultados
                </div>
                <Pagination>
                    <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i} className="hidden sm:block">
                        <PaginationLink href="#" isActive={i + 1 === currentPage} onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}>
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
        </CardContent>
      </Card>
    </main>
    </div>
  );
}
