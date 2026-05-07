
'use client';

import * as React from 'react';
import {
  FileText,
  Search,
  Download,
} from 'lucide-react';
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
import { volunteersData } from '@/lib/data';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AppHeader } from '@/components/app-header';

type AutoTable = {
    autoTable: (options: any) => void;
};


export default function VolunteerReportsPage() {
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;
  
    const totalPages = Math.ceil(volunteersData.length / itemsPerPage);
  
    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    };
  
    const paginatedData = volunteersData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const generatePDF = () => {
        const doc = new jsPDF() as jsPDF & AutoTable;
        doc.text('Reporte de Voluntarios', 14, 20);
        doc.autoTable({
            head: [['Nombre', 'Email', 'Teléfono', 'Rol', 'Horas Servidas']],
            body: volunteersData.map(v => [v.name, v.email, v.phone, v.role, v.hoursServed]),
            startY: 30,
        });
        doc.save('reporte_voluntarios.pdf');
    };

  return (
    <div className="flex flex-col flex-1">
      <AppHeader
        title="Reportes de Voluntarios"
        description="Vea y exporte información sobre los voluntarios."
      >
        <div/>
      </AppHeader>
    <main className="flex-1 space-y-6 p-4 sm:p-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por voluntario o rol..." className="pl-9" />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
                <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filtrar por Rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Roles</SelectItem>
                        <SelectItem value="leader">Líder de Grupo de Jóvenes</SelectItem>
                        <SelectItem value="tech">Técnico de AV</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <Button onClick={generatePDF} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Exportar a PDF
              </Button>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden md:table-cell">Rol Principal</TableHead>
                    <TableHead className="hidden md:table-cell">Verificación de Antecedentes</TableHead>
                    <TableHead className="text-right">Horas Servidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((volunteer) => (
                    <TableRow key={volunteer.id}>
                      <TableCell>
                        <div className="font-medium">{volunteer.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {volunteer.email} · {volunteer.phone}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 md:hidden">
                          <Badge variant="outline">{volunteer.role}</Badge>
                          <Badge
                            variant={volunteer.backgroundCheck === 'Aprobado' ? 'default' : 'destructive'}
                            className={
                              volunteer.backgroundCheck === 'Aprobado'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {volunteer.backgroundCheck}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{volunteer.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{volunteer.phone}</TableCell>
                      <TableCell className="hidden md:table-cell">{volunteer.role}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={volunteer.backgroundCheck === 'Aprobado' ? 'default' : 'destructive'} className={volunteer.backgroundCheck === 'Aprobado' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                            {volunteer.backgroundCheck}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {volunteer.hoursServed}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             <div className="flex flex-col sm:flex-row items-center justify-between pt-4 px-4 gap-4">
                <div className="text-sm text-muted-foreground">
                    Mostrando {paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, volunteersData.length)} de {volunteersData.length} resultados
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
