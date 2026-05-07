
'use client';

import * as React from 'react';
import {
  Search,
  Edit,
  ArrowRightLeft,
  FileText,
  Plus,
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
} from '@/components/ui/card';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { volunteerAssignments } from '@/lib/data';
import { Label } from '@/components/ui/label';
import { AppHeader } from '@/components/app-header';

type Assignment = typeof volunteerAssignments[0];

const statusColors: { [key: string]: string } = {
  Confirmed: 'bg-green-100 text-green-800 border-green-200',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Completed: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function VolunteerAssignmentsPage() {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(volunteerAssignments.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        }
    };

    const paginatedData = volunteerAssignments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Asignaciones de Voluntarios"
        description="Gestione y rastree todos los roles y horarios de los voluntarios."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Exportar Lista</Button>
            <Button><Plus className="mr-2 h-4 w-4"/> Asignar Voluntario</Button>
        </div>
      </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8">
      <Card>
        <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                    <Label htmlFor="search-volunteer">Buscar por Nombre</Label>
                    <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="search-volunteer" placeholder="Buscar voluntario..." className="pl-9" />
                    </div>
                </div>
                 <div className="flex-1 w-full">
                    <Label htmlFor="ministry-filter">Ministerio</Label>
                    <Select>
                        <SelectTrigger id="ministry-filter" className="mt-1">
                            <SelectValue placeholder="Todos los Ministerios" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Ministerios</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex-1 w-full">
                    <Label htmlFor="event-filter">Evento/Servicio</Label>
                    <Select>
                        <SelectTrigger id="event-filter" className="mt-1">
                            <SelectValue placeholder="Todos los Eventos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Eventos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex-1 w-full">
                    <Label htmlFor="status-filter">Estado</Label>
                    <Select>
                        <SelectTrigger id="status-filter" className="mt-1">
                            <SelectValue placeholder="Todos los Estados" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Estados</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VOLUNTARIO</TableHead>
                <TableHead>TAREA / EVENTO</TableHead>
                <TableHead className="hidden sm:table-cell">FECHA</TableHead>
                <TableHead className="hidden sm:table-cell">ESTADO</TableHead>
                <TableHead className="text-right">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                        <AvatarImage
                            src={assignment.volunteerAvatarUrl}
                            alt={assignment.volunteerName}
                        />
                        <AvatarFallback>
                            {assignment.volunteerName.charAt(0)}
                        </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{assignment.volunteerName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{assignment.task}</div>
                    <div className="text-sm text-muted-foreground">{assignment.event}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
                      <span>{assignment.date}</span>
                      <Badge
                        variant="outline"
                        className={statusColors[assignment.status as keyof typeof statusColors]}
                      >
                        {assignment.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{assignment.date}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={statusColors[assignment.status as keyof typeof statusColors]}
                    >
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
                <div className="text-sm text-muted-foreground">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, volunteerAssignments.length)} de {volunteerAssignments.length} asignaciones
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
